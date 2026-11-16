import { describe, expect, it } from 'vitest';
import { makeContactInputSchema } from './contact';

const valid = {
  fullName: 'Marisol Ortega',
  email: 'm@example.com',
  phone: '',
  matterType: 'family',
};
const schema = makeContactInputSchema({ today: '2026-11-16' });

describe('makeContactInputSchema', () => {
  it('requires email or phone', () => {
    const r = schema.safeParse({
      fullName: 'Marisol Ortega',
      email: '',
      phone: '',
      matterType: 'family',
    });
    expect(r.success).toBe(false);
    expect(
      r.error!.issues.find((i) => i.path[0] === 'contactMethod')!.message,
    ).toBe('Add an email or a phone number.');
  });

  it('trims names and rejects whitespace-only', () => {
    const ok = schema.safeParse({ ...valid, fullName: '  Ana  ' });
    expect(ok.success && ok.data.fullName).toBe('Ana');
    const bad = schema.safeParse({ ...valid, fullName: '   ' });
    expect(bad.success).toBe(false);
    expect(bad.error!.issues.some((i) => i.path[0] === 'fullName')).toBe(true);
  });

  it('accepts unicode and apostrophes', () => {
    expect(
      schema.safeParse({ ...valid, fullName: "Zoë O'Brien-Núñez" }).success,
    ).toBe(true);
  });

  it('rejects a past follow-up only when it changed', () => {
    expect(
      schema.safeParse({ ...valid, followUpOn: '2026-11-15' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...valid, followUpOn: '2026-11-16' }).success,
    ).toBe(true);
    const edit = makeContactInputSchema({
      today: '2026-11-16',
      previousFollowUpOn: '2026-11-10',
    });
    expect(edit.safeParse({ ...valid, followUpOn: '2026-11-10' }).success).toBe(
      true,
    );
    expect(edit.safeParse({ ...valid, followUpOn: '2026-11-11' }).success).toBe(
      false,
    );
  });

  it('phone needs at least 7 digits', () => {
    expect(
      schema.safeParse({ ...valid, email: '', phone: '(512) 555-0148' })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...valid, email: '', phone: '555' }).success,
    ).toBe(false);
  });

  it('applies defaults and nulls empties', () => {
    const r = schema.parse({ ...valid, summary: '  ', referralSource: null });
    expect(r).toMatchObject({
      status: 'lead',
      phone: null,
      summary: null,
      followUpOn: null,
      referralSource: null,
    });
  });
});
