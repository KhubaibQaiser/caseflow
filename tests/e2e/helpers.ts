import type { Page } from '@playwright/test';

export type Role = 'admin' | 'viewer';

const ACCOUNT: Record<Role, { email: string; passwordEnv: string }> = {
  admin: { email: 'admin@caseflow.test', passwordEnv: 'SEED_ADMIN_PASSWORD' },
  viewer: {
    email: 'viewer@caseflow.test',
    passwordEnv: 'SEED_VIEWER_PASSWORD',
  },
};

// Saved by global-setup. The default project runs as Admin; a spec opts in with
// `test.use({ storageState: storage.viewer })` or `storage.signedOut`.
export const storage = {
  admin: 'tests/e2e/.auth/admin.json',
  viewer: 'tests/e2e/.auth/viewer.json',
  signedOut: { cookies: [], origins: [] },
};

export function seedPassword(role: Role): string {
  const v = process.env[ACCOUNT[role].passwordEnv];
  if (!v) throw new Error(`e2e needs ${ACCOUNT[role].passwordEnv} (seeded)`);
  return v;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

// A fresh session through the real form; the page must be signed out first.
export async function signInAs(page: Page, role: Role) {
  await signIn(page, ACCOUNT[role].email, seedPassword(role));
  await page.waitForURL((u) => u.pathname !== '/login');
}
