import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import GlobalError from './global-error';

vi.mock('next/font/google', () => ({
  Figtree: () => ({ variable: 'figtree-face' }),
}));

it('renders its own document with a title, the alert and Reload', () => {
  const html = renderToStaticMarkup(
    <GlobalError error={new Error('root layout crash')} reset={vi.fn()} />,
  );

  expect(html).toMatch(/^<html lang="en" class="[^"]*figtree-face/);
  expect(html).toContain('<body');
  expect(html).toContain('<title>Something broke · Caseflow</title>');
  expect(html).toContain('role="alert"');
  expect(html).toContain('Something broke on our side.');
  expect(html).toMatch(
    /<button[^>]*>(?:(?!<\/button>).)*Reload(?:(?!<\/button>).)*<\/button>/,
  );
  expect(html).not.toContain('root layout crash');
});
