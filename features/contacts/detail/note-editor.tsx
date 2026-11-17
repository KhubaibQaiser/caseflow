'use client';

import {
  EditorContent,
  Extension,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FormEvent, Ref } from 'react';
import Bold from 'lucide-react/icons/bold';
import Italic from 'lucide-react/icons/italic';
import Link2 from 'lucide-react/icons/link-2';
import List from 'lucide-react/icons/list';
import ListOrdered from 'lucide-react/icons/list-ordered';
import type { LucideIcon } from 'lucide-react/types';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Input, controlClass } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { safeParseRichDoc } from '@/lib/contracts/rich-text';
import {
  NOTE_MAX_CHARS,
  isAllowedHref,
  richPlainText,
  type RichDoc,
} from '@/lib/contracts/rich-text-core';
import { cn } from '@/utils/cn';

export type NoteDraft = { doc: RichDoc; text: string };
export type NoteEditorHandle = { focus(): void; clear(): void };

// Refuses any change that would take the note past the limit, so typing and pasting stop at it.
// The server counts the plain text again (richPlainText); this only keeps the editor honest.
const LimitText = Extension.create({
  name: 'limitText',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (tr) =>
          !tr.docChanged ||
          tr.doc.textBetween(0, tr.doc.content.size, '\n').length <=
            NOTE_MAX_CHARS,
      }),
    ];
  },
});

// Only what a note may carry; everything else StarterKit brings is off, so it cannot be typed or pasted.
const extensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    trailingNode: false,
    link: {
      autolink: true,
      openOnClick: false,
      defaultProtocol: 'https',
      protocols: ['mailto'],
      isAllowedUri: (url) => isAllowedHref(url),
      shouldAutoLink: (url) =>
        isAllowedHref(url.includes(':') ? url : `https://${url}`),
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        class: null,
      },
    },
  }),
  LimitText,
];

/** "example.com" and "a@b.co" are what people type; give them the scheme the schema wants. */
function normalizeHref(value: string): string {
  const v = value.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return v.includes('@') && !v.includes('/') ? `mailto:${v}` : `https://${v}`;
}

type Tool = {
  name: string;
  label: string;
  keys: string;
  shortcut: string;
  icon: LucideIcon;
  active(e: Editor): boolean;
  run(e: Editor): void;
};

const TOOLS: Tool[] = [
  {
    name: 'bold',
    label: 'Bold',
    keys: 'Control+B Meta+B',
    shortcut: 'Ctrl or Cmd+B',
    icon: Bold,
    active: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    name: 'italic',
    label: 'Italic',
    keys: 'Control+I Meta+I',
    shortcut: 'Ctrl or Cmd+I',
    icon: Italic,
    active: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    name: 'bulletList',
    label: 'Bulleted list',
    keys: 'Control+Shift+8 Meta+Shift+8',
    shortcut: 'Ctrl or Cmd+Shift+8',
    icon: List,
    active: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'orderedList',
    label: 'Numbered list',
    keys: 'Control+Shift+7 Meta+Shift+7',
    shortcut: 'Ctrl or Cmd+Shift+7',
    icon: ListOrdered,
    active: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
];

const toolClass =
  'grid size-8 shrink-0 cursor-pointer place-items-center rounded-ctl text-ink-2 transition-colors duration-150 hover:bg-track hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent forced-colors:aria-pressed:bg-[Highlight] forced-colors:aria-pressed:text-[HighlightText] forced-colors:aria-pressed:forced-color-adjust-none';

type NoteEditorProps = {
  label: string;
  placeholder: string;
  describedBy?: string;
  invalid?: boolean;
  readOnly?: boolean;
  /** A draft saved before sign-in. Untrusted: it is checked against the note schema here. */
  restored?: unknown;
  onChange(draft: NoteDraft): void;
  /** Cmd or Ctrl+Enter. */
  onSubmit(): void;
  /** next/dynamic does not forward `ref`, so the handle travels as an ordinary prop. */
  handle?: Ref<NoteEditorHandle>;
};

/** The note composer: a small formatting toolbar over a contenteditable. Loaded on demand (Tiptap is large). */
export default function NoteEditor({
  label,
  placeholder,
  describedBy,
  invalid,
  readOnly = false,
  restored,
  onChange,
  onSubmit,
  handle,
}: NoteEditorProps) {
  // The editor's handlers outlive a render, so they read the latest callbacks from here.
  const latest = useRef({ onChange, onSubmit });
  useEffect(() => {
    latest.current = { onChange, onSubmit };
  });
  const initialDoc = useMemo(() => {
    const p = safeParseRichDoc(restored);
    return p.success ? p.data : undefined;
  }, [restored]);
  const [linkOpen, setLinkOpen] = useState(false);
  const linkRef = useRef<() => void>(() => {});
  const toolbarId = useId();

  const editor = useEditor({
    extensions,
    content: initialDoc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        'aria-keyshortcuts': 'Control+Enter Meta+Enter',
        class: cn(
          controlClass,
          'min-h-[82px] cursor-text py-2 leading-relaxed wrap-anywhere',
          '[&_p]:m-0 [&_li>p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-5 [&_ol]:ps-5',
          '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-3',
        ),
      },
      handleKeyDown: (_view, event) => {
        const mod = event.metaKey || event.ctrlKey;
        if (mod && event.key === 'Enter') {
          event.preventDefault();
          latest.current.onSubmit();
          return true;
        }
        if (mod && !event.shiftKey && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          linkRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      // Tiptap only emits the nodes and marks enabled above; the server validates the shape again.
      // ProseMirror attrs are prototype-less objects, which a Server Action argument cannot carry
      // (React sends them as "$T" placeholders), so round-trip to plain JSON.
      const doc = JSON.parse(JSON.stringify(e.getJSON())) as RichDoc;
      latest.current.onChange({ doc, text: richPlainText(doc).trim() });
    },
  });

  useEffect(() => {
    editor?.setEditable(!readOnly, false); // not an edit: do not announce it
  }, [editor, readOnly]);

  // Tiptap does not announce its starting content; tell the composer about a restored draft once.
  const announced = useRef(false);
  useEffect(() => {
    if (!editor || !initialDoc || announced.current) return;
    announced.current = true;
    latest.current.onChange({
      doc: initialDoc,
      text: richPlainText(initialDoc).trim(),
    });
  }, [editor, initialDoc]);

  // aria-invalid and aria-describedby ride on the contenteditable itself.
  useEffect(() => {
    const el = editor?.view.dom;
    if (!el) return;
    if (invalid) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
    if (describedBy) el.setAttribute('aria-describedby', describedBy);
    else el.removeAttribute('aria-describedby');
  }, [editor, invalid, describedBy]);

  useImperativeHandle(
    handle,
    () => ({
      focus: () => editor?.commands.focus('end'),
      clear: () => editor?.commands.clearContent(true),
    }),
    [editor],
  );

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      empty: e?.isEmpty ?? true,
      pressed: TOOLS.map((t) => (e ? t.active(e) : false)),
      link: e?.isActive('link') ?? false,
      href: (e?.getAttributes('link').href as string | undefined) ?? '',
    }),
  });

  useEffect(() => {
    linkRef.current = () => setLinkOpen(true);
  });

  if (!editor)
    // Between the code landing and the editor existing: hold the space so nothing shifts.
    return <div aria-hidden className="h-[122px]" />;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="toolbar"
        id={toolbarId}
        aria-label="Formatting"
        className="flex flex-wrap items-center gap-0.5"
      >
        {TOOLS.map((t, i) => (
          <Tooltip key={t.name} content={`${t.label} (${t.shortcut})`}>
            <button
              type="button"
              aria-label={t.label}
              aria-pressed={state?.pressed[i] ?? false}
              aria-keyshortcuts={t.keys}
              disabled={readOnly}
              // Keep the selection in the editor while a button is pressed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => t.run(editor)}
              className={toolClass}
            >
              <t.icon aria-hidden className="size-4" />
            </button>
          </Tooltip>
        ))}
        <Tooltip content="Link (Ctrl or Cmd+K)">
          <button
            type="button"
            aria-label="Link"
            aria-pressed={state?.link ?? false}
            aria-expanded={linkOpen}
            aria-keyshortcuts="Control+K Meta+K"
            disabled={readOnly}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLinkOpen((o) => !o)}
            className={toolClass}
          >
            <Link2 aria-hidden className="size-4" />
          </button>
        </Tooltip>
      </div>
      {linkOpen && (
        <LinkForm
          editor={editor}
          current={state?.href ?? ''}
          onClose={() => {
            setLinkOpen(false);
            editor.commands.focus();
          }}
        />
      )}
      <div className="relative">
        <EditorContent editor={editor} />
        {state?.empty && (
          <span
            aria-hidden
            className="text-ink-2 sm:text-13 pointer-events-none absolute start-2.5 top-2 text-base"
          >
            {placeholder}
          </span>
        )}
      </div>
    </div>
  );
}

function LinkForm({
  editor,
  current,
  onClose,
}: {
  editor: Editor;
  current: string;
  onClose(): void;
}) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);

  function apply(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation(); // the composer is not a form, but keep Enter out of it
    const href = normalizeHref(value);
    if (!isAllowedHref(href)) {
      setError('Use an http, https or mailto link.');
      return;
    }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive('link'))
      chain
        .insertContent({
          type: 'text',
          text: href.replace(/^mailto:/, ''),
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    else chain.extendMarkRange('link').setLink({ href }).run();
    onClose();
  }

  return (
    <form onSubmit={apply} className="flex flex-wrap items-start gap-2">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <Input
          ref={field}
          type="text"
          inputMode="url"
          aria-label="Link address"
          placeholder="example.com"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onClose();
            }
          }}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
        />
        {error && <ErrorText id={errorId}>{error}</ErrorText>}
      </div>
      <Button type="submit" variant="primary" size="sm">
        Apply
      </Button>
      {current && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            onClose();
          }}
        >
          Remove link
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
    </form>
  );
}
