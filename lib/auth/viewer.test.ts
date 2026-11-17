import { describe, expect, it } from 'vitest';

import * as facade from './viewer';
import * as real from './viewer-supabase';

describe('viewer facade', () => {
  it('is the real Supabase implementation, with no fake-role path', () => {
    expect(facade.getViewer).toBe(real.getViewer);
    expect(facade.requirePermission).toBe(real.requirePermission);
    expect(facade.assertPermission).toBe(real.assertPermission);
    expect(facade.NoProfileError).toBe(real.NoProfileError);
  });
});
