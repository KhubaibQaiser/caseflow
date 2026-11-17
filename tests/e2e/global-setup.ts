import { chromium, type FullConfig } from '@playwright/test';

import { signInAs, storage, type Role } from './helpers';

// Signs in the seeded Admin and Viewer once and saves their sessions for every spec.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  const browser = await chromium.launch();
  try {
    for (const role of ['admin', 'viewer'] as Role[]) {
      const context = await browser.newContext({ baseURL });
      await signInAs(await context.newPage(), role);
      await context.storageState({ path: storage[role] });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
