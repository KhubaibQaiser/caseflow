import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ShellError from './error';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('in-shell error boundary', () => {
  it('shows the failure without its own main landmark (the shell supplies it)', () => {
    render(<ShellError error={new Error('x')} reset={vi.fn()} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Something broke on our side.',
      }),
    ).toHaveFocus();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });
});
