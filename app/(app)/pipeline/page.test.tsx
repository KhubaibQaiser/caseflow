import { afterEach, describe, expect, it, vi } from 'vitest';

import { FACETS } from '@/features/contacts/list/test-utils';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));
let tz = 'UTC';
vi.mock('@/lib/dates/server', () => ({ getRequestTimeZone: async () => tz }));
vi.mock('@/lib/data', () => ({
  getPipelineColumn: async () => ({ rows: [], matching: 0 }),
  getContactFacets: async () => FACETS,
}));
vi.mock('@/features/contacts/actions', () => ({ moveContactAction: vi.fn() }));
vi.mock('@/features/pipeline/actions', () => ({
  loadMoreColumnAction: vi.fn(),
}));

const { default: PipelinePage } = await import('./page');

async function boardKey() {
  const page = await PipelinePage({
    searchParams: Promise.resolve({}),
    params: Promise.resolve({}),
  });
  const kids = (page as { props: { children: { key: string | null }[] } }).props
    .children;
  return kids[1]!.key;
}

afterEach(() => {
  vi.useRealTimers();
  tz = 'UTC';
});

describe('/pipeline page', () => {
  it('a new day or time zone is a new board, so labels refresh (spec 8.7)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));
    const today = await boardKey();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));
    const tomorrow = await boardKey();
    expect(tomorrow).not.toBe(today);
    tz = 'Asia/Tokyo';
    vi.setSystemTime(new Date('2026-11-17T16:00:00Z'));
    const tokyo = await boardKey();
    tz = 'UTC';
    expect(tokyo).not.toBe(today);
  });
});
