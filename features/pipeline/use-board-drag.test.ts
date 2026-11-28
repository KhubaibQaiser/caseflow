import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  WIDE_BOARD,
  asStatus,
  blocksDrag,
  columnPitch,
  dropStatus,
  useMedia,
} from './use-board-drag';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dropStatus', () => {
  it('moves only to another column, and never on cancel', () => {
    expect(dropStatus('lead', 'active', false)).toBe('active');
    expect(dropStatus('lead', 'lead', false)).toBeNull();
    expect(dropStatus('lead', null, false)).toBeNull();
    expect(dropStatus('lead', 'board', false)).toBeNull();
    expect(dropStatus('lead', 'active', true)).toBeNull();
  });
});

describe('asStatus', () => {
  it('accepts only a column id', () => {
    expect(asStatus('closed')).toBe('closed');
    expect(asStatus('board')).toBeNull();
    expect(asStatus(undefined)).toBeNull();
    expect(asStatus(3)).toBeNull();
  });
});

describe('blocksDrag', () => {
  it('lets the card link start a drag, but not the phone link or a button', () => {
    document.body.innerHTML = `<li>
      <a href="/contacts/a" data-card-link>Marisol Ortega</a>
      <p>Family · <a href="tel:+15125550148">(512) 555-0148</a></p>
      <button type="button">Move to… <svg></svg></button>
    </li>`;
    const [cardLink, phone] = document.querySelectorAll('a');
    expect(blocksDrag(cardLink ?? null)).toBe(false);
    expect(blocksDrag(document.querySelector('p'))).toBe(false);
    expect(blocksDrag(phone ?? null)).toBe(true);
    expect(blocksDrag(document.querySelector('svg'))).toBe(true);
    expect(blocksDrag(null)).toBe(false);
  });
});

describe('columnPitch', () => {
  it('is the distance between the first two columns', () => {
    expect(columnPitch([16, 330, 644])).toBe(314);
    expect(columnPitch([16])).toBe(0);
    expect(columnPitch([])).toBe(0);
  });
});

describe('useMedia', () => {
  it('follows matchMedia changes', () => {
    let matches = false;
    let onChange = () => {};
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, l: () => void) => {
        onChange = l;
      },
      removeEventListener: () => {},
    }));
    const { result } = renderHook(() => useMedia(WIDE_BOARD));
    expect(result.current).toBe(false);
    act(() => {
      matches = true;
      onChange();
    });
    expect(result.current).toBe(true);
  });
});
