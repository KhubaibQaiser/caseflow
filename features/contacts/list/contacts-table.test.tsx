import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ContactCards } from './contact-cards';
import { ContactsTable } from './contacts-table';
import { row, rows } from './test-utils';

const LONG_NAME = `Alexandra ${'Montgomery-'.repeat(10)}Vasquez`.slice(0, 120);
const LONG_EMAIL = `${'a'.repeat(90)}@example-law-intake.com`;

const table = (props: Partial<Parameters<typeof ContactsTable>[0]> = {}) => (
  <ContactsTable
    rows={rows(3)}
    matching={3}
    offset={0}
    sort="follow_up"
    dir="asc"
    onSort={() => {}}
    {...props}
  />
);

describe('ContactsTable', () => {
  // jsdom has no layout; give the scroll box a real viewport so the virtualizer renders a window of rows.
  const box = (name: 'clientHeight' | 'clientWidth', px: number) =>
    vi.spyOn(Element.prototype, name, 'get').mockReturnValue(px);
  beforeAll(() => {
    box('clientHeight', 800);
    box('clientWidth', 1200);
  });
  afterAll(() => vi.restoreAllMocks());

  it('virtualized table keeps semantics', () => {
    render(table({ rows: rows(500), matching: 1284, offset: 250 }));
    const grid = screen.getByRole('table');
    expect(grid).toHaveAttribute('aria-rowcount', '1285');
    const all = screen.getAllByRole('row');
    expect(all.length).toBeLessThan(80);
    expect(all[0]).toHaveAttribute('aria-rowindex', '1');
    // The first data row of page 2 at 250 a page is row 251 of the set, after the header.
    expect(all[1]).toHaveAttribute('aria-rowindex', '252');
  });

  it('sort header reflects aria-sort and toggles', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(table({ onSort }));
    const followUp = screen.getByRole('columnheader', { name: /Follow-up/ });
    expect(followUp).toHaveAttribute('aria-sort', 'ascending');
    expect(
      screen.getByRole('columnheader', { name: /Name/ }),
    ).not.toHaveAttribute('aria-sort');
    // Phone is not sortable, so it has no button.
    expect(
      within(screen.getByRole('columnheader', { name: 'Phone' })).queryByRole(
        'button',
      ),
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('reports Waiting by the days shown, not by created date', () => {
    // waiting asc = oldest created first = most days waiting first.
    render(table({ sort: 'waiting', dir: 'asc' }));
    expect(
      screen.getByRole('columnheader', { name: /Waiting/ }),
    ).toHaveAttribute('aria-sort', 'descending');
  });

  it('a new sort or filter starts the table at the top', () => {
    const { container, rerender } = render(table({ scrollKey: 'a' }));
    const box = container.querySelector<HTMLElement>('[data-results-scroll]')!;
    const set = vi.fn();
    Object.defineProperty(box, 'scrollTop', { set, get: () => 400 });
    rerender(table({ scrollKey: 'a', rows: rows(4) }));
    // A refresh of the same list (new rows, same key) keeps the reader's place.
    expect(set).not.toHaveBeenCalled();
    rerender(table({ scrollKey: 'b' }));
    expect(set).toHaveBeenCalledWith(0);
  });

  it('long names truncate with title', () => {
    render(
      table({
        rows: [row(1, { fullName: LONG_NAME, email: LONG_EMAIL })],
        matching: 1,
      }),
    );
    const link = screen.getByRole('link', { name: LONG_NAME });
    expect(link).toHaveAttribute('href', '/contacts/c-1');
    expect(link).toHaveAttribute('title', LONG_NAME);
    expect(link).toHaveClass('truncate');
    const email = screen.getByTitle(LONG_EMAIL);
    expect(email).toHaveClass('truncate');
  });

  it('writes urgency and missing values as text', () => {
    render(
      table({
        rows: [
          row(1, {
            followUpOn: '2026-11-12',
            urgency: 'overdue',
            daysOverdue: 5,
            email: null,
            phone: null,
            referralSource: null,
          }),
        ],
        matching: 1,
      }),
    );
    expect(screen.getByText('Overdue · 5d')).toBeInTheDocument();
    expect(screen.getByText('No email')).toBeInTheDocument();
    expect(screen.getByText('No phone')).toBeInTheDocument();
  });
});

describe('ContactCards', () => {
  it('truncates long names with title and links the phone', () => {
    render(
      <ContactCards rows={[row(1, { fullName: LONG_NAME })]} offset={0} />,
    );
    const link = screen.getByRole('link', { name: LONG_NAME });
    expect(link).toHaveAttribute('title', LONG_NAME);
    expect(link).toHaveClass('truncate');
    expect(
      screen.getByRole('link', { name: '(512) 555-0148' }),
    ).toHaveAttribute('href', 'tel:5125550148');
  });
});
