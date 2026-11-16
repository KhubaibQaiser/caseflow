import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Logged in or not, nothing more. Authorization lives in getViewer and Postgres RLS.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const here = (path: string) => new URL(path, request.url);

  if (pathname.startsWith('/dev') && process.env.VERCEL_ENV === 'production')
    return NextResponse.rewrite(here('/__not-found'), { status: 404 });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  // Carry refreshed or cleared auth cookies onto the redirect.
  const redirectTo = (url: URL) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (pathname === '/login')
    return signedIn ? redirectTo(here('/contacts')) : response;
  if (signedIn) return response;

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
