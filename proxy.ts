import { createServerClient } from '@supabase/ssr';
import { authEnforced, supabaseEnv } from '@/lib/env';
import { sessionCookieOptions } from '@/lib/supabase/cookie-options';
import { buildCsp, createNonce } from '@/lib/security/csp';
import { NextResponse, type NextRequest } from 'next/server';

// Every response path gets the CSP; Next reads the nonce back from the request header.
export async function proxy(request: NextRequest) {
  const csp = buildCsp(createNonce(), {
    dev: process.env.NODE_ENV === 'development',
    production: process.env.VERCEL_ENV === 'production',
  });
  request.headers.set('Content-Security-Policy', csp);
  const response = await route(request);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

// Logged in or not, nothing more. Authorization lives in getViewer and Postgres RLS.
async function route(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const here = (path: string) => new URL(path, request.url);

  if (
    (pathname === '/dev' || pathname.startsWith('/dev/')) &&
    process.env.VERCEL_ENV === 'production'
  )
    return NextResponse.rewrite(here('/__not-found'), { request, status: 404 });

  // Until T22 nothing in the app signs in, so enforcing would lock everyone out.
  if (!authEnforced()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  let authHeaders: Record<string, string> = {};
  const { url: apiUrl, key } = supabaseEnv();
  const supabase = createServerClient(apiUrl, key, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        authHeaders = { ...authHeaders, ...headers };
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(authHeaders).forEach(([k, v]) =>
          response.headers.set(k, v),
        );
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  // Carry refreshed or cleared auth cookies onto the redirect.
  const redirectTo = (url: URL) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    Object.entries(authHeaders).forEach(([k, v]) => r.headers.set(k, v));
    return r;
  };

  if (pathname === '/login')
    return signedIn ? redirectTo(here('/contacts')) : response;
  if (signedIn) return response;
  // A dead session mid-save: a redirect would fail the action's fetch. Every action
  // checks its own permission, so let it through to return `unauthorized` (the form then goes to /login).
  // POST only: a GET with the header must not skip sign-in.
  if (request.method === 'POST' && request.headers.has('next-action'))
    return response;

  const url = here('/login');
  url.searchParams.set('next', pathname + search);
  if (request.cookies.getAll().some((c) => c.name.startsWith('sb-')))
    url.searchParams.set('reason', 'expired');
  return redirectTo(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
