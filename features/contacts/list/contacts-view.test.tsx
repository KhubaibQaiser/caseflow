import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BusyRegion, ContactsView } from './contacts-view';
import { FACETS, wrapper } from './test-utils';

describe('ContactsView', () => {
  it('first run shows only the empty state: nothing to search or filter yet', () => {
    render(
      <ContactsView
        rows={[]}
        total={0}
        matching={0}
        facets={{ ...FACETS, total: 0, matching: 0 }}
        page={1}
        pageSize={250}
      />,
      { wrapper: wrapper() },
    );
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: 'Quick views' }),
    ).toBeNull();
  });
});

describe('BusyRegion', () => {
  it('marks loading without dimming the rows', () => {
    const { rerender } = render(
      <BusyRegion busy>
        <p>Kevin Carrillo</p>
      </BusyRegion>,
    );
    const region = screen.getByText('Kevin Carrillo').parentElement!;
    expect(region).toHaveAttribute('aria-busy', 'true');
    // Text keeps full contrast (spec 8.11); a thin bar carries the signal instead.
    expect(region.className).not.toMatch(/opacity/);
    expect(region.querySelector('[data-loading-bar]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    rerender(
      <BusyRegion busy={false}>
        <p>Kevin Carrillo</p>
      </BusyRegion>,
    );
    expect(region).not.toHaveAttribute('aria-busy');
    expect(region.querySelector('[data-loading-bar]')).toBeNull();
  });
});
