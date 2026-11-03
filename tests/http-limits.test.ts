import { it, expect } from 'vitest';
import type { AddressInfo } from 'node:net';
import { app } from '../server/index';
it('rejects malformed and oversized JSON before actions/provider calls with concise JSON errors', async () => {
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.on('listening',resolve));
  const url=`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/action`;
  try {
    for(const [body,status] of [['{',400],[JSON.stringify({padding:'x'.repeat(2*1024*1024)}),413]] as const) {
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});
      expect(response.status).toBe(status);expect(response.headers.get('content-type')).toContain('application/json');
      const result=await response.json();expect(Object.keys(result)).toEqual(['error']);expect(result.error).toContain('Nothing changed.');expect(result.error).not.toContain('node_modules');
    }
  } finally {await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
