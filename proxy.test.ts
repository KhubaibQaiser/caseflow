import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type SetAll = (
  c: { name: string; value: string; options: object }[],
  headers: Record<string, string>,
) => void;
let claims: { sub: string } | null = null;
let refresh = false;
vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: { setAll: SetAll }; cookieOptions?: object },
  ) => ({
    auth: {
      getClaims: async () => {
        // A refresh (or a clear) hands back cookies plus cache headers.
        if (refresh)
          opts.cookies.setAll(
            [
              {
                name: 'sb-x-auth-token',
                value: 'fresh',
                // @supabase/ssr merges cookieOptions into every cookie it sets.
                options: { ...opts.cookieOptions },
              },
            ],
            { 'Cache-Control': 'private, no-store' },
          );
        return { data: claims ? { claims } : null };
      },
    },
  }),
}));

import { proxy } from './proxy';

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
const loc = (r: Response) => r.headers.get('location');

beforeEach(() => {
  claims = null;
  refresh = false;
  vi.unstubAllEnvs();
  vi.stubEnv('AUTH_ENFORCED', 'true');
  vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-key');
});

describe('session cookie attributes', () => {
  const setCookie = async () => {
    claims = { sub: 'u1' };
    refresh = true;
    return (await proxy(req('/contacts'))).headers.get('set-cookie') ?? '';
  };

  it('are HttpOnly and SameSite=Lax, not Secure outside production', async () => {
    const c = await setCookie();
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=lax/i);
    expect(c).not.toMatch(/Secure/i);
  });

  it('are Secure in production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(await setCookie()).toMatch(/Secure/i);
  });
});

describe('proxy', () => {
  it('redirects anonymous requests to /login with next', async () => {
    const r = await proxy(req('/contacts?q=ana'));
    expect(loc(r)).toBe(
      'http://localhost:3000/login?next=%2Fcontacts%3Fq%3Dana',
    );
  });

  it('adds reason=expired when an sb- cookie exists but the session is dead', async () => {
    const r = await proxy(req('/pipeline', 'sb-x-auth-token=stale'));
    expect(loc(r)).toBe(
      'http://localhost:3000/login?next=%2Fpipeline&reason=expired',
    );
  });

  it('lets an anonymous Server Action through so it can answer unauthorized', async () => {
    const r = await proxy(
      new NextRequest('http://localhost:3000/contacts/new', {
        method: 'POST',
        headers: { 'next-action': 'abc', cookie: 'sb-x-auth-token=dead' },
      }),
    );
    expect(r.status).toBe(200);
    expect(loc(r)).toBeNull();
  });

  it('lets anonymous users reach /login', async () => {
    const r = await proxy(req('/login'));
    expect(loc(r)).toBeNull();
  });

  it('sends a signed-in user from /login to /contacts', async () => {
    claims = { sub: 'u1' };
    expect(loc(await proxy(req('/login')))).toBe(
      'http://localhost:3000/contacts',
    );
  });

  it('passes a signed-in user through', async () => {
    claims = { sub: 'u1' };
    expect(loc(await proxy(req('/contacts')))).toBeNull();
  });

  it('404s /dev/* on Vercel production only', async () => {
    claims = { sub: 'u1' };
    vi.stubEnv('VERCEL_ENV', 'production');
    expect((await proxy(req('/dev/components'))).status).toBe(404);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect((await proxy(req('/dev/components'))).status).toBe(200);
  });

  it('matches /dev exactly, not /devices', async () => {
    claims = { sub: 'u1' };
    vi.stubEnv('VERCEL_ENV', 'production');
    expect((await proxy(req('/dev'))).status).toBe(404);
    expect((await proxy(req('/devices'))).status).toBe(200);
  });

  it('passes refreshed cookies and no-store onto the response', async () => {
    claims = { sub: 'u1' };
    refresh = true;
    const r = await proxy(req('/contacts'));
    expect(r.cookies.get('sb-x-auth-token')?.value).toBe('fresh');
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });

  it('carries cookies and no-store onto redirects', async () => {
    refresh = true;
    const r = await proxy(req('/contacts', 'sb-x-auth-token=stale'));
    expect(loc(r)).toContain('/login');
    expect(r.cookies.get('sb-x-auth-token')?.value).toBe('fresh');
    expect(r.headers.get('cache-control')).toBe('private, no-store');
  });

  it('only encodes next, even for //evil.com (T10 safeNext must reject it)', async () => {
    const r = await proxy(req('//evil.com'));
    expect(loc(r)).toBe('http://localhost:3000/login?next=%2F%2Fevil.com');
  });
});

describe('proxy with AUTH_ENFORCED off (until T22)', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_ENFORCED', '');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
  });

  it('passes anonymous requests through, even without Supabase env', async () => {
    const r = await proxy(req('/contacts'));
    expect(r.status).toBe(200);
    expect(loc(r)).toBeNull();
  });

  it('does not bounce a signed-in user away from /login', async () => {
    claims = { sub: 'u1' };
    expect(loc(await proxy(req('/login')))).toBeNull();
  });

  it('still 404s /dev/* in production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect((await proxy(req('/dev/components'))).status).toBe(404);
  });
});
