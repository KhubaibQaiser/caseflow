import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Plugin is already registered by eslint-config-next; only add its recommended rules.
  { rules: { ...jsxA11y.configs.recommended.rules } },
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    '.superpowers/**',
    '.impeccable/**',
    '.worktrees/**',
  ]),
]);

export default eslintConfig;
