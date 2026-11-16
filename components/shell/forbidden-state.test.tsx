import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ForbiddenState } from './forbidden-state';

describe('ForbiddenState', () => {
  it('names the action and the role, and offers the way back', () => {
    render(
      <ForbiddenState
        action="edit contacts"
        backHref="/contacts/123"
        backLabel="Back to Marisol Ortega"
      />,
    );
    const heading = screen.getByRole('heading', {
      level: 1,
      name: "You can't edit contacts.",
    });
    expect(heading).toHaveFocus();
    expect(
      screen.getByText(
        'Your role is Viewer, which is read-only. An admin can change your role or make this edit for you.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to Marisol Ortega' }),
    ).toHaveAttribute('href', '/contacts/123');
  });
});
