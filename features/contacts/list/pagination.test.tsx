import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination, pageItems } from './pagination';
import { wrapper } from './test-utils';

describe('pageItems', () => {
  it('always shows the first and last page with gaps as ellipses', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, 5, '…', 12]);
    expect(pageItems(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(pageItems(12, 12)).toEqual([1, '…', 8, 9, 10, 11, 12]);
    // A gap of one page shows the page, not an ellipsis.
    expect(pageItems(4, 12)).toEqual([1, 2, 3, 4, 5, '…', 12]);
  });
});

describe('Pagination', () => {
  it('shows the range and marks the current page', () => {
    render(<Pagination page={2} pageSize={250} matching={1284} />, {
      wrapper: wrapper({ searchParams: '?page=2&status=lead' }),
    });
    expect(screen.getByText('251–500 of 1,284')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Hrefs keep the other params so the pager works without JS and opens in new tabs.
    expect(screen.getByRole('link', { name: 'Page 3' })).toHaveAttribute(
      'href',
      '/contacts?status=lead&page=3',
    );
    expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute(
      'href',
      '/contacts?status=lead',
    );
  });

  it('disables previous on the first page and next on the last', () => {
    render(<Pagination page={6} pageSize={250} matching={1284} />, {
      wrapper: wrapper({ searchParams: '?page=6' }),
    });
    expect(screen.getByText('1,251–1,284 of 1,284')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Next page' })).not.toHaveAttribute(
      'href',
    );
    expect(screen.getByRole('link', { name: 'Previous page' })).toHaveAttribute(
      'href',
      '/contacts?page=5',
    );
  });

  it.each([
    [true, 'scrollIntoView', 'scrollTo'],
    [false, 'scrollTo', 'scrollIntoView'],
  ])(
    'a page change reveals the results (md and up: %s)',
    async (wide, used, unused) => {
      const user = userEvent.setup();
      const spies = {
        scrollIntoView: vi.fn(),
        scrollTo: vi.fn(),
      };
      window.HTMLElement.prototype.scrollIntoView = spies.scrollIntoView;
      window.scrollTo = spies.scrollTo;
      vi.stubGlobal('matchMedia', (q: string) => ({
        matches: wide && q.includes('min-width'),
        media: q,
        addEventListener() {},
        removeEventListener() {},
      }));
      render(
        <>
          <h2 data-results-focus tabIndex={-1}>
            Results
          </h2>
          <Pagination page={2} pageSize={250} matching={1284} />
        </>,
        { wrapper: wrapper({ searchParams: '?page=2' }) },
      );
      await user.click(screen.getByRole('link', { name: 'Page 3' }));
      expect(spies[used as keyof typeof spies]).toHaveBeenCalled();
      expect(spies[unused as keyof typeof spies]).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    },
  );

  it('changing the page focuses the results and changing size resets the page', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    render(
      <>
        <h2 data-results-focus tabIndex={-1}>
          Results
        </h2>
        <Pagination page={2} pageSize={250} matching={1284} />
      </>,
      { wrapper: wrapper({ searchParams: '?page=2', onUrlUpdate }) },
    );

    await user.click(screen.getByRole('link', { name: 'Page 3' }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe('?page=3'),
    );
    expect(screen.getByRole('heading', { name: 'Results' })).toHaveFocus();

    await user.selectOptions(screen.getByLabelText('Rows per page'), '50');
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe('?size=50'),
    );
  });
});
