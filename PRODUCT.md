# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 App Router (Server Components for reads, Server Actions for writes and sign-in), React 19, TypeScript, Tailwind CSS 4 with CSS-variable tokens, Radix primitives (custom styled, no shadcn defaults), TanStack Table + TanStack Virtual, React Hook Form + Zod, nuqs, date-fns + react-day-picker, sonner, lucide-react, CSS-only transitions. Supabase (Postgres, Auth, RLS). Deployed to Vercel from GitHub Actions.

## Users

A law firm's client intake team. Two equal primary users:

- **Intake coordinator**: on the phone all day, captures new enquiries fast, chases follow-ups, moves people from Lead to Active.
- **Intake manager / attorney**: reviews pipeline health, triages, decides which matters the firm takes on.

Secondary audience: hiring reviewers evaluating the case study (Senior Frontend Engineer). They arrive cold via a live link and must reach a working app in seconds.

## Product Purpose

Caseflow is a lightweight CRM for tracking prospective clients from first contact to retained (or closed). Success: no enquiry is lost, no follow-up is missed, and anyone on the team can see where every prospective client stands.

## Positioning

Built for legal intake specifically, not generic sales: contacts carry a matter type, referral source and next follow-up date; urgency (overdue follow-ups) drives ordering on the board; the activity timeline is written by the database, so it is a trustworthy record of what happened.

## Operating Context

- Coordinators work while on calls: search, capture and update must be fast and keyboard-friendly.
- Workspaces hold thousands of contacts (seeded ~2,500 per workspace). Lists are server-paginated (default 250 rows, options 25/50/100/250/500) and virtualized.
- Advanced filters (status, matter type, referral source, follow-up window, created date) live in a sidebar with an active-filter count and removable chips; all state is in the URL.
- Access is by invitation only. There's no sign-up: reviewers get pre-seeded accounts, one per role. **Admin** has full access; **Viewer** is read-only. Everyone shares one firm workspace. Viewers see write actions disabled with the reason.
- Used on desktop primarily; must remain usable on mobile.

## Capabilities and Constraints

- Contacts list (search, filter, sort, pagination), contact detail (fields, notes, activity timeline), create/edit forms with validation, pipeline board (Lead / Active / Closed) with a "Move to…" menu (no drag and drop).
- Loading, empty and error states on every screen.
- Contact fields: full name (required); email and phone (at least one required); matter type (Personal injury, Family, Immigration, Employment, Estate planning, Criminal defense); referral source (Google search, Past client, Attorney referral, Bar referral, Website form); next follow-up (date, not in the past); matter summary (≤1000 chars); status.
- Terminology: "contact", "matter", "follow-up", "Lead / Active / Closed". Not "deal", "opportunity" or "customer".
- Out of scope (documented as future work): drag and drop, global search, keyboard shortcuts, roles beyond Admin and Viewer, sign-up and password reset, assigned attorney, conflict checks, documents, PR previews.
- Deadline: 24 hours from brief; functional deliverables before polish.

## Brand Commitments

- Name: **Caseflow**.
- Voice: crisp power-tool. Terse, functional, specific. "No results." "Save failed. Retry." No cheerfulness, no filler, no marketing tone.
- Visual direction chosen: soft sage, rounded, people-first ("Intake Desk" mockup), to be refined. Generic AI-looking UI and copy count against the assessment.

## Evidence on Hand

None. All data is generated seed data; no real clients, testimonials or metrics exist and none may be fabricated as real.

## Product Principles

1. Urgency first: what needs a call today is always the most visible thing.
2. Never lose work: failed saves keep the user's input; destructive actions offer Undo.
3. Honest state: every screen tells the truth about loading, emptiness and failure.
4. Fast at volume: thousands of rows stay snappy; filters compensate for virtualization.
5. Plain over clever: known patterns, precise details.

## Accessibility & Inclusion

WCAG 2.2 AA target. Known trade-off: virtualized lists break browser find (Ctrl+F) and need aria-rowcount/aria-rowindex; mitigated by advanced filters. Every drag-like interaction has a non-drag alternative (menu). Respect prefers-reduced-motion.
