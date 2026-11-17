import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/pipeline',
  useSearchParams: () => new URLSearchParams(''),
}));

import { wrapper } from '@/features/contacts/list/test-utils';

import PipelineError from './error';

describe('pipeline error boundary', () => {
  it('keeps the toolbar but not Sort, which the board never uses', async () => {
    render(
      <PipelineError error={new Error('x')} reset={vi.fn()} retry={vi.fn()} />,
      { wrapper: wrapper() },
    );
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Pipeline didn't load.",
    );
    expect(screen.queryByRole('button', { name: /^Sort/ })).toBeNull();
  });
});
