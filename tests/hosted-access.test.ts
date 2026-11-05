import { it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { app } from '../server/index';
import { publicAiEnabled } from '../server/access';
it('protects hosted model requests, leaves direct capabilities available, and rejects other origins', async () => {
  const names = ['AI_ACCESS_CODE', 'AI_PUBLIC_UNTIL', 'VERCEL', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'ALLOWED_ORIGIN'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  delete process.env.AI_PUBLIC_UNTIL;
  Object.assign(process.env, { AI_ACCESS_CODE: 'test-only-code', VERCEL: '1', VERCEL_URL: 'test-instance.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'test-app.vercel.app', ALLOWED_ORIGIN: 'https://test-app.vercel.app' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (endpoint: string, headers: Record<string,string> = {}) => fetch(base+endpoint, { method: 'POST', headers: {'Content-Type':'application/json', ...headers}, body: '{}' });
  try {
    expect((await (await fetch(base+'/api/health')).json()).accessCodeRequired).toBe(true);
    expect((await request('/api/agent')).status).toBe(401);
    expect((await request('/api/agent', {'x-wonderbox-access-code':'test-only-code!'})).status).toBe(401);
    expect((await request('/api/agent', {'x-wonderbox-access-code':'test-only-code'})).status).toBe(400);
    expect((await request('/api/action', {origin:'https://test-app.vercel.app'})).status).toBe(422);
    expect((await request('/api/action', {origin:'https://test-instance.vercel.app'})).status).toBe(422);
    expect((await request('/api/action', {origin:'https://other.vercel.app'})).status).toBe(403);
    // A valid public window bypasses the code, not request/schema validation.
    process.env.AI_PUBLIC_UNTIL = new Date(Date.now()+60000).toISOString();
    expect(publicAiEnabled()).toBe(true);
    expect(publicAiEnabled(Date.parse(process.env.AI_PUBLIC_UNTIL))).toBe(false);
    expect((await (await fetch(base+'/api/health')).json()).accessCodeRequired).toBe(false);
    expect((await request('/api/agent')).status).toBe(400);
    expect((await request('/api/agent', {origin:'https://other.vercel.app'})).status).toBe(403);
    process.env.AI_PUBLIC_UNTIL = new Date(Date.now()-1).toISOString();
    expect(publicAiEnabled()).toBe(false);
    expect((await (await fetch(base+'/api/health')).json()).accessCodeRequired).toBe(true);
    expect((await request('/api/agent')).status).toBe(401);
    for (const value of ['invalid', '2099-01-01', '']) {process.env.AI_PUBLIC_UNTIL=value;expect(publicAiEnabled()).toBe(false);expect((await request('/api/agent')).status).toBe(401);}
    delete process.env.AI_ACCESS_CODE;
    expect((await request('/api/agent')).status).toBe(503);
  } finally {
    for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
    await new Promise<void>((resolve,reject)=>server.close(error => error ? reject(error) : resolve()));
  }
});
