import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Breadcrumb } from './breadcrumb';

describe('Breadcrumb', () => {
  const crumbs = [
    { label: 'Contacts', href: '/contacts' },
    { label: 'Marisol Ortega' },
  ];

  it('makes the parent link a 32px target with a back chevron on mobile', () => {
    const { container } = render(<Breadcrumb crumbs={crumbs} />);
    const link = screen.getByRole('link', { name: 'Contacts' });
    expect(link.className).toContain('min-h-8');
    expect(link.querySelector('svg')?.getAttribute('class')).toContain(
      'md:hidden',
    );
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('shows the current page and the slash from md up only', () => {
    render(<Breadcrumb crumbs={crumbs} />);
    const current = screen.getByText('Marisol Ortega');
    expect(current.closest('li')!.className).toContain('max-md:hidden');
  });
});
