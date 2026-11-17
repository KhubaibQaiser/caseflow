import './zod-config';
import { z } from 'zod';
import {
  ACTIVITY_TYPES,
  MATTER_TYPES,
  REFERRAL_SOURCES,
  STATUSES,
} from './enums';
import { ROLES } from './permissions';
import { RichDocSchema } from './rich-text';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Blank or missing form values become null; strings are trimmed.
const blankToNull = (v: unknown) => {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t === '' ? null : t;
};

export function makeContactInputSchema(opts: {
  today: string;
  previousFollowUpOn?: string | null;
}) {
  return (
    z
      .object({
        fullName: z
          .string('Enter a full name.')
          .trim()
          .min(1, 'Enter a full name.')
          .min(2, 'Name must be at least 2 characters.')
          .max(120, 'Name must be 120 characters or fewer.'),
        email: z.preprocess(
          blankToNull,
          z.email('Enter a valid email address.').nullable(),
        ),
        phone: z.preprocess(
          blankToNull,
          z
            .string()
            .max(20, 'Phone must be 20 characters or fewer.')
            .refine(
              (p) => p.replace(/\D/g, '').length >= 7,
              'Enter at least 7 digits.',
            )
            .nullable(),
        ),
        matterType: z.enum(MATTER_TYPES, 'Choose a matter type.'),
        referralSource: z.preprocess(
          blankToNull,
          z.enum(REFERRAL_SOURCES).nullable(),
        ),
        status: z.enum(STATUSES).default('lead'),
        followUpOn: z.preprocess(
          blankToNull,
          z.iso.date('Use YYYY-MM-DD.').nullable(),
        ),
        summary: z.preprocess(
          blankToNull,
          z
            .string()
            .max(1000, 'Summary must be 1000 characters or fewer.')
            .nullable(),
        ),
      })
      // Runs even when a field failed, so the form shows every error at once (spec 8.5).
      // A failed field keeps its raw input here, so each rule checks the shape it needs.
      .superRefine(
        (v, ctx) => {
          if (v.email == null && v.phone == null) {
            ctx.addIssue({
              code: 'custom',
              path: ['contactMethod'],
              message:
                "Add an email or a phone number. Intake can't follow up without one.",
            });
          }
          if (
            typeof v.followUpOn === 'string' &&
            DATE.test(v.followUpOn) &&
            v.followUpOn !== (opts.previousFollowUpOn ?? null) &&
            v.followUpOn < opts.today
          ) {
            ctx.addIssue({
              code: 'custom',
              path: ['followUpOn'],
              message: 'Follow-up date cannot be in the past.',
            });
          }
        },
        { when: (p) => typeof p.value === 'object' && p.value !== null },
      )
  );
}
export type ContactInput = z.infer<ReturnType<typeof makeContactInputSchema>>;

export const ContactRowSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  matterType: z.enum(MATTER_TYPES),
  referralSource: z.enum(REFERRAL_SOURCES).nullable(),
  status: z.enum(STATUSES),
  followUpOn: z.string().regex(DATE).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  urgency: z.enum(['overdue', 'today', 'later', 'none']),
  daysOverdue: z.number().nullable(),
});
export type ContactRow = z.infer<typeof ContactRowSchema>;

export const NoteSchema = z.object({
  id: z.string(),
  /** Plain-text mirror of the document (search, previews). */
  body: z.string(),
  bodyJson: RichDocSchema,
  createdAt: z.string(),
  author: z.object({ name: z.string(), role: z.enum(ROLES) }),
});
export type Note = z.infer<typeof NoteSchema>;

export const ActivitySchema = z.object({
  id: z.string(),
  type: z.enum(ACTIVITY_TYPES),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  actor: z.object({ name: z.string() }),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const ContactDetailSchema = ContactRowSchema.extend({
  summary: z.string().nullable(),
  notes: z.array(NoteSchema),
  activities: z.array(ActivitySchema),
});
export type ContactDetail = z.infer<typeof ContactDetailSchema>;
