import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Activity } from '@/lib/contracts/contact';

import { Timeline } from './timeline';

const at = (over: Partial<Activity>): Activity => ({
  id: 'a-1',
  type: 'created',
  payload: {},
  createdAt: '2026-11-12T14:58:00.000Z',
  actor: { name: 'Alex Morgan' },
  ...over,
});
const view = (activities: Activity[]) =>
  render(<Timeline activities={activities} today="2026-11-17" tz="UTC" />);

describe('Timeline', () => {
  it('writes a status change as who moved it to what', () => {
    view([
      at({ type: 'status_changed', payload: { from: 'lead', to: 'active' } }),
    ]);
    expect(
      screen.getByText('Alex Morgan moved this to Active'),
    ).toBeInTheDocument();
  });

  it('writes each activity type in the same voice', () => {
    view([
      at({ id: '1', type: 'created' }),
      at({ id: '2', type: 'note_added' }),
      at({
        id: '3',
        type: 'follow_up_changed',
        payload: { from: null, to: '2026-11-20' },
      }),
      at({ id: '4', type: 'follow_up_changed', payload: { to: null } }),
      at({
        id: '5',
        type: 'updated',
        payload: { fields: ['full_name', 'matter_type'] },
      }),
    ]);
    expect(screen.getByText('Alex Morgan created this contact')).toBeVisible();
    expect(screen.getByText('Alex Morgan added a note')).toBeVisible();
    expect(
      screen.getByText('Alex Morgan set follow-up to Fri, Nov 20'),
    ).toBeVisible();
    expect(screen.getByText('Alex Morgan cleared the follow-up')).toBeVisible();
    expect(
      screen.getByText('Alex Morgan edited full name, matter type'),
    ).toBeVisible();
  });

  it('survives a payload it does not recognise', () => {
    view([
      at({ type: 'status_changed', payload: { to: 'bogus' } }),
      at({ id: '2', type: 'updated', payload: {} }),
    ]);
    expect(screen.getByText('Alex Morgan changed the status')).toBeVisible();
    expect(screen.getByText('Alex Morgan edited this contact')).toBeVisible();
  });

  it('renders nothing for deleted or restored', () => {
    view([at({ type: 'deleted' }), at({ id: '2', type: 'restored' })]);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('No activity yet.')).toBeVisible();
  });

  it('gives every entry a <time> with the full timestamp in a title', () => {
    view([at({})]);
    const t = screen.getByText('Nov 12, 2:58 PM');
    expect(t.tagName).toBe('TIME');
    expect(t).toHaveAttribute('datetime', '2026-11-12T14:58:00.000Z');
    expect(t.getAttribute('title')).toMatch(/November 12, 2026/);
  });

  it('says when it is showing only the latest 100', () => {
    view(Array.from({ length: 100 }, (_, i) => at({ id: String(i) })));
    expect(screen.getByText('Showing the latest 100.')).toBeVisible();
  });
});
