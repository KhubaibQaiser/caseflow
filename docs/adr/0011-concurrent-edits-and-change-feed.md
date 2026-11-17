# ADR-0011 — Handle concurrent edits with version checks and a server change feed

## Title

Check a version on every write, and stream changes to every open screen from an append-only change log over Server-Sent Events

## Status

`accepted` (2026-11-17). Implementation is deferred past v1: v1 version-checks contact edits only; moves and reschedules are last-write-wins, and screens refresh on navigation. This ADR is the design for the next step.

## Date

2026-11-17

## Context

Spec decision §4 #21, §8.9 and §7.5. Several people at the firm manage contacts and statuses at the same time (G1, G4).

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
  - A dedicated `pg` LISTEN connection per app instance (session pooler or direct). The scaling risk is many concurrent serverless instances, each holding one. That is when a broker comes in.
- NOTIFY only reaches connections on the same database, not replicas and not other databases. The payload is under 8000 bytes by default. It is not durable. The log covers durability, so we send ids, not data.
- The advisory lock serialises log writes. That is fine at v1 volume, and it is the first thing to revisit if writes grow.
- Each open tab holds a serverless function invocation until it is closed and reconnected.
- **When a queue or broker becomes necessary:** when many concurrent instances exhaust connections, or when listeners must span databases or regions. Then add Redis pub/sub, NATS, or Ably or Pusher behind the same interface. v1 scale (a firm's intake team) does not need one.
- Tests required: two overlapping transactions write log rows and commit out of order, and a client reading in between skips nothing. A stale move, reschedule and edit each return `conflict`. A client that reconnects with `Last-Event-ID` receives every missed change once. A dropped NOTIFY still delivers on the next wake-up or poll. An in-flight optimistic move reconciles with an incoming change.
- README: a broker, and the LISTEN connection and serverless-instance limits, under "With more time" (§13).

## Rejected and why

- **Rejected: client polling.** It works anywhere, but updates arrive late and idle tabs keep sending requests. A shorter interval only moves the cost to the server.
- **Rejected: Supabase Realtime.** It ties every client to one vendor, so the app could not move to another backend without rewriting how screens get updates.
- **Rejected: WebSockets.** They need a server that stays up and holds connections. Our host runs short-lived serverless functions, and we only push in one direction.
- **Rejected: a snapshot-xmin cursor.** It can be made exact, but it is hard to explain, hard to test, and ties the cursor to Postgres internals.
- **Rejected: re-reading a window behind the cursor.** It narrows the skipped-row gap but never closes it, and it sends duplicates the client must filter.
- **Rejected: version checks alone.** They stop silent overwrites, but people still look at stale data and only find out when their own save fails.

## Sources

- Server-Sent Events, `Last-Event-ID` — https://html.spec.whatwg.org/multipage/server-sent-events.html — not read yet; verify before accepting
- PostgreSQL NOTIFY (payload limit, delivery) — https://www.postgresql.org/docs/current/sql-notify.html — not read yet; verify before accepting
- Supabase connection pooling modes — https://supabase.com/docs/guides/database/connecting-to-postgres — not read yet; verify before accepting
