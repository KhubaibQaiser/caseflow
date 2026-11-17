'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Can, usePermission } from '@/lib/auth/permissions-context';
import type { Note } from '@/lib/contracts/contact';
import type { Result } from '@/lib/contracts/result';
import { NOTE_MAX_CHARS, type RichDoc } from '@/lib/contracts/rich-text-core';
import { formatTimestamp, formatTimestampFull } from '@/lib/dates/labels';

import { attempt, useSessionExpired } from './action-result';
import type { NoteDraft, NoteEditorHandle } from './note-editor';
import { Panel } from './panel';
import { RichText } from './rich-text';

const COUNTER_FROM = Math.floor(NOTE_MAX_CHARS * 0.8) + 1;
const DRAFT_KEY = 'caseflowNoteDraft';

// Browser-only and pure, so the lazy initial state survives StrictMode's double call. It is only a
// candidate: the editor chunk checks it against the note schema (Zod stays out of this bundle).
function readDraft(): unknown {
  if (typeof window === 'undefined') return null;
  return window.history.state?.[DRAFT_KEY] ?? null;
}

// Tiptap is large and the composer is not needed for first paint, so it loads after hydration.
// The placeholder holds the editor's height, so nothing shifts when it lands.
const NoteEditor = dynamic(() => import('./note-editor'), {
  ssr: false,
  loading: () => <div aria-hidden className="h-28.25" />,
});

const FAILED = 'Note not saved. Check your connection and save again.';

type Failure = { message: string };

function NoteItem({ note, tz }: { note: Note; tz: string }) {
  return (
    <article className="border-line-soft border-t py-2.5 first:border-t-0 first:pt-0">
      <p className="text-ink-2 m-0 text-xs">
        {note.author.name} ·{' '}
        <time
          dateTime={note.createdAt}
          title={formatTimestampFull(note.createdAt, tz)}
          className="tnum"
        >
          {formatTimestamp(note.createdAt, tz)}
        </time>
      </p>
      <div className="text-13 mt-1 leading-relaxed wrap-anywhere">
        <RichText doc={note.bodyJson} />
      </div>
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
  onAdd(doc: RichDoc): Promise<Result<Note>>;
  tz: string;
}) {
  const [restored] = useState(readDraft);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [announce, setAnnounce] = useState('');
  // Notes saved here, shown until the server's list (after revalidation) includes them.
  const [added, setAdded] = useState<Note[]>([]);
  const editor = useRef<NoteEditorHandle>(null);
  // State lags a render behind a fast second keypress; the ref doesn't.
  const inflight = useRef(false);
  const errorId = useId();
  const counterId = useId();
  const canWrite = usePermission('notes.write');
  const expired = useSessionExpired();
  const pathname = usePathname();

  // Back from sign-in after a session expiry: the history entry still carries the note.
  useEffect(() => {
    if (readDraft() === null) return;
    const rest = Object.fromEntries(
      Object.entries(window.history.state).filter(([k]) => k !== DRAFT_KEY),
    );
    window.history.replaceState(rest, '');
  }, []);

  const text = draft?.text ?? '';
  const length = text.length;
  const showCounter = length >= COUNTER_FROM;
  const shown = [
    ...added.filter((a) => !notes.some((n) => n.id === a.id)),
    ...notes,
  ];

  async function submit() {
    if (inflight.current || !draft || !text) return;
    inflight.current = true;
    setPending(true);
    setFailure(null);
    setAnnounce('');
    const result = await attempt(() => onAdd(draft.doc), 'save the note');
    inflight.current = false;
    setPending(false);
    if (result.ok) {
      setAdded((list) => [result.data, ...list]);
      setDraft(null);
      editor.current?.clear();
      setAnnounce('Note added.');
      editor.current?.focus();
      return;
    }
    const { code, message, fieldErrors } = result.error;
    if (code === 'unauthorized') {
      window.history.replaceState(
        { ...window.history.state, [DRAFT_KEY]: draft.doc },
        '',
      );
      // Tells /login that Back leads to this draft. Loaded here, on the rare path: the marker pulls in
      // Zod, which would put 30 kB on every first load of this page.
      const { markReturn } = await import('@/lib/auth/return-marker');
      markReturn(pathname);
      expired();
    } else if (code === 'forbidden') {
      setFailure({ message: "You don't have permission to add notes." });
    } else if (code === 'validation') {
      setFailure({ message: fieldErrors?.body ?? message });
    } else {
      // Whatever the cause, the draft is kept and Save note sends it again.
      setFailure({ message: FAILED });
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
          {/* One frame: toolbar, editor and footer. Focus anywhere inside lights all of it. */}
          <div
            data-note-composer
            className="border-control-border bg-surface rounded-ctl focus-within:border-accent focus-within:outline-accent has-[[aria-invalid=true]]:border-overdue has-[[aria-invalid=true]]:focus-within:outline-overdue max-w-2xl border transition-colors duration-150 focus-within:outline-1 focus-within:outline-offset-0 focus-within:outline-solid"
          >
            <NoteEditor
              handle={editor}
              label="Add a note"
              placeholder="Add a note…"
              describedBy={
                [failure && errorId, showCounter && counterId]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              invalid={failure !== null}
              readOnly={pending}
              restored={restored}
              onChange={(d) => {
                setDraft(d);
                setFailure(null); // editing again retires the last error
                // Typing retires the message; the editor's own clear after a save must not.
                if (d.text) setAnnounce('');
              }}
              onSubmit={() => void submit()}
            />
            <div className="border-line-soft flex items-center justify-between gap-3 border-t py-2 ps-3 pe-2">
              <span className="text-ink-2 text-xs leading-snug">
                Notes are visible to the whole intake team.
                <span className="pointer-coarse:hidden">
                  {' '}
                  Ctrl or Cmd+Enter saves.
                </span>
                {showCounter && (
                  <span
                    id={counterId}
                    className={
                      length >= NOTE_MAX_CHARS
                        ? 'tnum text-ink ms-2 font-semibold'
                        : 'tnum ms-2'
                    }
                  >
                    {length.toLocaleString('en-US')} /{' '}
                    {NOTE_MAX_CHARS.toLocaleString('en-US')}
                  </span>
                )}
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
          </div>
          {failure && (
            <div role="alert">
              <ErrorText id={errorId}>{failure.message}</ErrorText>
            </div>
          )}
        </div>
      </Can>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {shown.length === 0 ? (
        // Writers get the composer above as the invitation; only readers need telling.
        !canWrite && <p className="text-13 text-ink-2 m-0">No notes yet.</p>
      ) : (
        <div className="max-w-2xl">
          {shown.map((n) => (
            <NoteItem key={n.id} note={n} tz={tz} />
          ))}
        </div>
      )}
    </Panel>
  );
}
