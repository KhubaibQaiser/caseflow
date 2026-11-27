import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ContactCards } from './contact-cards';
import { row, rows } from './test-utils';

// The mobile list scrolls with the window, so the tests drive window.scrollY and fire the scroll event.
const CARD = 72;
const setScrollY = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  Object.defineProperty(window, 'pageYOffset', { configurable: true, value: y });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
};

const cards = (props: Partial<Parameters<typeof ContactCards>[0]> = {}) => (
  <ContactCards rows={rows(3)} offset={0} matching={3} {...props} />
);

const rendered = () => within(screen.getByRole('list', { name: 'Contacts' })).queryAllByRole('listitem');

describe('ContactCards (below 768px, virtualized)', () => {
  beforeEach(() => setScrollY(0));
  afterEach(() => setScrollY(0));

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

  it('brings later cards in and takes earlier ones out as the window scrolls', () => {
    render(cards({ rows: rows(250), matching: 250 }));
    setScrollY(200 * CARD);
    expect(screen.getByRole('link', { name: 'Person 200' })).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Person 0' })).toHaveAttribute('href', '/contacts/c-0');
    expect(screen.getByRole('link', { name: '(512) 555-0148' })).toHaveAttribute('href', 'tel:+15125550148');
  });

  it('renders an empty list for an empty page', () => {
    render(cards({ rows: [], matching: 0 }));
    expect(screen.getByRole('list', { name: 'Contacts' })).toBeInTheDocument();
    expect(rendered()).toHaveLength(0);
  });
});
