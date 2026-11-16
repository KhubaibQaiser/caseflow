import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['**/*.test.{ts,tsx}'],
          exclude: [
            '**/node_modules/**',
            'tests/integration/**',
            'tests/e2e/**',
            '.next/**',
            '.worktrees/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
