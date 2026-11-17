import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
  createSignInClient: vi.fn(),
  cookieSet: vi.fn(),
  headers: new Headers(),
}));

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ set: m.cookieSet }),
  headers: async () => m.headers,
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSignInClient: (ip: string | null) => {
    m.createSignInClient(ip);
    return { auth: { signInWithPassword: m.signInWithPassword } };
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { setSession: m.setSession, signOut: m.signOut },
  }),
}));

import { signInAction, signOutAction } from './actions';

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const good = {
  email: ' Ana@Firm.test ',
  password: 'pw',
  tz: 'America/Chicago',
};
const authError = (status: number, code: string) =>
  Object.assign(new Error(code), { name: 'AuthApiError', status, code });

beforeEach(() => {
  vi.clearAllMocks();
  m.headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
  m.setSession.mockResolvedValue({ error: null });
  m.signOut.mockResolvedValue({ error: null });
});

describe('signInAction', () => {
  it('returns every field error at once and never calls Supabase', async () => {
    const r = await signInAction(null, form({ email: 'nope', password: '' }));
    expect(r).toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        fieldErrors: {
          email: 'Enter a valid email address.',
          password: 'Enter your password.',
        },
      },
    });
    expect(m.signInWithPassword).not.toHaveBeenCalled();
  });

  it('maps wrong credentials to the exact copy', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(400, 'invalid_credentials'),
    });
    expect(await signInAction(null, form(good))).toEqual({
      ok: false,
      error: {
        code: 'invalid_credentials',
        message: 'Email or password is incorrect.',
      },
    });
  });

  it('maps a 429 to rate_limited with retryAfter and minutes', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(429, 'over_request_rate_limit'),
    });
    expect(await signInAction(null, form(good))).toEqual({
      ok: false,
      error: {
        code: 'rate_limited',
        message: 'Too many attempts. Try again in 5 minutes.',
        retryAfter: 300,
      },
    });
  });

  it('maps anything else to server', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(500, 'unexpected_failure'),
    });
    const r = await signInAction(null, form(good));
    expect(r).toMatchObject({ ok: false, error: { code: 'server' } });
  });

  it('forwards the rightmost x-forwarded-for entry and sends the normalised email', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(400, 'invalid_credentials'),
    });
    await signInAction(null, form(good));
    expect(m.createSignInClient).toHaveBeenCalledWith('10.0.0.1');
    expect(m.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@firm.test',
      password: 'pw',
    });
  });

  it.each(['999.1.1.1', 'not-an-ip', '', '1.2.3.4:80'])(
    'does not forward x-forwarded-for=%j (not an IP)',
    async (xff) => {
      m.headers = new Headers({ 'x-forwarded-for': xff });
      m.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: authError(400, 'invalid_credentials'),
      });
      await signInAction(null, form(good));
      expect(m.createSignInClient).toHaveBeenCalledWith(null);
    },
  );

  it('prefers x-vercel-forwarded-for over a spoofed x-forwarded-for', async () => {
    m.headers = new Headers({
      'x-vercel-forwarded-for': '198.51.100.7',
      'x-forwarded-for': '1.1.1.1, 198.51.100.7',
    });
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(400, 'invalid_credentials'),
    });
    await signInAction(null, form(good));
    expect(m.createSignInClient).toHaveBeenCalledWith('198.51.100.7');
  });

  it('ignores spoofed leading x-forwarded-for entries', async () => {
    m.headers = new Headers({
      'x-forwarded-for': '9.9.9.9, 8.8.8.8, 203.0.113.5',
    });
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(400, 'invalid_credentials'),
    });
    await signInAction(null, form(good));
    expect(m.createSignInClient).toHaveBeenCalledWith('203.0.113.5');
  });

  it('falls back to x-forwarded-for when x-vercel-forwarded-for is not an IP', async () => {
    m.headers = new Headers({
      'x-vercel-forwarded-for': 'garbage',
      'x-forwarded-for': '203.0.113.5',
    });
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(400, 'invalid_credentials'),
    });
    await signInAction(null, form(good));
    expect(m.createSignInClient).toHaveBeenCalledWith('203.0.113.5');
  });

  it('forwards an IPv6 address', async () => {
    m.headers = new Headers({ 'x-forwarded-for': '2001:db8::1' });
    m.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: authError(400, 'invalid_credentials'),
    });
    await signInAction(null, form(good));
    expect(m.createSignInClient).toHaveBeenCalledWith('2001:db8::1');
  });

  it('returns ok instead of redirecting when the browser will go back', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'a', refresh_token: 'r' } },
      error: null,
    });
    expect(
      await signInAction(null, form({ ...good, back: '1', next: '/x' })),
    ).toEqual({ ok: true, data: null });
    expect(m.setSession).toHaveBeenCalled();
  });

  it('sets the session and tz cookie, then redirects to a safe next', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'a', refresh_token: 'r' } },
      error: null,
    });
    await expect(
      signInAction(null, form({ ...good, next: '/contacts?q=x' })),
    ).rejects.toThrow('REDIRECT /contacts?q=x');
    expect(m.setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
    });
    expect(m.cookieSet).toHaveBeenCalledWith('tz', 'America/Chicago', {
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
    });
  });

  it.each(['//evil.com', '/\\evil.com', 'https://x', ''])(
    'falls back to /contacts for next=%j',
    async (next) => {
      m.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'a', refresh_token: 'r' } },
        error: null,
      });
      await expect(signInAction(null, form({ ...good, next }))).rejects.toThrow(
        'REDIRECT /contacts',
      );
    },
  );

  it('stores UTC when tz is invalid', async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'a', refresh_token: 'r' } },
      error: null,
    });
    await expect(
      signInAction(null, form({ ...good, tz: 'Not/AZone' })),
    ).rejects.toThrow('REDIRECT');
    expect(m.cookieSet).toHaveBeenCalledWith('tz', 'UTC', expect.anything());
  });
});

describe('signOutAction', () => {
  it('clears this session only, then redirects to /login', async () => {
    await expect(signOutAction()).rejects.toThrow('REDIRECT /login');
    expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
