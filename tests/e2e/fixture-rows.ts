import type { ContactRow } from '@/lib/contracts/contact';

type Fixtures = typeof import('@/lib/data/fixtures');

// `server-only` throws outside the React server build. These rows are test input, not shipped code,
// so give it an empty module before the fixtures load.
const marker = require.resolve('server-only');
require.cache[marker] = {
  id: marker,
  filename: marker,
  loaded: true,
  exports: {},
} as unknown as NodeModule;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- must load after the stub above
const fixtures: Fixtures = require('../../lib/data/fixtures');

/** The rows the fake data layer renders for `today`: the same pure generator, the same count. */
export const fixtureRows = (today: string): ContactRow[] =>
  fixtures.makeFixtureRows(1200, today);
