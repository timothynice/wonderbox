import express from 'express';
import { afterEach, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createShareRouter, LocalShareStore, BlobShareStore, ShareConflict, type ShareRecord, type ShareStore, type StoredShare } from '../server/sharing.js';
import { createStarterProject } from '../src/shared/starter.js';
class MemoryStore implements ShareStore {
  records=new Map<string,StoredShare>();
  async read(id:string){return structuredClone(this.records.get(id)??null);}
  async create(record:ShareRecord){this.records.set(record.id,{record:structuredClone(record),etag:'1'});}
  async replace(record:ShareRecord,expected:string){const current=this.records.get(record.id);if(current?.etag!==expected)throw new ShareConflict('Concurrent change');this.records.set(record.id,{record:structuredClone(record),etag:String(Number(expected)+1)});}
  async remove(id:string,expected:string){if(this.records.get(id)?.etag!==expected)throw new ShareConflict('Concurrent change');this.records.delete(id);}
}
const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{for(const cleanup of cleanups.splice(0))await cleanup();});
async function server(store:ShareStore,now=()=>Date.now(),rateLimit=false){
  const app=express();app.use(express.json({limit:'2mb'}));app.use('/api/share',createShareRouter({store,now,rateLimit}));
  const listener=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>listener.once('listening',resolve));
  cleanups.push(()=>new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve())));
  const base=`http://127.0.0.1:${(listener.address() as AddressInfo).port}/api/share`;
  const request=(method:string,suffix='',body?:unknown,token?:string)=>fetch(base+suffix,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {base,request};
}
it('shares authored snapshots with read-only public access, owner-only versioned updates, rollback and revoke',async()=>{
  const store=new MemoryStore(),{base,request}=await server(store),project=createStarterProject();
  const created=await request('POST','',{project});expect(created.status).toBe(201);const owner=await created.json();expect(owner.id).toMatch(/^[a-f0-9]{40}$/);expect(owner.writeToken).toHaveLength(43);
  const current=await (await fetch(base+'/'+owner.id)).json();expect(current.project).toEqual(project);expect(current.writeToken).toBeUndefined();expect(current.writeHash).toBeUndefined();
  const meta=await (await fetch(base+'/'+owner.id+'?meta=1')).json();expect(meta.project).toBeUndefined();expect(meta.version).toBe(1);
  const edited=structuredClone(project);edited.revision++;edited.world.atmosphere='moonlight';
  expect((await request('PUT','/'+owner.id,{project:edited,expectedVersion:1})).status).toBe(403);
  expect((await request('PUT','/'+owner.id,{project:edited,expectedVersion:1},'x'.repeat(43))).status).toBe(403);
  expect((await request('PUT','/'+owner.id,{project:{...edited,version:99},expectedVersion:1},owner.writeToken)).status).toBe(422);
  expect((await request('PUT','/'+owner.id,{project:{...edited,id:'other-project'},expectedVersion:1},owner.writeToken)).status).toBe(422);
  const updated=await request('PUT','/'+owner.id,{project:edited,expectedVersion:1},owner.writeToken);expect(updated.status).toBe(200);expect((await updated.json()).version).toBe(2);
  expect((await request('PUT','/'+owner.id,{project,expectedVersion:1},owner.writeToken)).status).toBe(409);
  expect((await (await fetch(base+'/'+owner.id)).json()).project).toEqual(edited);
  expect((await request('DELETE','/'+owner.id)).status).toBe(403);expect((await request('DELETE','/'+owner.id,undefined,owner.writeToken)).status).toBe(204);
  expect((await fetch(base+'/'+owner.id)).status).toBe(404);
});
it('local store survives new instances and concurrent sends commit exactly once',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'wonderbox-sharing-'));cleanups.push(()=>rm(directory,{recursive:true,force:true}));
  const store=new LocalShareStore(directory),{request}=await server(store),project=createStarterProject();
  const owner=await (await request('POST','',{project})).json();
  const reloaded=new LocalShareStore(directory);expect((await reloaded.read(owner.id))?.record.project).toEqual(project);
  const outcomes=await Promise.all([1,2].map(index=>request('PUT','/'+owner.id,{project:{...project,name:'Candidate '+index},expectedVersion:1},owner.writeToken)));
  expect(outcomes.map(result=>result.status).sort()).toEqual([200,409]);expect((await reloaded.read(owner.id))?.record.version).toBe(2);
});
it('expiry prevents reads and sends, and provider/storage details never escape failures',async()=>{
  let time=1000;const store=new MemoryStore(),{base,request}=await server(store,()=>time),project=createStarterProject();
  const owner=await (await request('POST','',{project})).json();time=owner.expiresAt+1;
  expect((await fetch(base+'/'+owner.id)).status).toBe(404);expect(await store.read(owner.id)).toBeNull();expect((await request('PUT','/'+owner.id,{project,expectedVersion:1},owner.writeToken)).status).toBe(403);
  store.read=async()=>{throw Error('private storage token must never leak');};const failure=await fetch(base+'/'+owner.id);expect(failure.status).toBe(503);expect(await failure.text()).not.toContain('private storage token');
});
it('strict project validation excludes runtime fields and anonymous creation is bounded per process',async()=>{
  const {request}=await server(new MemoryStore(),undefined,true),project=createStarterProject();
  expect((await request('POST','',{project:{...project,runtime:{stars:['consumed']}}})).status).toBe(422);
  for(let index=0;index<29;index++)expect((await request('POST','',{project})).status).toBe(201);
  expect((await request('POST','',{project})).status).toBe(429);
});

vi.mock('@vercel/blob',()=>({get:vi.fn(),put:vi.fn(),del:vi.fn(),BlobPreconditionFailedError:class extends Error{}}));
it('Blob CAS requests identity transfer and uses the exact strong ETag without weakening concurrency',async()=>{
  const sdk=await import('@vercel/blob');const project=createStarterProject();
  const record:ShareRecord={id:'a'.repeat(40),version:1,expiresAt:Date.now()+1000,writeHash:'b'.repeat(64),project};
  const response=(etag:string)=>({stream:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify(record)));controller.close();}}),blob:{etag}} as any);
  vi.mocked(sdk.get).mockResolvedValueOnce(response('"strong-storage-version"'));
  const store=new BlobShareStore(),loaded=await store.read(record.id);expect(loaded?.etag).toBe('"strong-storage-version"');
  expect(sdk.get).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({access:'private',useCache:false,headers:{'accept-encoding':'identity'}}));
  await store.replace({...record,version:2},loaded!.etag);
  expect(sdk.put).toHaveBeenCalledWith(expect.any(String),expect.any(String),expect.objectContaining({ifMatch:'"strong-storage-version"',allowOverwrite:true}));
  vi.mocked(sdk.put).mockClear();vi.mocked(sdk.get).mockResolvedValueOnce(response('W/"weak-transfer-version"'));
  const weak=await store.read(record.id);await expect(store.replace(record,weak!.etag)).rejects.toBeInstanceOf(ShareConflict);expect(sdk.put).not.toHaveBeenCalled();
  await expect(store.remove(record.id,weak!.etag)).rejects.toBeInstanceOf(ShareConflict);expect(sdk.del).not.toHaveBeenCalled();
});
