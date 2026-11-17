import 'server-only';
import {
  MATTER_TYPES,
  REFERRAL_SOURCES,
  type MatterType,
  type ReferralSource,
  type Status,
} from '@/lib/contracts/enums';
import type { ContactRow } from '@/lib/contracts/contact';
import { addDaysDateOnly } from '@/lib/dates/date-only';

const FIRST = [
  'Kevin',
  'Marisol',
  'Daniel',
  'Hana',
  'Aisha',
  'Priya',
  'Luis',
  'Grace',
  'Omar',
  'Rebecca',
  'Tomás',
  'Brianna',
  'Samuel',
  'Ines',
  'Victor',
  'Noor',
  'Elena',
  'Marcus',
  'Yuki',
  'Carmen',
];
const LAST = [
  "O'Donnell",
  'Ortega',
  'Kessler',
  'Yoshida',
  'Bello',
  'Raman',
  'Carrillo',
  'Whitfield',
  'Haddad',
  'Lindqvist',
  'Herrera',
  'Cole',
  'Okafor',
  'Moreau',
  'Nakamura',
  'Banerjee',
  'Petrov',
  'Hughes',
  'Tanaka',
  'Silva',
  'Brooks',
  'Duarte',
];

// Small seeded PRNG (mulberry32) so the fixtures are deterministic.
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeFixtureRows(n: number, today: string): ContactRow[] {
  const r = rng(42);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
  const rows: ContactRow[] = [];
  for (let i = 0; i < n; i++) {
    const first = FIRST[i % FIRST.length];
    // Stride by a coprime step so names don't repeat in lock-step.
    const last = LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length];
    // One 120-character name (the maximum), so truncation is visible in the fake data (spec 8.9).
    const fullName =
      i === 11
        ? `${first} Alexandra Montgomery-Featherstonehaugh de la Cruz Vasquez-Worthington ${last} of Upper Castleford and Little Wexcombe`.slice(
            0,
            120,
          )
        : `${first} ${last}`;
    const slug = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
    const roll = r();
    const status: Status =
      roll < 0.4 ? 'lead' : roll < 0.75 ? 'active' : 'closed';
    const matterType: MatterType = pick(MATTER_TYPES);
    const referralSource: ReferralSource | null =
      r() < 0.1 ? null : pick(REFERRAL_SOURCES);
    const open = status !== 'closed';

    // ~2% overdue and ~1% due today (open rows only); the rest later or none.
    const u = r();
    let followUpOn: string | null = null;
    if (open) {
      if (u < 0.03)
        followUpOn = addDaysDateOnly(today, -(1 + Math.floor(r() * 9)));
      else if (u < 0.045) followUpOn = today;
      else if (u < 0.7)
        followUpOn = addDaysDateOnly(today, 1 + Math.floor(r() * 30));
    } else if (u < 0.3) {
      followUpOn = addDaysDateOnly(today, -Math.floor(r() * 60));
    }
    const hasEmail = r() < 0.8;
    const hasPhone = !hasEmail || r() < 0.7;
    // Created on T-2 or earlier (UTC), so it is in the past in every zone where today is T.
    const created = addDaysDateOnly(today, -2 - Math.floor(r() * 180));
    const hh = String(Math.floor(r() * 24)).padStart(2, '0');
    const mm = String(Math.floor(r() * 60)).padStart(2, '0');
    const createdAt = `${created}T${hh}:${mm}:00.000Z`;
    // UTC+14 reaches T first, at T-1 10:00Z; updates never pass that instant.
    const latest = Date.parse(`${addDaysDateOnly(today, -1)}T10:00:00.000Z`);
    const updatedAt = new Date(
      Math.min(Date.parse(createdAt) + Math.floor(r() * 20 * 86400000), latest),
    ).toISOString();

    const overdue = open && followUpOn !== null && followUpOn < today;
    rows.push({
      id: `c-${String(i + 1).padStart(5, '0')}`,
      fullName,
      email: hasEmail ? `${slug}${i}@example.com` : null,
      phone: hasPhone
        ? `(512) 555-${String(1000 + ((i * 37) % 9000)).padStart(4, '0')}`
        : null,
      matterType,
      referralSource,
      status,
      followUpOn,
      createdAt,
      updatedAt,
      urgency:
        followUpOn === null
          ? 'none'
          : overdue
            ? 'overdue'
            : open && followUpOn === today
              ? 'today'
              : 'later',
      daysOverdue:
        overdue && followUpOn
          ? Math.round((Date.parse(today) - Date.parse(followUpOn)) / 86400000)
          : null,
    });
  }
  return rows;
}
