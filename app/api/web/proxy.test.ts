import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyToPlutus, upstreamUrl } from './proxy';

const BASE = 'https://plutus-ai.example';

test('upstreamUrl keeps requests under /api/web', () => {
  assert.equal(upstreamUrl(BASE, ['transactions'], '?q=ntuc')?.toString(), `${BASE}/api/web/transactions?q=ntuc`);
  assert.equal(upstreamUrl(BASE, ['admin', 'users'], '')?.toString(), `${BASE}/api/web/admin/users`);
  assert.equal(upstreamUrl(BASE, ['..', 'apple-pay'], ''), null);
  assert.equal(upstreamUrl(BASE, ['%2e%2e'], ''), null);
  assert.equal(upstreamUrl(BASE, [], ''), null);
});

test('proxyToPlutus forwards method, body and auth, and nothing else', async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const fakeFetch = (async (url: URL, init: RequestInit) => {
    seen = { url: url.toString(), init };
    return Response.json({ token: 't' }, { status: 200 });
  }) as unknown as typeof fetch;

  const request = new Request('https://web.example/api/web/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer x', cookie: 'secret=1' },
    body: '{"initData":"abc"}',
  });
  const res = await proxyToPlutus(request, ['session'], BASE, fakeFetch);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { token: 't' });
  assert.equal(seen?.url, `${BASE}/api/web/session`);
  assert.equal(seen?.init.method, 'POST');
  assert.equal(seen?.init.body, '{"initData":"abc"}');
  const headers = seen?.init.headers as Headers;
  assert.equal(headers.get('authorization'), 'Bearer x');
  assert.equal(headers.get('cookie'), null);
});

test('proxyToPlutus refuses to run unconfigured and reports an unreachable upstream', async () => {
  const request = new Request('https://web.example/api/web/me');
  assert.equal((await proxyToPlutus(request, ['me'], undefined)).status, 503);
  const failing = (async () => {
    throw new Error('ECONNREFUSED');
  }) as unknown as typeof fetch;
  assert.equal((await proxyToPlutus(request, ['me'], BASE, failing)).status, 502);
});
