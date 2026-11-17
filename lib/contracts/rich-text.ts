import { z } from 'zod';

// The only formatting a note may carry (Tiptap JSON): bold, italic, links, bullet and numbered
// lists, hard breaks. Everything is a strict object, so an unknown node, mark or attribute is
// rejected rather than stored. The server validates with this before anything is written.

export const NOTE_MAX_CHARS = 2000;
const MAX_NODES = 500;
const MAX_LIST_DEPTH = 5;
const HREF_MAX = 2048;

/** http, https and mailto only; no whitespace or control characters, no relative or scheme-less values. */
export function isAllowedHref(href: string): boolean {
  if (href.length === 0 || href.length > HREF_MAX) return false;
  if (/[\s\u0000-\u001f\u007f]/.test(href)) return false;
  try {
    const u = new URL(href);
    if (u.protocol === 'http:' || u.protocol === 'https:')
      return u.hostname !== '';
    return u.protocol === 'mailto:' && u.pathname !== '';
  } catch {
    return false;
  }
}

export type RichMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'link'; attrs: { href: string } };
export type RichText = { type: 'text'; text: string; marks?: RichMark[] };
export type RichInline = RichText | { type: 'hardBreak' };
export type RichParagraph = { type: 'paragraph'; content?: RichInline[] };
export type RichListItem = {
  type: 'listItem';
  content: (RichParagraph | RichList)[];
};
export type RichList =
  | { type: 'bulletList'; content: RichListItem[] }
  | {
      type: 'orderedList';
      attrs?: { start: number } | undefined;
      content: RichListItem[];
    };
export type RichBlock = RichParagraph | RichList;
export type RichDoc = { type: 'doc'; content: RichBlock[] };

const Href = z
  .string()
  .refine(isAllowedHref, 'Link must be http, https or mailto.');

// Tiptap's Link also serialises target, rel and class; accept only its own values and keep just the href.
const LinkMark = z.strictObject({
  type: z.literal('link'),
  attrs: z
    .strictObject({
      href: Href,
      target: z.literal('_blank').nullish(),
      rel: z.literal('noopener noreferrer nofollow').nullish(),
      class: z.null().nullish(),
    })
    .transform((a) => ({ href: a.href })),
});

const Mark = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('bold') }),
  z.strictObject({ type: z.literal('italic') }),
  LinkMark,
]);

const Text = z.strictObject({
  type: z.literal('text'),
  text: z.string().min(1).max(10_000),
  marks: z
    .array(Mark)
    .max(3)
    .refine(
      (m) => new Set(m.map((x) => x.type)).size === m.length,
      'Duplicate marks.',
    )
    .optional(),
});

const Inline = z.discriminatedUnion('type', [
  Text,
  z.strictObject({ type: z.literal('hardBreak') }),
]);

const Paragraph = z.strictObject({
  type: z.literal('paragraph'),
  content: z.array(Inline).max(200).optional(),
});

// Tiptap writes `start` (and `type: null`) on an ordered list; 1 is the default and is not kept.
const OrderedAttrs = z
  .strictObject({
    start: z.number().int().min(1).max(9999).optional(),
    type: z.null().optional(),
  })
  .transform((a) =>
    a.start && a.start !== 1 ? { start: a.start } : undefined,
  );

const List: z.ZodType<RichList, unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('bulletList'),
      content: z.array(ListItem).min(1).max(100),
    }),
    z.strictObject({
      type: z.literal('orderedList'),
      attrs: OrderedAttrs.optional(),
      content: z.array(ListItem).min(1).max(100),
    }),
  ]),
);

const ListItem: z.ZodType<RichListItem, unknown> = z.lazy(() =>
  z.strictObject({
    type: z.literal('listItem'),
    content: z
      .array(z.union([Paragraph, List]))
      .min(1)
      .max(20)
      .refine(
        (c) => c[0]?.type === 'paragraph',
        'A list item starts with a paragraph.',
      ),
  }),
);

type Shape = { nodes: number; depth: number };
function measure(block: RichBlock, depth: number): Shape {
  if (block.type === 'paragraph')
    return { nodes: 1 + (block.content?.length ?? 0), depth };
  let nodes = 1;
  let deepest = depth + 1;
  for (const item of block.content) {
    nodes += 1;
    for (const child of item.content) {
      const m = measure(child, depth + 1);
      nodes += m.nodes;
      deepest = Math.max(deepest, m.depth);
    }
  }
  return { nodes, depth: deepest };
}

export const RichDocSchema: z.ZodType<RichDoc, unknown> = z
  .strictObject({
    type: z.literal('doc'),
    content: z
      .array(z.union([Paragraph, List]))
      .min(1)
      .max(200),
  })
  .refine((d) => {
    let nodes = 1;
    let depth = 0;
    for (const b of d.content) {
      const m = measure(b, 0);
      nodes += m.nodes;
      depth = Math.max(depth, m.depth);
    }
    return nodes <= MAX_NODES && depth <= MAX_LIST_DEPTH;
  }, 'Too large or too deeply nested.');

function inlineText(content: RichInline[] | undefined): string {
  return (content ?? [])
    .map((n) => (n.type === 'hardBreak' ? '\n' : n.text))
    .join('');
}

function lines(block: RichBlock): string[] {
  if (block.type === 'paragraph') return inlineText(block.content).split('\n');
  return block.content.flatMap((item) => item.content.flatMap(lines));
}

/** The note as plain text, one line per paragraph and list item, with no markers or formatting. Mirrors `notes.body`. */
export function richPlainText(doc: RichDoc): string {
  return doc.content
    .flatMap(lines)
    .filter((l) => l.trim() !== '')
    .join('\n');
}

/** Typed text as a document: one paragraph per non-blank line. */
export function docFromText(value: string): RichDoc {
  const paragraphs = value
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l): RichParagraph => ({
      type: 'paragraph',
      content: [{ type: 'text', text: l }],
    }));
  return {
    type: 'doc',
    content: paragraphs.length ? paragraphs : [{ type: 'paragraph' }],
  };
}

export type RichNoteResult =
  { ok: true; doc: RichDoc; text: string } | { ok: false; message: string };

/** Validates a note from the browser and derives the plain text stored beside it. Messages never echo the input. */
export function parseRichNote(raw: unknown): RichNoteResult {
  const p = RichDocSchema.safeParse(raw);
  if (!p.success)
    return { ok: false, message: "That formatting isn't allowed." };
  const text = richPlainText(p.data).trim();
  if (text === '') return { ok: false, message: 'Write a note.' };
  if (text.length > NOTE_MAX_CHARS)
    return {
      ok: false,
      message: `Note must be ${NOTE_MAX_CHARS} characters or fewer.`,
    };
  return { ok: true, doc: p.data, text };
}
