import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactCards } from './contact-cards';
import { row, rows } from './test-utils';

// The mobile list scrolls with the window, so the tests drive window.scrollY and fire the scroll event.
const CARD = 72;
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

const rendered = () =>
  within(screen.getByRole('list', { name: 'Contacts' })).queryAllByRole(
    'listitem',
  );

describe('ContactCards (below 768px, virtualized)', () => {
  // jsdom reports no page height, so every offset looks past the end and the virtualizer ignores it.
  // Give the page the height a real 250-card list would have, so the scroll is treated as it would be in a browser.
  // The list sits at the top of the page, so as the window scrolls its viewport top moves up by the same amount.
  // jsdom reports 0 for every box, which would put the list at the scroll position and break the offset.
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 20000,
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          top: -window.scrollY,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: -window.scrollY,
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

  it('gives each card its place in the whole set, not in the page', () => {
    render(cards({ rows: rows(250), offset: 250, matching: 1284 }));
    const first = rendered()[0];
    expect(first).toHaveAttribute('aria-posinset', '251');
    expect(first).toHaveAttribute('aria-setsize', '1284');
  });

  it('gives the list the full height of its cards, so the page scrolls to the end', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    expect(screen.getByRole('list', { name: 'Contacts' })).toHaveStyle({
      height: `${250 * CARD}px`,
    });
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

  it('keeps cards past the visible window, so keyboard focus can move on into them', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    // A 768px window shows 11 cards of 72px. The cards drawn beyond them are what Tab moves into.
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
  });

  it('gives a card that is taller than the estimate its measured height, so the cards after it move down', async () => {
    // The first card wraps to three lines (120px). Every other card keeps the 72px estimate.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const height = this.dataset.index === '0' ? 120 : 0;
        return {
          top: -window.scrollY,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height,
          x: 0,
          y: -window.scrollY,
          toJSON: () => ({}),
        } as DOMRect;
      },
    );
    render(cards({ rows: rows(250), matching: 250 }));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Contacts' })).toHaveStyle({
        height: `${120 + 249 * CARD}px`,
      }),
    );
  });

  it('shrinks the list when the rows change to a shorter page', () => {
    const { rerender } = render(cards({ rows: rows(250), matching: 250 }));
    rerender(cards({ rows: rows(10), matching: 10 }));
    expect(screen.getByRole('list', { name: 'Contacts' })).toHaveStyle({
      height: `${10 * CARD}px`,
    });
  });

  it('renders an empty list for an empty page', () => {
    render(cards({ rows: [], matching: 0 }));
    expect(screen.getByRole('list', { name: 'Contacts' })).toBeInTheDocument();
    expect(rendered()).toHaveLength(0);
  });
});
