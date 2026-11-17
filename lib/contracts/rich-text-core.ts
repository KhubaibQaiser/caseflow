// The types and pure helpers for notes. No Zod here, so the browser can import them without its weight;
// the strict schema that guards the server lives in rich-text.ts.

export const NOTE_MAX_CHARS = 2000;
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

type RichMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'link'; attrs: { href: string } };
export type RichText = { type: 'text'; text: string; marks?: RichMark[] };
export type RichInline = RichText | { type: 'hardBreak' };
type RichParagraph = { type: 'paragraph'; content?: RichInline[] };
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
