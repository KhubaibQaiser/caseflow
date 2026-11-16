import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // AGENTS.md is hand-written; stop `next dev` from injecting its managed block.
  agentRules: false,
  // Enables forbidden() and forbidden.tsx (experimental in 16.4).
  experimental: { authInterrupts: true },
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
