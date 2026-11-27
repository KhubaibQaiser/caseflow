import { act, render, screen, waitFor, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactCards } from './contact-cards';
import { row, rows } from './test-utils';

// The mobile list scrolls with the window, so the tests drive window.scrollY and fire the scroll event.
const CARD = 72;
// Where the list starts in the page, in CSS pixels from the top. Tests move it to stand in for a toolbar above it.
let listTop = 0;

const setScrollY = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  Object.defineProperty(window, 'pageYOffset', {
    configurable: true,
    value: y,
  });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
};

const cards = (props: Partial<Parameters<typeof ContactCards>[0]> = {}) => (
  <ContactCards rows={rows(3)} offset={0} matching={3} {...props} />
);

const list = () => screen.getByRole('list', { name: 'Contacts' });
const rendered = () => within(list()).queryAllByRole('listitem');

describe('ContactCards (below 768px, virtualized)', () => {
  // jsdom reports no page height, so every offset looks past the end and the virtualizer ignores it.
  // Give the page the height a real 250-card list would have, so the scroll is treated as it would be in a browser.
  // jsdom also reports 0 for every box. Report the list at listTop in the page, so a scroll moves it up the viewport.
  beforeEach(() => {
    listTop = 0;
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 20000,
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          top: listTop - window.scrollY,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: listTop - window.scrollY,
          toJSON: () => ({}),
        }) as DOMRect,
    );
    setScrollY(0);
  });
  afterEach(() => {
    setScrollY(0);
    vi.restoreAllMocks();
    Reflect.deleteProperty(document.documentElement, 'scrollHeight');
  });

  it('renders a window of cards, not every card on the page', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    const drawn = rendered();
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.length).toBeLessThan(40);
    expect(screen.getByRole('link', { name: 'Person 0' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Person 200' })).toBeNull();
  });

  it('draws the cards that fit the viewport, plus eight beyond it', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    // A 768px viewport fits 11 cards of 72px. Eight more are drawn past its edge, so Tab can move into them.
    expect(rendered()).toHaveLength(19);
  });

  it('gives each card its place in the whole set, not in the page', () => {
    render(cards({ rows: rows(250), offset: 250, matching: 1284 }));
    const first = rendered()[0];
    expect(first).toHaveAttribute('aria-posinset', '251');
    expect(first).toHaveAttribute('aria-setsize', '1284');
  });

  it('gives the list the full height of its cards, so the page scrolls to the end', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    expect(list()).toHaveStyle({ height: `${250 * CARD}px` });
  });

  it('brings later cards in and takes earlier ones out as the window scrolls', async () => {
    render(cards({ rows: rows(250), matching: 250 }));
    setScrollY(200 * CARD);
    // The virtualizer reads the scroll on the next frame, so wait for it rather than assert at once.
    expect(
      await screen.findByRole('link', { name: 'Person 200' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Person 0' })).toBeNull();
  });

  it('measures the list where it really is, so a toolbar above it does not shift the window', async () => {
    listTop = 180;
    render(cards({ rows: rows(250), matching: 250 }));
    expect(rendered()[0]).toHaveAttribute('data-index', '0');
    // At 3000px the first card on screen is (3000 - 180) / 72, which is index 39. Index 0 is long gone.
    setScrollY(3000);
    expect(
      await screen.findByRole('link', { name: 'Person 39' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Person 0' })).toBeNull();
  });

  it('measures the list again when the window resizes, because the layout above it can move', async () => {
    render(cards({ rows: rows(250), matching: 250 }));
    // The list moves 720px down the page, as it would when a breakpoint changes what sits above it.
    listTop = 720;
    setScrollY(3000);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    // Now the first card on screen is (3000 - 720) / 72, which is index 31, and 8 more are drawn above it.
    await waitFor(() =>
      expect(rendered()[0]).toHaveAttribute('data-index', '23'),
    );
  });

  it('keeps cards past the visible window, so keyboard focus can move on into them', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    expect(rendered().length).toBeGreaterThan(11);
  });

  it('links each card to its contact and keeps the phone as a call link', () => {
    render(
      cards({
        rows: [row(0, { phone: '+15125550148' }), row(1, { phone: null })],
        matching: 2,
      }),
    );
    expect(screen.getByRole('link', { name: 'Person 0' })).toHaveAttribute(
      'href',
      '/contacts/c-0',
    );
    expect(
      screen.getByRole('link', { name: '(512) 555-0148' }),
    ).toHaveAttribute('href', 'tel:+15125550148');
    expect(screen.getByText('No phone')).toBeInTheDocument();
  });

  it('labels the list and makes it the focus target for results', () => {
    render(cards({ rows: rows(3), matching: 3 }));
    expect(list()).toHaveAttribute('tabindex', '-1');
    expect(list()).toHaveAttribute('data-results-focus');
  });

  it('draws only the first window in the server HTML, so the page is not a blank list before it hydrates', () => {
    const html = renderToString(cards({ rows: rows(250), matching: 250 }));
    // The server draws a 390x844 phone screen: 12 cards fit, plus 8 beyond them.
    expect(html.match(/<li /g)).toHaveLength(20);
  });

  it('renders an empty list for an empty page', () => {
    render(cards({ rows: [], matching: 0 }));
    expect(list()).toHaveStyle({ height: '0px' });
    expect(rendered()).toHaveLength(0);
  });
});
