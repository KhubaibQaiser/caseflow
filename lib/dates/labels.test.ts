import { describe, expect, it } from 'vitest';

import {
  followUpView,
  formatDateShort,
  formatTimestamp,
  waitingLabel,
} from './labels';

const T = '2026-11-16';

describe('followUpView', () => {
  it('labels overdue, today, later and unset', () => {
    expect(
      followUpView(
        {
          status: 'lead',
          followUpOn: '2026-11-14',
          urgency: 'overdue',
          daysOverdue: 2,
        },
        T,
      ),
    ).toEqual({ tone: 'overdue', text: 'Overdue · 2d' });
    expect(
      followUpView(
        {
          status: 'active',
          followUpOn: T,
          urgency: 'today',
          daysOverdue: null,
        },
        T,
      ),
    ).toEqual({ tone: 'today', text: 'Today' });
    expect(
      followUpView(
        {
          status: 'lead',
          followUpOn: '2026-11-20',
          urgency: 'later',
          daysOverdue: null,
        },
        T,
      ),
    ).toEqual({ tone: 'later', text: 'Fri, Nov 20' });
    expect(
      followUpView(
        {
          status: 'lead',
          followUpOn: null,
          urgency: 'none',
          daysOverdue: null,
        },
        T,
      ),
    ).toEqual({ tone: 'none', text: 'Not set' });
  });

  it('mutes closed contacts, never flagging them', () => {
    expect(
      followUpView(
        {
          status: 'closed',
          followUpOn: '2026-11-01',
          urgency: 'later',
          daysOverdue: null,
        },
        T,
      ),
    ).toEqual({ tone: 'muted', text: 'Sun, Nov 1' });
    expect(
      followUpView(
        {
          status: 'closed',
          followUpOn: '2026-11-14',
          urgency: 'overdue',
          daysOverdue: 2,
        },
        T,
      ).tone,
    ).toBe('muted');
    expect(
      followUpView(
        {
          status: 'closed',
          followUpOn: null,
          urgency: 'none',
          daysOverdue: null,
        },
        T,
      ),
    ).toEqual({ tone: 'muted', text: 'Not set' });
  });
});

describe('formatDateShort', () => {
  it('omits the year in the current year', () => {
    expect(formatDateShort('2026-11-20', T)).toBe('Fri, Nov 20');
  });
  it('adds the year when it differs', () => {
    expect(formatDateShort('2027-01-05', T)).toBe('Tue, Jan 5, 2027');
  });
});

describe('waitingLabel', () => {
  it("says 'Today' for the same day in the zone", () => {
    expect(waitingLabel('2026-11-16T08:00:00Z', T, 'UTC')).toBe('Today');
  });
  it('counts calendar days in the zone', () => {
    expect(waitingLabel('2026-11-12T10:00:00Z', T, 'UTC')).toBe('4d');
    // 23:30Z on the 15th is already the 16th in Kiritimati (UTC+14)
    expect(waitingLabel('2026-11-15T23:30:00Z', T, 'Pacific/Kiritimati')).toBe(
      'Today',
    );
  });
});

describe('formatTimestamp', () => {
  it('formats in the given zone', () => {
    expect(formatTimestamp('2026-11-13T21:12:00Z', 'UTC')).toBe(
      'Nov 13, 9:12 PM',
    );
    expect(formatTimestamp('2026-11-13T21:12:00Z', 'America/Chicago')).toBe(
      'Nov 13, 3:12 PM',
    );
  });
});
