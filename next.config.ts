import type { NextConfig } from 'next';

const production = process.env.VERCEL_ENV === 'production';

// Static headers for every route. The CSP is per-request and lives in proxy.ts.
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(production
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: '/:path*', headers: securityHeaders }],
  // AGENTS.md is hand-written; stop `next dev` from injecting its managed block.
  agentRules: false,
  // Enables forbidden() and forbidden.tsx (experimental in 16.4).
  // Action payloads are a note (2,000 characters) or a contact form, so well under 1mb; the cap is explicit, not the default.
  experimental: {
    authInterrupts: true,
    serverActions: { bodySizeLimit: '1mb' },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
