import { describe, expect, it } from 'vitest';

import {
  RichDocSchema,
  docFromText,
  isAllowedHref,
  parseRichNote,
  safeParseRichDoc,
  richPlainText,
} from './rich-text';

const text = (t: string, marks?: unknown[]) => ({
  type: 'text',
  text: t,
  marks,
});
const p = (...content: unknown[]) => ({ type: 'paragraph', content });
const doc = (...content: unknown[]) => ({ type: 'doc', content });
const link = (href: string, extra: object = {}) => ({
  type: 'link',
  attrs: { href, ...extra },
});

describe('RichDocSchema allows the editor’s own output', () => {
  it('accepts paragraphs, marks, breaks and both list types', () => {
    const ok = doc(
      p(
        text('Hi '),
        text('bold', [{ type: 'bold' }]),
        { type: 'hardBreak' },
        text('x', [{ type: 'italic' }]),
      ),
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [p(text('one'))] }],
      },
      {
        type: 'orderedList',
        attrs: { start: 1, type: null },
        content: [
          {
            type: 'listItem',
            content: [
              p(text('a')),
              {
                type: 'bulletList',
                content: [{ type: 'listItem', content: [p(text('nested'))] }],
              },
            ],
          },
        ],
      },
    );
    expect(RichDocSchema.safeParse(ok).success).toBe(true);
  });

  it('keeps only href from a link, dropping the target, rel and class Tiptap adds', () => {
    const r = RichDocSchema.parse(
      doc(
        p(
          text('site', [
            link('https://example.com/a', {
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
              class: null,
              title: null,
            }),
          ]),
        ),
      ),
    );
    const mark = (r.content[0] as { content: { marks: unknown[] }[] })
      .content[0]!.marks[0];
    expect(mark).toEqual({
      type: 'link',
      attrs: { href: 'https://example.com/a' },
    });
  });

  it('accepts http, https and mailto links only', () => {
    for (const href of [
      'http://a.test',
      'https://a.test/x?y=1',
      'mailto:a@b.test',
    ])
      expect(isAllowedHref(href)).toBe(true);
    for (const href of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,<script>',
      'vbscript:x',
      'file:///etc/passwd',
      'tel:123',
      '//evil.test',
      '/relative',
      'https://',
      '',
    ])
      expect(isAllowedHref(href), href).toBe(false);
  });
});

describe('RichDocSchema rejects everything else', () => {
  const rejects = (name: string, value: unknown) =>
    it(`rejects ${name}`, () =>
      expect(RichDocSchema.safeParse(value).success).toBe(false));

  rejects('a script link', doc(p(text('x', [link('javascript:alert(1)')]))));
  rejects('an unknown node', doc({ type: 'script', content: [] }));
  rejects(
    'a heading',
    doc({ type: 'heading', attrs: { level: 1 }, content: [text('h')] }),
  );
  rejects('a code block', doc({ type: 'codeBlock', content: [text('x')] }));
  rejects(
    'an image',
    doc({ type: 'image', attrs: { src: 'https://a.test/x.png' } }),
  );
  rejects('an unknown mark', doc(p(text('x', [{ type: 'underline' }]))));
  rejects('a code mark', doc(p(text('x', [{ type: 'code' }]))));
  rejects(
    'an unknown attr on a node',
    doc({ type: 'paragraph', attrs: { onclick: 'x' }, content: [text('x')] }),
  );
  rejects(
    'an unknown attr on a link',
    doc(p(text('x', [link('https://a.test', { onclick: 'x' })]))),
  );
  rejects(
    'a link target other than _blank',
    doc(p(text('x', [link('https://a.test', { target: '_self' })]))),
  );
  rejects(
    'an unknown key on a node',
    doc({ type: 'paragraph', content: [], html: '<b>' }),
  );
  rejects(
    'a text node with a script string and a raw html key',
    doc(p({ type: 'text', text: 'x', html: '<img onerror=x>' })),
  );
  rejects('not a doc at the root', p(text('x')));
  rejects('a string', '<p>x</p>');
  rejects('null', null);
  rejects('an empty doc', doc());
  rejects(
    'duplicate marks',
    doc(p(text('x', [{ type: 'bold' }, { type: 'bold' }]))),
  );
  rejects('an empty text node', doc(p(text(''))));
  rejects(
    'a list item with no paragraph',
    doc({ type: 'bulletList', content: [{ type: 'listItem', content: [] }] }),
  );
  rejects(
    'lists nested past five levels',
    (() => {
      let inner: unknown = p(text('deep'));
      for (let i = 0; i < 7; i++)
        inner = {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [p(text('x')), ...(i === 0 ? [] : [inner])].slice(0, 2),
            },
          ],
        };
      return doc(inner);
    })(),
  );
  rejects(
    'too many nodes',
    doc(...Array.from({ length: 600 }, () => p(text('x')))),
  );
  rejects(
    'a link longer than 2048 characters',
    doc(p(text('x', [link(`https://a.test/${'a'.repeat(2100)}`)]))),
  );
});

describe('richPlainText and parseRichNote', () => {
  const d = RichDocSchema.parse(
    doc(p(text('Hello '), text('world', [{ type: 'bold' }])), {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [p(text('one'))] },
        {
          type: 'listItem',
          content: [p(text('two'), { type: 'hardBreak' }, text('three'))],
        },
      ],
    }),
  );

  it('derives plain text: blocks and items on their own lines, no markers or marks', () => {
    expect(richPlainText(d)).toBe('Hello world\none\ntwo\nthree');
  });

  it('returns both the document and its text for a valid note', () => {
    const r = parseRichNote(d);
    expect(r).toEqual({
      ok: true,
      doc: d,
      text: 'Hello world\none\ntwo\nthree',
    });
  });

  it('refuses a note with no text, even if it has structure', () => {
    for (const empty of [
      doc(p()),
      doc(p(text('   '))),
      doc(p({ type: 'hardBreak' })),
    ]) {
      const r = parseRichNote(empty);
      expect(r).toEqual({ ok: false, message: 'Write a note.' });
    }
  });

  it('refuses more than 2,000 characters of plain text', () => {
    const r = parseRichNote(doc(p(text('a'.repeat(2001)))));
    expect(r).toEqual({
      ok: false,
      message: 'Note must be 2000 characters or fewer.',
    });
    expect(parseRichNote(doc(p(text('a'.repeat(2000))))).ok).toBe(true);
  });

  it('names forbidden formatting without echoing the input', () => {
    const r = parseRichNote(doc(p(text('x', [link('javascript:alert(1)')]))));
    expect(r).toEqual({ ok: false, message: "That formatting isn't allowed." });
  });

  it('turns typed text into paragraphs, one per line', () => {
    expect(
      richPlainText(RichDocSchema.parse(docFromText('One\n\nTwo\nthree'))),
    ).toBe('One\nTwo\nthree');
  });
});

describe('parseRichNote survives hostile input', () => {
  const nest = (levels: number) => {
    // Built in a loop: a recursive builder would overflow the stack here too.
    let inner: unknown = p(text('deep'));
    for (let i = 0; i < levels; i++)
      inner = {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [p(text('x')), inner] }],
      };
    return doc(inner);
  };

  it('returns a validation result, not a throw, for 20,000 levels of nesting', () => {
    const r = parseRichNote(nest(20_000));
    expect(r).toEqual({ ok: false, message: "That formatting isn't allowed." });
  });

  it('refuses a document with an enormous number of nodes without walking it all', () => {
    const wide = {
      type: 'doc',
      content: Array.from({ length: 200_000 }, () => p(text('x'))),
    };
    expect(parseRichNote(wide).ok).toBe(false);
  });

  it('maps anything thrown while reading the input to a validation result', () => {
    const trap = {
      type: 'doc',
      get content(): unknown {
        throw new Error('boom');
      },
    };
    expect(parseRichNote(trap)).toEqual({
      ok: false,
      message: "That formatting isn't allowed.",
    });
  });

  it('still accepts a legitimately nested note', () => {
    expect(parseRichNote(nest(3)).ok).toBe(true);
  });
});

describe('safeParseRichDoc', () => {
  it('accepts a valid document', () => {
    const r = safeParseRichDoc(docFromText('Hello'));
    expect(r.success).toBe(true);
  });

  it('fails, rather than throws, for 20,000 levels of nesting', () => {
    let inner: unknown = { type: 'paragraph' };
    for (let i = 0; i < 20_000; i++)
      inner = {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph' }, inner] },
        ],
      };
    expect(safeParseRichDoc({ type: 'doc', content: [inner] }).success).toBe(
      false,
    );
  });

  it('fails for a value that throws when read', () => {
    const trap = {
      type: 'doc',
      get content(): unknown {
        throw new Error('boom');
      },
    };
    expect(safeParseRichDoc(trap).success).toBe(false);
  });
});
