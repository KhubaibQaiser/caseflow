import { isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ getViewer: vi.fn() }));
vi.mock('@/lib/auth/viewer', () => ({
  getViewer: m.getViewer,
  NoProfileError: class NoProfileError extends Error {},
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock('@/features/auth/actions', () => ({ signOutAction: vi.fn() }));

import { NoProfileError } from '@/lib/auth/viewer';
import { NoAccessState } from '@/components/shell/no-access-state';

import AppLayout from './layout';

const props = { children: null } as Parameters<typeof AppLayout>[0];

describe('(app) layout', () => {
  it('renders the No access state, not the shell, when there is no profile', async () => {
    m.getViewer.mockRejectedValue(new NoProfileError());
    const tree = await AppLayout(props);
    const el = (tree as { props: { children: unknown } }).props.children;
    expect(isValidElement(el) && el.type).toBe(NoAccessState);
  });

  it('sends a missing session to /login?reason=expired', async () => {
    m.getViewer.mockResolvedValue(null);
    await expect(AppLayout(props)).rejects.toThrow(
      'REDIRECT /login?reason=expired',
    );
  });
});
