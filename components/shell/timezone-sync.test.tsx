import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { TimezoneSync } from './timezone-sync';

function browserZone(zone: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone: zone,
  } as Intl.ResolvedDateTimeFormatOptions);
}
const setCookie = (v: string) => (document.cookie = `tz=${v}; path=/`);
const clearCookie = () => (document.cookie = 'tz=; path=/; max-age=0');

beforeEach(() => refresh.mockClear());
afterEach(() => {
  vi.restoreAllMocks();
  clearCookie();
});

describe('TimezoneSync', () => {
  it('writes the browser zone and refreshes once when the cookie differs', () => {
    setCookie('UTC');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    expect(document.cookie).toContain('tz=America%2FChicago');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does nothing on mount when the cookie already matches', () => {
    setCookie('America%2FChicago');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    expect(refresh).not.toHaveBeenCalled();
  });

  it('re-checks when the tab becomes visible', () => {
    setCookie('America%2FChicago');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    browserZone('Pacific/Auckland');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(document.cookie).toContain('tz=Pacific%2FAuckland');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes on focus so day labels roll over after midnight', () => {
    setCookie('America%2FChicago');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    window.dispatchEvent(new Event('focus'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes once, not twice, when focus also finds a new zone', () => {
    setCookie('America%2FChicago');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    browserZone('Pacific/Auckland');
    window.dispatchEvent(new Event('focus'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('TimezoneSync double events', () => {
  it('refreshes once when visibilitychange and focus both fire on returning to the tab', () => {
    setCookie('America%2FChicago');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    browserZone('Pacific/Auckland');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes once when both fire and the zone is unchanged', () => {
    setCookie('America%2FChicago');
    browserZone('America/Chicago');
    render(<TimezoneSync />);

    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
