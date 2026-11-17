import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let path = '/pipeline';
vi.mock('next/navigation', () => ({ usePathname: () => path }));

import { QuickViews } from './quick-views';
import { wrapper } from './test-utils';

describe('QuickViews', () => {
  it('links stay on the page they are on, so the board keeps its board', () => {
    render(<QuickViews />, { wrapper: wrapper({ searchParams: '?q=ortega' }) });
    expect(screen.getByRole('link', { name: 'Overdue' })).toHaveAttribute(
      'href',
      '/pipeline?q=ortega&fu=overdue',
    );
  });
});
