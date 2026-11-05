import { Router, type Request } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { projectSchema, type Project } from '../src/shared/model.js';

const SHARE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 512 * 1024;
const idSchema = z.string().regex(/^[a-f0-9]{40}$/);
const recordSchema = z.object({
  id: idSchema, version: z.number().int().positive(), expiresAt: z.number().int().positive(),
  writeHash: z.string().regex(/^[a-f0-9]{64}$/), project: projectSchema,
}).strict();
export type ShareRecord = z.infer<typeof recordSchema>;
export type StoredShare = { record: ShareRecord; etag: string };
export interface ShareStore {
  read(id: string): Promise<StoredShare | null>;
  create(record: ShareRecord): Promise<void>;
  replace(record: ShareRecord, expectedEtag: string): Promise<void>;
  remove(id: string, expectedEtag: string): Promise<void>;
}
export class ShareConflict extends Error {}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const serialize = (record: ShareRecord) => JSON.stringify(recordSchema.parse(record));

/** Single-host development storage. Atomic rename plus an exclusive lock protects concurrent requests. */
export class LocalShareStore implements ShareStore {
  constructor(private directory = path.resolve('.wonderbox-shares')) {}
  private file(id: string) { return path.join(this.directory, `${idSchema.parse(id)}.json`); }
  async read(id: string): Promise<StoredShare | null> {
    try { const data = await fs.readFile(this.file(id), 'utf8'); return {record: recordSchema.parse(JSON.parse(data)), etag: hash(data)}; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  async create(record: ShareRecord) {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    await fs.writeFile(this.file(record.id), serialize(record), { flag: 'wx', mode: 0o600 });
  }
  private async change(id: string, expectedEtag: string, record?: ShareRecord) {
    const file = this.file(id); let lock;
    try { lock = await fs.open(`${file}.lock`, 'wx', 0o600); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ShareConflict('Another update is already being saved. Try again.'); throw error; }
    let temporary: string | undefined;
    try {
      const current = await this.read(id);
      if (!current || current.etag !== expectedEtag) throw new ShareConflict('This shared version changed. Reopen sharing before sending again.');
      if (record) {
        temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`;
        await fs.writeFile(temporary, serialize(record), {flag:'wx',mode:0o600});
        await fs.rename(temporary, file);
      } else await fs.unlink(file);
    } finally {
      if (temporary) await fs.unlink(temporary).catch(() => {});
      await lock.close(); await fs.unlink(`${file}.lock`).catch(() => {});
    }
  }
  replace(record: ShareRecord, etag: string) { return this.change(record.id, etag, record); }
  remove(id: string, etag: string) { return this.change(id, etag); }
}

/** Private Blob reads bypass cache; conditional ETag writes enforce CAS across serverless instances. */
export class BlobShareStore implements ShareStore {
  private key(id: string) { return `wonderbox-shares/${idSchema.parse(id)}.json`; }
  private options() { return { token: process.env.BLOB_READ_WRITE_TOKEN, abortSignal: AbortSignal.timeout(12_000) }; }
  async read(id: string): Promise<StoredShare | null> {
    const { get } = await import('@vercel/blob');
    // Compressed transfers expose weak HTTP ETags; identity keeps the storage ETag and body atomic for If-Match.
    const result = await get(this.key(id), { ...this.options(), access: 'private', useCache: false, headers: { 'accept-encoding': 'identity' } });
    if (!result?.stream) return null;
    const record = recordSchema.parse(await new Response(result.stream).json());
    return { record, etag: result.blob.etag };
  }
  async create(record: ShareRecord) {
    const { put } = await import('@vercel/blob');
    await put(this.key(record.id), serialize(record), { ...this.options(), access: 'private', addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
  }
  async replace(record: ShareRecord, expectedEtag: string) {
    if (!expectedEtag || expectedEtag.startsWith('W/')) throw new ShareConflict('Storage returned an unreadable version marker. Try sending again.');
    const { put, BlobPreconditionFailedError } = await import('@vercel/blob');
    try { await put(this.key(record.id), serialize(record), { ...this.options(), access: 'private', addRandomSuffix: false, allowOverwrite: true, ifMatch: expectedEtag, contentType: 'application/json', cacheControlMaxAge: 60 }); }
    catch (error) { if (error instanceof BlobPreconditionFailedError) throw new ShareConflict('This shared version changed. Reopen sharing before sending again.'); throw error; }
  }
  async remove(id: string, expectedEtag: string) {
    if (!expectedEtag || expectedEtag.startsWith('W/')) throw new ShareConflict('Storage returned an unreadable version marker. Try again.');
    const { del, BlobPreconditionFailedError } = await import('@vercel/blob');
    try { await del(this.key(id), { ...this.options(), ifMatch: expectedEtag }); }
    catch (error) { if (error instanceof BlobPreconditionFailedError) throw new ShareConflict('This shared version changed. Try again.'); throw error; }
  }
}
function defaultStore(): ShareStore {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return new BlobShareStore();
  if (!process.env.VERCEL) return new LocalShareStore(process.env.SHARE_DIRECTORY);
  const unavailable = async (): Promise<never> => { throw new Error('Sharing storage is not configured.'); };
  return {read:unavailable,create:unavailable,replace:unavailable,remove:unavailable};
}
const projectBody = z.object({ project: projectSchema }).strict();
const updateBody = projectBody.extend({ expectedVersion: z.number().int().positive() });
function boundProject(project: Project) {
  if (Buffer.byteLength(JSON.stringify(project)) > MAX_BYTES) throw new RangeError('This level is too large to share. Export it as JSON instead (sharing limit 512 KB).');
}
function isOwner(req: Request, record: ShareRecord) {
  const bearer = req.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!bearer) return false;
  return timingSafeEqual(Buffer.from(hash(bearer), 'hex'), Buffer.from(record.writeHash, 'hex'));
}
function metadata(record: ShareRecord) {
  return { id: record.id, version: record.version, projectRevision: record.project.revision, name: record.project.name, expiresAt: record.expiresAt };
}
export function createShareRouter(options: { store?: ShareStore; now?: () => number; rateLimit?: boolean } = {}) {
  const router = Router(), store = options.store ?? defaultStore(), now = options.now ?? Date.now;
  const buckets = new Map<string, { count: number; until: number }>();
  let active = 0;
  router.use((_req, res, next) => { res.set('Cache-Control','no-store'); res.set('X-Robots-Tag','noindex, nofollow'); next(); });
  router.use((req, res, next) => {
    if (active >= 12) { res.status(429).json({error:'Sharing is busy. Try again shortly.'}); return; }
    if (req.method !== 'GET' && options.rateLimit !== false) {
      const key = req.ip || 'local'; const current = now();
      for (const [ip, bucket] of buckets) if (bucket.until < current) buckets.delete(ip);
      if (buckets.size >= 500 && !buckets.has(key)) { res.status(429).json({error:'Sharing is busy. Try again later.'}); return; }
      const bucket = buckets.get(key) ?? {count:0,until:current+10*60_000}; buckets.set(key,bucket);
      if (++bucket.count > 30) { res.status(429).json({error:'Too many sharing updates. Please wait a few minutes.'}); return; }
    }
    active++; let finished = false;
    const release = () => { if (!finished) { active--; finished = true; } };
    res.once('finish',release); res.once('close',release); next();
  });
  const wrap = (handler: (req: Request, res: import('express').Response) => Promise<void>) => async (req: Request, res: import('express').Response) => {
    try { await handler(req,res); }
    catch (error) {
      const invalid = error instanceof z.ZodError || error instanceof RangeError;
      res.status(error instanceof ShareConflict ? 409 : invalid ? 422 : 503).json({ error: error instanceof ShareConflict || error instanceof RangeError ? error.message : invalid ? 'This is not a valid Wonderbox level. Nothing was shared.' : 'Sharing is temporarily unavailable. Your editor project is unchanged. Try again shortly.' });
    }
  };
  router.post('/', wrap(async (req,res) => {
    const {project} = projectBody.parse(req.body); boundProject(project);
    const writeToken = randomBytes(32).toString('base64url');
    const record: ShareRecord = {id:randomBytes(20).toString('hex'),version:1,expiresAt:now()+SHARE_TTL,writeHash:hash(writeToken),project};
    await store.create(record); res.status(201).json({...metadata(record),writeToken});
  }));
  router.get('/:id', wrap(async (req,res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) {res.status(404).json({error:'This play link was not found.'});return;}
    const current = await store.read(id.data);
    if (!current || current.record.expiresAt <= now()) {
      if (current) await store.remove(id.data,current.etag).catch(()=>{});
      res.status(404).json({error:'This play link has expired or was revoked. Ask the creator for a new link.'});return;
    }
    res.json({...metadata(current.record),...(req.query.meta === '1' ? {} : {project:current.record.project})});
  }));
  router.put('/:id', wrap(async (req,res) => {
    const id = idSchema.parse(req.params.id); const {project,expectedVersion} = updateBody.parse(req.body); boundProject(project);
    const current = await store.read(id);
    if (!current || current.record.expiresAt <= now() || !isOwner(req,current.record)) {res.status(403).json({error:'This browser can no longer update that play link. Create a new link.'});return;}
    if (expectedVersion !== current.record.version) throw new ShareConflict('A newer version was already sent. Reopen sharing to refresh its version.');
    if (project.id !== current.record.project.id) {res.status(422).json({error:'This link belongs to another project. Create a new link for this level.'});return;}
    const next = {...current.record,project,version:current.record.version+1};
    await store.replace(next,current.etag); res.json(metadata(next));
  }));
  router.delete('/:id', wrap(async (req,res) => {
    const id = idSchema.parse(req.params.id), current = await store.read(id);
    if (!current || !isOwner(req,current.record)) {res.status(403).json({error:'This browser cannot revoke that play link.'});return;}
    await store.remove(id,current.etag); res.status(204).end();
  }));
  return router;
}
