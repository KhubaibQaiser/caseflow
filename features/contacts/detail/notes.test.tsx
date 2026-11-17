import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Note } from '@/lib/contracts/contact';
import { clearReturn, hasReturn } from '@/lib/auth/return-marker';
import { fail, ok } from '@/lib/contracts/result';
import { docFromText } from '@/lib/contracts/rich-text';

import { Notes } from './notes';
import { note, renderAs } from './test-utils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/contacts/c-00001',
}));

// A saved note whose body and document agree.
const saved = (body: string, id = 'n-1'): Note =>
  note({ id, body, bodyJson: docFromText(body) });

// The editor loads on demand, so the composer arrives a moment after the first render.
const composer = () => screen.findByRole('textbox', { name: 'Add a note' });
const save = () => screen.getByRole('button', { name: 'Save note' });
const user = () => userEvent.setup();

async function typeNote(u: ReturnType<typeof user>, text: string) {
  const box = await composer();
  await u.click(box);
  await u.keyboard(text);
  return box;
}

beforeEach(() => push.mockReset());

describe('Notes composer', () => {
  it('disables Save while the note is empty or only whitespace', async () => {
    const u = user();
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    expect(save()).toBeDisabled();

    await typeNote(u, '   ');
    expect(save()).toBeDisabled();

    await u.keyboard('Called back');
    expect(save()).toBeEnabled();
  });

  it('keeps the text and shows one Save button, which retries, when the save fails', async () => {
    const u = user();
    const onAdd = vi
      .fn()
      .mockResolvedValueOnce(fail('server', 'Something went wrong. Try again.'))
      .mockResolvedValueOnce(ok(saved('Called back', 'n-2')));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);

    const box = await typeNote(u, 'Called back');
    await u.click(save());

    expect(box).toHaveTextContent('Called back');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Note not saved. Check your connection and save again.',
    );
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();

    // Save note is the retry: it sends the kept draft again.
    await u.click(save());
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('article')).toHaveTextContent('Called back');
    await waitFor(() => expect(box).not.toHaveTextContent('Called back'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the text when the request itself throws (offline)', async () => {
    const u = user();
    const onAdd = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);

    const box = await typeNote(u, 'Called back');
    await u.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Note not saved. Check your connection and save again.',
    );
    expect(box).toHaveTextContent('Called back');
  });

  it('submits once on a double Cmd+Enter', async () => {
    const u = user();
    type Saved = ReturnType<typeof ok<Note>>;
    let release: (v: Saved) => void = () => {};
    const onAdd = vi.fn(
      () =>
        new Promise<Saved>((r) => {
          release = r;
        }),
    );
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);

    const box = await typeNote(u, 'Called back');
    await u.keyboard('{Meta>}{Enter}{Enter}{/Meta}');
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // The composer is read-only while the save is in flight.
    expect(box).toHaveAttribute('contenteditable', 'false');

    release(ok(saved('Called back')));
    await waitFor(() => expect(box).not.toHaveTextContent('Called back'));
  });

  it('also submits on Ctrl+Enter, and a plain Enter starts a new paragraph', async () => {
    const u = user();
    const onAdd = vi.fn().mockResolvedValue(ok(saved('One two')));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);

    await typeNote(u, 'One{Enter}two');
    expect(onAdd).not.toHaveBeenCalled();
    await u.keyboard('{Control>}{Enter}{/Control}');
    expect(onAdd).toHaveBeenCalledTimes(1);
    const doc = onAdd.mock.calls[0]![0];
    expect(doc.content).toHaveLength(2);
  });

  it('on success clears the editor, lists the note first and announces it', async () => {
    const u = user();
    const onAdd = vi.fn().mockResolvedValue(ok(saved('Fresh note', 'n-9')));
    renderAs(
      'admin',
      <Notes tz="UTC" notes={[saved('Older')]} onAdd={onAdd} />,
    );

    const box = await typeNote(u, 'Fresh note');
    await u.click(save());

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Note added.'),
    );
    await waitFor(() => expect(box).not.toHaveTextContent('Fresh note'));
    await waitFor(() => expect(box).toHaveFocus());
    const items = screen.getAllByRole('article');
    expect(items[0]).toHaveTextContent('Fresh note');
    expect(items[1]).toHaveTextContent('Older');
  });

  it('does not list a note twice once the server list includes it', async () => {
    const u = user();
    const added = saved('Fresh note', 'n-9');
    const onAdd = vi.fn().mockResolvedValue(ok(added));
    const { rerender } = renderAs(
      'admin',
      <Notes tz="UTC" notes={[]} onAdd={onAdd} />,
    );
    await typeNote(u, 'Fresh note');
    await u.click(save());
    await screen.findByRole('article');

    rerender(<Notes tz="UTC" notes={[added]} onAdd={onAdd} />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('sends the user to sign in when the session ended, keeping the note for Back', async () => {
    const u = user();
    const onAdd = vi.fn().mockResolvedValue(fail('unauthorized', 'Sign in.'));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);

    await typeNote(u, 'Called back');
    await u.click(save());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/login?reason=expired&next=%2Fcontacts%2Fc-00001',
      ),
    );
    expect(window.history.state?.caseflowNoteDraft).toMatchObject({
      type: 'doc',
    });
    // /login learns that Back leads to this draft.
    expect(hasReturn('/contacts/c-00001')).toBe(true);
    clearReturn();
    window.history.replaceState(null, '');
  });

  it('says so when there are no notes', () => {
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('moves focus to the composer only when the user picks Add note', async () => {
    const u = user();
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    const box = await composer();
    expect(box).not.toHaveFocus();

    await u.click(screen.getByRole('button', { name: 'Add note' }));
    // Tiptap focuses on the next frame.
    await waitFor(() => expect(box).toHaveFocus());
  });

  it('offers no Add note button once there are notes, or to a viewer', () => {
    const { unmount } = renderAs(
      'admin',
      <Notes tz="UTC" notes={[note()]} onAdd={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Add note' })).toBeNull();
    unmount();
    renderAs('viewer', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    expect(screen.getByText('No notes yet.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add note' })).toBeNull();
  });

  it('stops at 2,000 characters and shows the count near the limit', async () => {
    const u = user();
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    const box = await composer();
    await u.click(box);
    await u.paste('a'.repeat(1700));
    expect(await screen.findByText(/1,700 \/ 2,000/)).toBeVisible();
    await u.paste('b'.repeat(500)); // would pass the limit: refused whole
    expect(box.textContent).toHaveLength(1700);
  });

  it('replaces the composer for a viewer, who can still read notes', () => {
    renderAs(
      'viewer',
      <Notes tz="UTC" notes={[saved('Left voicemail.')]} onAdd={vi.fn()} />,
    );
    expect(
      screen.getByText("Viewers can read notes but can't add them."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Left voicemail.')).toBeInTheDocument();
  });

  it('shows the author and role, and a full timestamp in a title', () => {
    renderAs(
      'admin',
      <Notes
        tz="UTC"
        notes={[note({ createdAt: '2026-11-13T16:12:00.000Z' })]}
        onAdd={vi.fn()}
      />,
    );
    const byline = screen.getByText(/Alex Morgan/);
    expect(byline).not.toHaveTextContent('Admin');
    const t = screen.getByText('Nov 13, 4:12 PM');
    expect(t.tagName).toBe('TIME');
    expect(t).toHaveAttribute('datetime', '2026-11-13T16:12:00.000Z');
    expect(t.getAttribute('title')).toContain('2026');
  });

  it('renders a saved note with its formatting', () => {
    const doc = {
      type: 'doc' as const,
      content: [
        {
          type: 'paragraph' as const,
          content: [
            {
              type: 'text' as const,
              text: 'Call ',
              marks: [{ type: 'bold' as const }],
            },
            {
              type: 'text' as const,
              text: 'the firm',
              marks: [
                {
                  type: 'link' as const,
                  attrs: { href: 'https://example.com' },
                },
              ],
            },
          ],
        },
        {
          type: 'orderedList' as const,
          content: [
            {
              type: 'listItem' as const,
              content: [
                {
                  type: 'paragraph' as const,
                  content: [{ type: 'text' as const, text: 'first' }],
                },
              ],
            },
          ],
        },
      ],
    };
    renderAs(
      'viewer',
      <Notes tz="UTC" notes={[note({ bodyJson: doc })]} onAdd={vi.fn()} />,
    );
    expect(screen.getByRole('link', { name: 'the firm' })).toHaveAttribute(
      'rel',
      'noopener noreferrer nofollow',
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('first');
  });
});

describe('Notes formatting', () => {
  const tool = (name: string) => screen.getByRole('button', { name });

  it('has real toolbar buttons that report their state', async () => {
    const u = user();
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    await composer();

    const bar = screen.getByRole('toolbar', { name: 'Formatting' });
    for (const name of [
      'Bold',
      'Italic',
      'Bulleted list',
      'Numbered list',
      'Link',
    ])
      expect(bar).toContainElement(tool(name));
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'false');
    expect(tool('Bold')).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+B Meta+B',
    );

    await u.click(tool('Bold'));
    expect(tool('Bold')).toHaveAttribute('aria-pressed', 'true');
  });

  it('is one Tab stop; Left and Right move between the tools', async () => {
    const u = user();
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    await composer();

    const bar = screen.getByRole('toolbar', { name: 'Formatting' });
    const tabbable = () =>
      within(bar)
        .getAllByRole('button')
        .filter((b) => b.tabIndex === 0);
    expect(tabbable()).toEqual([tool('Bold')]);

    tool('Bold').focus();
    await u.keyboard('{ArrowRight}');
    expect(tool('Italic')).toHaveFocus();
    expect(tabbable()).toEqual([tool('Italic')]);
    await u.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(tool('Link')).toHaveFocus(); // wraps
    await u.keyboard('{ArrowRight}');
    expect(tool('Bold')).toHaveFocus();
  });

  it('sends bold text, a list and a link as a document', async () => {
    const u = user();
    const onAdd = vi.fn().mockResolvedValue(ok(saved('x')));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);
    const box = await composer();
    await u.click(box);

    await u.keyboard('{Control>}b{/Control}Hi{Control>}b{/Control} there');
    await u.click(tool('Bulleted list'));
    await u.keyboard('{Enter}item');
    await u.click(tool('Link'));
    await u.type(
      screen.getByRole('textbox', { name: 'Link address' }),
      'example.com{Enter}',
    );
    await waitFor(() => expect(box).toHaveFocus());
    await u.keyboard('{Control>}{Enter}{/Control}');

    expect(onAdd).toHaveBeenCalledTimes(1);
    const json = JSON.stringify(onAdd.mock.calls[0]![0]);
    expect(json).toContain('"type":"bold"');
    expect(json).toContain('"type":"bulletList"');
    expect(json).toContain('"href":"https://example.com"');
  });

  it('refuses a javascript: link in the link form', async () => {
    const u = user();
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    await typeNote(u, 'text');
    await u.click(tool('Link'));
    await u.type(
      screen.getByRole('textbox', { name: 'Link address' }),
      'javascript:alert(1){Enter}',
    );
    expect(
      await screen.findByText('Use an http, https or mailto link.'),
    ).toBeVisible();
    expect(
      screen.getByRole('textbox', { name: 'Add a note' }).querySelector('a'),
    ).toBeNull();
  });

  it('has no heading, code, image or quote controls', async () => {
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    await composer();
    expect(
      screen.queryAllByRole('button', { name: /heading|code|image|quote/i }),
    ).toHaveLength(0);
  });
});

describe('Notes document handed to the action', () => {
  it('is plain JSON a Server Action can carry (no prototype-less objects)', async () => {
    const u = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(ok(saved('x')));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);
    const box = await composer();
    await u.click(box);
    await u.keyboard('hello');
    await u.keyboard('{Control>}a{/Control}');
    await u.click(screen.getByRole('button', { name: 'Link' }));
    await u.type(
      screen.getByRole('textbox', { name: 'Link address' }),
      'example.com{Enter}',
    );
    await waitFor(() => expect(box).toHaveFocus());
    await u.keyboard('{Control>}{Enter}{/Control}');

    const doc = onAdd.mock.calls[0]![0];
    const walk = (v: unknown): void => {
      if (v && typeof v === 'object') {
        expect([Object.prototype, Array.prototype]).toContain(
          Object.getPrototypeOf(v),
        );
        Object.values(v).forEach(walk);
      }
    };
    walk(doc);
    expect(JSON.stringify(doc)).toContain('"href":"https://example.com"');
  });
});

describe('Notes restored draft and failure state', () => {
  const draftState = (value: unknown) =>
    window.history.replaceState({ caseflowNoteDraft: value }, '');
  afterEach(() => window.history.replaceState(null, ''));

  it('ignores a restored draft that is not a valid note document', async () => {
    draftState({
      type: 'doc',
      content: [{ type: 'script', content: [{ type: 'text', text: 'pwned' }] }],
    });
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    const box = await composer();
    expect(box).not.toHaveTextContent('pwned');
    expect(save()).toBeDisabled();
    expect(window.history.state?.caseflowNoteDraft).toBeUndefined();
  });

  it('puts a valid restored draft back and enables Save', async () => {
    draftState(docFromText('Left a message'));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    const box = await composer();
    await waitFor(() => expect(box).toHaveTextContent('Left a message'));
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it('clears the failure message and aria-invalid when the user edits again', async () => {
    const u = user();
    const onAdd = vi
      .fn()
      .mockResolvedValue(fail('server', 'Something went wrong. Try again.'));
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={onAdd} />);
    const box = await typeNote(u, 'Called back');
    await u.click(save());
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(box).toHaveAttribute('aria-invalid', 'true');

    await u.click(box);
    await u.keyboard(' again');
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
    expect(box).not.toHaveAttribute('aria-invalid');
  });
});

describe('Notes composer frame', () => {
  it('holds the toolbar, the editor and the footer in one frame', async () => {
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    const box = await composer();
    const frame = box.closest('[data-note-composer]');
    expect(frame).not.toBeNull();
    expect(frame).toContainElement(
      screen.getByRole('toolbar', { name: 'Formatting' }),
    );
    expect(frame).toContainElement(save());
    expect(frame).toContainElement(
      screen.getByText(/Notes are visible to the whole intake team\./),
    );
  });

  it('keeps the shortcut sentence off coarse pointers and the rest of the hint on', async () => {
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    await composer();
    const shortcut = screen.getByText('Ctrl or Cmd+Enter saves.');
    expect(shortcut.className).toContain('pointer-coarse:hidden');
    expect(
      screen.getByText(/Notes are visible to the whole intake team\./)
        .className,
    ).not.toContain('pointer-coarse:hidden');
  });

  it('gives the toolbar 40px targets on touch screens and 32px otherwise', async () => {
    renderAs('admin', <Notes tz="UTC" notes={[]} onAdd={vi.fn()} />);
    await composer();
    const bold = screen.getByRole('button', { name: 'Bold' });
    expect(bold.className).toContain('size-8');
    expect(bold.className).toContain('max-md:size-10');
  });
});
