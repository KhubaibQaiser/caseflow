// No browser Supabase client exists, so session cookies can be HttpOnly.
export const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.VERCEL_ENV === 'production',
});
