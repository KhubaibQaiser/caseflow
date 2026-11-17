'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Textarea } from '@/components/ui/textarea';
import { Can } from '@/lib/auth/permissions-context';
import type { Note } from '@/lib/contracts/contact';
import { ROLE_LABEL } from '@/lib/contracts/permissions';
import type { Result } from '@/lib/contracts/result';
import { formatTimestamp, formatTimestampFull } from '@/lib/dates/labels';

import { attempt, useSessionExpired } from './action-result';
import { Panel } from './panel';

const MAX = 2000;
const DRAFT_KEY = 'caseflowNoteDraft';

// Browser-only and pure, so the lazy initial state survives StrictMode's double call.
function readDraft(): string {
  if (typeof window === 'undefined') return '';
  const draft: unknown = window.history.state?.[DRAFT_KEY];
  return typeof draft === 'string' ? draft : '';
}

type Failure = { message: string; retry: boolean };

function NoteItem({ note, tz }: { note: Note; tz: string }) {
  return (
    <article className="border-line-soft border-t py-2.5 first:border-t-0 first:pt-0">
      <p className="text-ink-2 m-0 text-xs">
        {note.author.name} · {ROLE_LABEL[note.author.role]} ·{' '}
        <time
          dateTime={note.createdAt}
          title={formatTimestampFull(note.createdAt, tz)}
          className="tnum"
        >
          {formatTimestamp(note.createdAt, tz)}
        </time>
      </p>
      <p className="text-13 m-0 mt-1 leading-relaxed wrap-anywhere whitespace-pre-wrap">
        {note.body}
      </p>
    </article>
  );
}

/** Newest first. The composer is for roles with notes.write; everyone else reads. */
export function Notes({
  notes,
  onAdd,
  tz,
}: {
  notes: Note[];
  onAdd(body: string): Promise<Result<Note>>;
  tz: string;
}) {
  const [body, setBody] = useState(readDraft);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [announce, setAnnounce] = useState('');
  // Notes saved here, shown until the server's list (after revalidation) includes them.
  const [added, setAdded] = useState<Note[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);
  // State lags a render behind a fast second keypress; the ref doesn't.
  const inflight = useRef(false);
  const errorId = useId();
  const expired = useSessionExpired();

  // Back from sign-in after a session expiry: the history entry still carries the note.
  useEffect(() => {
    if (!readDraft()) return;
    const rest = Object.fromEntries(
      Object.entries(window.history.state).filter(([k]) => k !== DRAFT_KEY),
    );
    window.history.replaceState(rest, '');
  }, []);

  const text = body.trim();
  const shown = [
    ...added.filter((a) => !notes.some((n) => n.id === a.id)),
    ...notes,
  ];

  async function submit() {
    if (inflight.current || !text) return;
    inflight.current = true;
    setPending(true);
    setFailure(null);
    setAnnounce('');
    const result = await attempt(() => onAdd(text), 'save the note');
    inflight.current = false;
    setPending(false);
    if (result.ok) {
      setAdded((list) => [result.data, ...list]);
      setBody('');
      setAnnounce('Note added.');
      field.current?.focus();
      return;
    }
    const { code, message, fieldErrors } = result.error;
    if (code === 'unauthorized') {
      window.history.replaceState(
        { ...window.history.state, [DRAFT_KEY]: body },
        '',
      );
      expired();
    } else if (code === 'forbidden') {
      setFailure({
        message: "You don't have permission to add notes.",
        retry: false,
      });
    } else if (code === 'validation') {
      setFailure({ message: fieldErrors?.body ?? message, retry: false });
    } else {
      setFailure({ message, retry: true });
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <Panel title="Notes" count={shown.length}>
      <Can
        p="notes.write"
        fallback={
          <p className="border-line bg-panel rounded-ctl text-13 text-ink-2 m-0 mb-3 border px-3 py-2.5">
            Viewers can read notes but can&apos;t add them.
          </p>
        }
      >
        <div className="mb-3 flex flex-col gap-2">
          <Textarea
            ref={field}
            aria-label="Add a note"
            aria-keyshortcuts="Control+Enter Meta+Enter"
            aria-invalid={failure ? true : undefined}
            aria-describedby={failure ? errorId : undefined}
            placeholder="Add a note…"
            rows={3}
            maxLength={MAX}
            value={body}
            readOnly={pending}
            onChange={(e) => {
              setBody(e.target.value);
              setAnnounce('');
            }}
            onKeyDown={onKeyDown}
          />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-ink-2 text-xs">
              Visible to the whole team. Ctrl or Cmd+Enter saves.
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={!text && !pending}
              pending={pending}
              pendingLabel="Saving…"
              onClick={() => void submit()}
            >
              Save note
            </Button>
          </div>
          {failure && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
            >
              <ErrorText id={errorId}>{failure.message}</ErrorText>
              {failure.retry && (
                <Button
                  variant="ghost"
                  size="sm"
                  pending={pending}
                  onClick={() => void submit()}
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>
      </Can>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {shown.length === 0 ? (
        <p className="text-13 text-ink-2 m-0">No notes yet.</p>
      ) : (
        <div>
          {shown.map((n) => (
            <NoteItem key={n.id} note={n} tz={tz} />
          ))}
        </div>
      )}
    </Panel>
  );
}
