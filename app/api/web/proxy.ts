/**
 * Forwards /api/web/* on this site to plutus-ai's /api/web/*, so the browser
 * only ever talks to its own origin (no CORS on plutus-ai) and plutus-ai's
 * URL stays a server-side setting.
 *
 * Only the path under /api/web, the query, the body, and the Authorization
 * and Content-Type headers are passed on. Path segments are restricted to
 * letters, digits, `_` and `-`, so an encoded `..` can't climb out of
 * /api/web to another plutus-ai route.
 */

const SEGMENT = /^[A-Za-z0-9_-]+$/;
const FORWARDED_REQUEST_HEADERS = ['authorization', 'content-type'];

export function upstreamUrl(baseUrl: string, segments: string[], search: string): URL | null {
  if (segments.length === 0 || !segments.every((segment) => SEGMENT.test(segment))) {
    return null;
  }
  const url = new URL(`/api/web/${segments.join('/')}`, baseUrl);
  url.search = search;
  return url;
}

function json(status: number, message: string): Response {
  return Response.json({ status: 'error', message }, { status });
}

export async function proxyToPlutus(
  request: Request,
  segments: string[],
  baseUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!baseUrl) {
    return json(503, 'PLUTUS_API_URL is not configured');
  }
  const url = upstreamUrl(baseUrl, segments, new URL(request.url).search);
  if (!url) {
    return json(404, 'Not found');
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetchImpl(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
    });
  } catch {
    return json(502, 'Plutus is unreachable');
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
}
