import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ContactsView } from './contacts-view';
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
