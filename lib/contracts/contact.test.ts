import { describe, expect, it } from 'vitest';
import { ActivitySchema, makeContactInputSchema } from './contact';

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
    ).toBe(
      "Add an email or a phone number. Intake can't follow up without one.",
    );
  });

  it('trims names and rejects whitespace-only', () => {
    const ok = schema.safeParse({ ...valid, fullName: '  Ana  ' });
    expect(ok.success && ok.data.fullName).toBe('Ana');
    const bad = schema.safeParse({ ...valid, fullName: '   ' });
    expect(bad.success).toBe(false);
    expect(bad.error!.issues.some((i) => i.path[0] === 'fullName')).toBe(true);
  });

  it('says "Enter a full name." for an empty name and keeps the length rule for one character', () => {
    const msg = (fullName: string) =>
      schema
        .safeParse({ ...valid, fullName })
        .error?.issues.find((i) => i.path[0] === 'fullName')?.message;
    expect(msg('')).toBe('Enter a full name.');
    expect(msg('   ')).toBe('Enter a full name.');
    expect(msg('A')).toBe('Name must be at least 2 characters.');
  });

  it('accepts unicode and apostrophes', () => {
    expect(
      schema.safeParse({ ...valid, fullName: "Zoë O'Brien-Núñez" }).success,
    ).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    const schema = makeContactInputSchema({ today: '2026-11-16' });
    const r = schema.safeParse({ ...valid, followUpOn: '2026-12-32' });
    expect(r.success).toBe(false);
    expect(
      schema.safeParse({ ...valid, followUpOn: '2027-02-29' }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...valid, followUpOn: '2028-02-29' }).success,
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
      schema.safeParse({ ...valid, email: '', phone: '+1 512 555 0148' })
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

  it('reports field and cross-field errors together', () => {
    const r = schema.safeParse({
      fullName: 'Ann',
      email: '',
      phone: '',
      matterType: '',
      followUpOn: '2000-01-01',
    });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(
      expect.arrayContaining(['matterType', 'contactMethod', 'followUpOn']),
    );
  });

  it('cross-field rules tolerate invalid field values', () => {
    const r = schema.safeParse({
      fullName: 'A',
      email: 'not-an-email',
      phone: '',
      matterType: 'family',
      followUpOn: 'tomorrow',
    });
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain('email');
    expect(paths).not.toContain('contactMethod');
    expect(paths.filter((p) => p === 'followUpOn')).toHaveLength(1);
    expect(schema.safeParse(null).success).toBe(false);
  });
});

describe('ActivitySchema', () => {
  it('accepts only spec activity types', () => {
    const a = {
      id: 'a1',
      payload: {},
      createdAt: '2026-11-16T03:00:00.000Z',
      actor: { name: 'Khubaib' },
    };
    expect(ActivitySchema.safeParse({ ...a, type: 'note_added' }).success).toBe(
      true,
    );
    expect(ActivitySchema.safeParse({ ...a, type: 'emailed' }).success).toBe(
      false,
    );
  });
});

describe('phone', () => {
  const run = (phone: string, opts = {}) =>
    makeContactInputSchema({ today: '2026-11-16', ...opts }).safeParse({
      ...valid,
      phone,
    });

  it('stores a valid number as E.164', () => {
    for (const [input, e164] of [
      ['+1 (512) 555-0148', '+15125550148'],
      ['+44 7911 123456', '+447911123456'],
      ['+15125550148', '+15125550148'],
    ] as const) {
      const r = run(input);
      expect(r.success && r.data.phone).toBe(e164);
    }
  });

  it('rejects numbers that are not valid, or lack a country code', () => {
    for (const bad of ['+1 555', '(512) 555-0148', '+44 123', 'call me']) {
      const r = run(bad);
      expect(r.success).toBe(false);
      expect(r.error!.issues.find((i) => i.path[0] === 'phone')?.message).toBe(
        'Enter a valid phone number.',
      );
    }
  });

  it('keeps phone optional', () => {
    const r = run('');
    expect(r.success && r.data.phone).toBe(null);
  });

  it('lets an unchanged legacy value through', () => {
    expect(run('ext 5', { previousPhone: 'ext 5' }).success).toBe(true);
    expect(run('ext 6', { previousPhone: 'ext 5' }).success).toBe(false);
  });
});
