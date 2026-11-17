export const STATUSES = ['lead', 'active', 'closed'] as const;
export type Status = (typeof STATUSES)[number];

export const MATTER_TYPES = [
  'personal_injury',
  'family',
  'immigration',
  'employment',
  'estate_planning',
  'criminal_defense',
] as const;
export type MatterType = (typeof MATTER_TYPES)[number];

export const REFERRAL_SOURCES = [
  'google_search',
  'past_client',
  'attorney_referral',
  'bar_referral',
  'website_form',
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export const FOLLOW_UP_FILTERS = [
  'overdue',
  'dueToday',
  'next7Days',
  'none',
] as const;
type FollowUpFilter = (typeof FOLLOW_UP_FILTERS)[number];

export const ACTIVITY_TYPES = [
  'created',
  'updated',
  'status_changed',
  'follow_up_changed',
  'note_added',
  'deleted',
  'restored',
] as const;

export const STATUS_LABEL: Record<Status, string> = {
  lead: 'Lead',
  active: 'Active',
  closed: 'Closed',
};

export const MATTER_TYPE_LABEL: Record<MatterType, string> = {
  personal_injury: 'Personal injury',
  family: 'Family',
  immigration: 'Immigration',
  employment: 'Employment',
  estate_planning: 'Estate planning',
  criminal_defense: 'Criminal defense',
};

export const REFERRAL_SOURCE_LABEL: Record<ReferralSource, string> = {
  google_search: 'Google search',
  past_client: 'Past client',
  attorney_referral: 'Attorney referral',
  bar_referral: 'Bar referral',
  website_form: 'Website form',
};

export const FOLLOW_UP_LABEL: Record<FollowUpFilter, string> = {
  overdue: 'Overdue',
  dueToday: 'Due today',
  next7Days: 'Next 7 days',
  none: 'No follow-up',
};
