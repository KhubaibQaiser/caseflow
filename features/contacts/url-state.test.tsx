import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { wrapper } from './list/test-utils';
import { useListQuery } from './url-state';

describe('useListQuery', () => {
  it('parses the URL and keeps unrelated params when a setter runs', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useListQuery(), {
      wrapper: wrapper({
        searchParams: '?status=lead,active&sort=name&dir=desc&page=3&size=50',
        onUrlUpdate,
      }),
    });
    const [query] = result.current;
    expect(query).toMatchObject({
      status: ['lead', 'active'],
      sort: 'name',
      dir: 'desc',
      page: 3,
      size: 50,
    });

    await act(async () => {
      await result.current[1]({ sort: 'status' });
    });
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const url = onUrlUpdate.mock.calls.at(-1)![0].searchParams;
    expect(url.get('status')).toBe('lead,active');
    expect(url.get('sort')).toBe('status');
    expect(url.get('dir')).toBe('desc');
    expect(url.get('size')).toBe('50');
  });

  it('resets page to 1 on every change except the page itself', async () => {
    const onUrlUpdate = vi.fn();
    const { result } = renderHook(() => useListQuery(), {
      wrapper: wrapper({ searchParams: '?page=5', onUrlUpdate }),
    });

    await act(async () => {
      await result.current[1]({ size: 100 });
    });
    await waitFor(() => expect(result.current[0].page).toBe(1));
    expect(onUrlUpdate.mock.calls.at(-1)![0].searchParams.has('page')).toBe(
      false,
    );

    await act(async () => {
      await result.current[1]({ page: 4 });
    });
    await waitFor(() => expect(result.current[0].page).toBe(4));
    expect(result.current[0].size).toBe(100);
  });
});
