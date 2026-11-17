import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('keeps title, count and action in one row where only the title gives way', () => {
    render(
      <PageHeader
        title="Contacts"
        meta="1,284 of 2,437"
        actions={<button type="button">New contact</button>}
      />,
    );
    const h1 = screen.getByRole('heading', { name: 'Contacts' });
    expect(h1.className).toContain('truncate');
    expect(h1.className).toContain('min-w-0');
    const action = screen.getByRole('button', {
      name: 'New contact',
    }).parentElement!;
    expect(action.className).toContain('shrink-0');
    expect(action.parentElement!.className).not.toContain('flex-wrap');
  });

  it('drops the count under 360px, so the title still reads at 320', () => {
    render(<PageHeader title="Contacts" meta="1,284 of 2,437" />);
    expect(screen.getByText('1,284 of 2,437').className).toContain(
      'max-[359px]:hidden',
    );
  });
});
