import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/actions', () => ({ signInAction: vi.fn() }));

import LoginPage from './page';

const renderPage = async (params: Record<string, string | string[]>) =>
  render(
    await LoginPage({
      searchParams: Promise.resolve(params),
    } as Parameters<typeof LoginPage>[0]),
  );

describe('login page params', () => {
  it('shows the banner only for reason=expired', async () => {
    const { unmount } = await renderPage({ reason: 'whatever' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();
    await renderPage({ reason: 'expired' });
    expect(screen.getByRole('status')).toBeVisible();
  });

  it('puts next only in the hidden input, never in the page text', async () => {
    const { container } = await renderPage({ next: '/pipeline' });
    const hidden = container.querySelectorAll('input[name="next"]');
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toHaveAttribute('value', '/pipeline');
    expect(container.textContent).not.toContain('/pipeline');
  });
});
