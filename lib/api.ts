/**
 * The browser's side of the session. The Mini App's signed initData is
 * traded for a short-lived bearer token (plutus-ai checks the signature; only
 * it has the bot token). The token is held in memory, not a cookie: on
 * Telegram Web the app runs in an iframe, where a cookie would be
 * third-party and may be blocked. When it expires, initData is traded again.
 */

import type { Session } from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return new ApiError(res.status, body?.message ?? `Request failed (${res.status})`);
}

async function createSession(initData: string): Promise<Session> {
  const res = await fetch('/api/web/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  if (!res.ok) {
    throw await readError(res);
  }
  return res.json();
}

export class ApiClient {
  private session: Promise<Session> | null = null;

  constructor(private readonly initData: string) {}

  /** Signs in (once, shared by concurrent callers) and returns the session. */
  signIn(): Promise<Session> {
    if (!this.session) {
      const attempt = createSession(this.initData);
      this.session = attempt;
      attempt.catch(() => {
        if (this.session === attempt) {
          this.session = null;
        }
      });
    }
    return this.session;
  }

  async get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        query.set(key, value);
      }
    }
    const search = query.toString();
    const url = `/api/web/${path}${search ? `?${search}` : ''}`;

    for (let attempt = 0; ; attempt++) {
      const { token } = await this.signIn();
      const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      if (res.ok) {
        return res.json();
      }
      // An expired token: sign in again with initData, once.
      if (res.status === 401 && attempt === 0) {
        this.session = null;
        continue;
      }
      throw await readError(res);
    }
  }
}
