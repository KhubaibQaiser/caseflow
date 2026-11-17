import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RichDocSchema } from '@/lib/contracts/rich-text';

import { RichText } from './rich-text';

const text = (t: string, marks?: unknown[]) => ({
  type: 'text',
  text: t,
  marks,
});
const p = (...content: unknown[]) => ({ type: 'paragraph', content });
const html = (d: unknown) =>
  render(<RichText doc={RichDocSchema.parse(d)} />).container.firstElementChild!
    .innerHTML;

describe('RichText', () => {
  it('renders a paragraph with bold and italic', () => {
    expect(
      html({
        type: 'doc',
        content: [
          p(
            text('a '),
            text('b', [{ type: 'bold' }]),
            text('c', [{ type: 'italic' }]),
            text('d', [{ type: 'bold' }, { type: 'italic' }]),
          ),
        ],
      }),
    ).toBe(
      '<p>a <strong>b</strong><em>c</em><strong><em>d</em></strong></p>'.replace(
        '<strong><em>d</em></strong>',
        '<strong><em>d</em></strong>',
      ),
    );
  });

  it('renders a link that opens safely in a new tab', () => {
    const { container } = render(
      <RichText
        doc={RichDocSchema.parse({
          type: 'doc',
          content: [
            p(
              text('site', [
                { type: 'link', attrs: { href: 'https://example.com/a' } },
              ]),
            ),
          ],
        })}
      />,
    );
    const a = container.querySelector('a')!;
    expect(a).toHaveAttribute('href', 'https://example.com/a');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(a).toHaveTextContent('site');
  });

  it('renders bullet and numbered lists, with a start number', () => {
    const item = (t: string) => ({ type: 'listItem', content: [p(text(t))] });
    const { container } = render(
      <RichText
        doc={RichDocSchema.parse({
          type: 'doc',
          content: [
            { type: 'bulletList', content: [item('a'), item('b')] },
            { type: 'orderedList', attrs: { start: 3 }, content: [item('c')] },
          ],
        })}
      />,
    );
    expect(container.querySelectorAll('ul > li')).toHaveLength(2);
    const ol = container.querySelector('ol')!;
    expect(ol).toHaveAttribute('start', '3');
    expect(ol.querySelectorAll('li')).toHaveLength(1);
  });

  it('renders a hard break', () => {
    expect(
      html({
        type: 'doc',
        content: [p(text('a'), { type: 'hardBreak' }, text('b'))],
      }),
    ).toBe('<p>a<br>b</p>');
  });

  it('escapes markup in text and never injects HTML', () => {
    const out = html({
      type: 'doc',
      content: [
        p(text('<img src=x onerror=alert(1)><script>alert(1)</script>')),
      ],
    });
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;img');
  });

  it('drops a link whose href is not allowed, keeping its text', () => {
    // Defence in depth: a document that skipped the schema still cannot make a javascript: link.
    const { container } = render(
      <RichText
        doc={
          {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'x',
                    marks: [
                      { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                    ],
                  },
                ],
              },
            ],
          } as never
        }
      />,
    );
    expect(container.querySelector('a')).toBeNull();
    expect(container).toHaveTextContent('x');
  });
});
