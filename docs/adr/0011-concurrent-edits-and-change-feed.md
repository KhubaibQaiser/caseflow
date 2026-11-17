# ADR-0011 — Handle concurrent edits with version checks and a server change feed

## Title

Check a version on every write, and stream changes to every open screen from an append-only change log over Server-Sent Events

## Status

`proposed`

## Date

2026-11-17

## Context

Spec §8.9 and §7.5. Several people at the firm manage contacts and statuses at the same time (G1, G4).

Today:

- Edits use optimistic concurrency on `updated_at`. A conflict shows a banner with "Reload latest" only. The save stamp stays frozen, and a draft keeps its stamp.
- Moves and reschedules are last write wins. Nobody is told when they overwrite someone else.
- Nobody sees other users' changes without a reload.

Khubaib's requirement: real-time handling that is backend-agnostic. It must work with any backend or database, so clients cannot depend on one vendor's push service.

Unknown: how many people will have the app open at once. v1 assumes one firm's intake team, so tens of connections, not thousands.

## Options considered

### Option 1 — Version checks, plus an SSE stream fed by a change log and LISTEN/NOTIFY (chosen)

- **Pros:**
  - Correctness and freshness are separate layers, so each can be tested alone.
  - Clients talk only to our route and our `ChangeFeed` interface. The log is plain SQL.
  - A missed NOTIFY loses nothing: the stream reads rows from the log, and NOTIFY is only a wake-up.
  - Reconnect is cheap: the client sends `Last-Event-ID` and catches up.
  - Works on Vercel, because SSE is plain HTTP and reconnects after a timeout.
- **Cons:**
  - A log table to write, trim and test. Every write gets a second insert in the same transaction.
  - LISTEN needs a dedicated, unpooled connection per listening instance.

### Option 2 — Version checks, plus client polling of `/api/changes`

- **Pros:** Simplest. No long-lived connections, no LISTEN. Uses the same log and cursor.
- **Cons:** Updates arrive late, by up to one poll interval. Idle tabs still cost requests. A short interval multiplies load.

### Option 3 — Supabase Realtime

- **Pros:** Hosted, and little code.
- **Cons:** Vendor-specific, which breaks the backend-agnostic requirement. Row-level events do not carry our actor or version rules. Replay after a disconnect is limited.

### Option 4 — WebSockets

- **Pros:** Two-way, low latency.
- **Cons:** Needs a stateful server. That does not fit Vercel serverless. We only push server to client, so we do not need two-way.

### Option 5 — Correctness only (version checks, no live feed)

- **Pros:** Smallest change. Stops silent overwrites.
- **Cons:** Users still see stale data until they reload, and they only learn about a change when their own write fails.

## Decision

Option 1. Chosen by Khubaib. One sentence decided it: it is real-time without tying any client to one backend, and the log keeps it correct even when the push signal is lost.

The design has two layers.

**Layer 1: correctness.** Every write is a compare-and-swap on a version.

- Edits send `updated_at`, as they do today.
- Moves send the status the user saw.
- Reschedules send the follow-up date the user saw.
- A stale write returns the typed `conflict` Result. The UI says what happened, for example "Already moved to Closed by Sam", and refreshes.

**Layer 2: freshness.**

- A `ChangeFeed` interface in `lib`.
- Backed by an append-only change log table: monotonic sequence id, contact id, what changed, actor, new version.
- Each write inserts its log row in the same transaction.
- A Next route, `GET /api/changes`, streams Server-Sent Events. It first catches up from the client's cursor (`Last-Event-ID`). Then it uses Postgres LISTEN/NOTIFY only as a wake-up signal and reads the new rows from the log.
- The client reconnects with `Last-Event-ID` after a serverless timeout.

**Backend-agnostic.** Clients only know the route and the interface. The log is plain SQL. LISTEN is an optimisation behind the interface. It can be swapped for polling the log, or for a broker, with no client change.

**Scope: every screen that shows contact data.**

- Pipeline: cards move and counts update. An in-flight optimistic move is reconciled.
- Contacts list: rows update in place. While the user is typing or paging, show "N updates · Refresh".
- Detail: header, follow-up, notes and timeline.
- Edit form: a proactive "Changed by X · Reload latest" banner.
- Facet counts.

## Consequences

- The change log is a new table and migration. It is written in the same transaction as each write, and it needs a retention rule.
- Moves and reschedules gain an expected-value argument (§7.5). Until the concurrency task lands, they stay last write wins.
- The edit conflict offers "Reload latest" only. There is no Overwrite.
- LISTEN needs a dedicated, unpooled connection per listening instance. Supabase's transaction pooler does not support it. Many open SSE streams would exhaust Postgres connections.
- NOTIFY does not fan out across instances or regions. The payload is capped at about 8 KB. It is not durable. The log covers durability, so we send ids, not data.
- **When a queue or broker becomes necessary:** when open streams threaten the connection limit, or when listeners span regions. Then add Redis pub/sub, NATS, or Ably or Pusher behind the same interface. v1 scale (a firm's intake team) does not need one.
- Tests required: a stale move, reschedule and edit each return `conflict`. A client that reconnects with `Last-Event-ID` receives every missed change once. A dropped NOTIFY still delivers on the next wake-up or poll. An in-flight optimistic move reconciles with an incoming change.
- README: a broker, and the LISTEN connection limit, under "With more time" (§13).

## Rejected and why

- **Rejected: client polling.** It works anywhere, but updates arrive late and idle tabs keep sending requests. A shorter interval only moves the cost to the server.
- **Rejected: Supabase Realtime.** It ties every client to one vendor, so the app could not move to another backend without rewriting how screens get updates.
- **Rejected: WebSockets.** They need a server that stays up and holds connections. Our host runs short-lived serverless functions, and we only push in one direction.
- **Rejected: version checks alone.** They stop silent overwrites, but people still look at stale data and only find out when their own save fails.

## Sources

- Server-Sent Events, `Last-Event-ID` — https://html.spec.whatwg.org/multipage/server-sent-events.html — not read yet; verify before accepting
- PostgreSQL NOTIFY (payload limit, delivery) — https://www.postgresql.org/docs/current/sql-notify.html — not read yet; verify before accepting
- Supabase connection pooling modes — https://supabase.com/docs/guides/database/connecting-to-postgres — not read yet; verify before accepting
