import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fail, ok } from '@/lib/contracts/result';

import { Notes } from './notes';
import { note, renderAs } from './test-utils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/contacts/c-00001',
}));

const composer = () => screen.getByRole('textbox', { name: 'Add a note' });
const save = () => screen.getByRole('button', { name: 'Save note' });

beforeEach(() => push.mockReset());

describe('Notes composer', () => {
  it('disables Save while the body is empty or only whitespace', async () => {
    const user = userEvent.setup();
    renderAs('admin', <Notes notes={[]} onAdd={vi.fn()} />);
    expect(save()).toBeDisabled();

    await user.type(composer(), '   ');
    expect(save()).toBeDisabled();

    await user.type(composer(), 'Called back');
    expect(save()).toBeEnabled();
  });

  it('keeps the text, shows the error and offers Retry when the save fails', async () => {
    const user = userEvent.setup();
    const onAdd = vi
      .fn()
      .mockResolvedValueOnce(fail('server', 'Something went wrong. Try again.'))
      .mockResolvedValueOnce(ok(note({ id: 'n-2', body: 'Called back' })));
    renderAs('admin', <Notes notes={[]} onAdd={onAdd} />);

    await user.type(composer(), 'Called back');
    await user.click(save());

    expect(composer()).toHaveValue('Called back');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Try again.',
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Called back')).toBeInTheDocument();
    expect(composer()).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the text when the request itself throws (offline)', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    renderAs('admin', <Notes notes={[]} onAdd={onAdd} />);

    await user.type(composer(), 'Called back');
    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save the note. Check your connection and retry.",
    );
    expect(composer()).toHaveValue('Called back');
  });

  it('submits once on a double Cmd+Enter', async () => {
    const user = userEvent.setup();
    let release: (
      v: ReturnType<typeof ok<ReturnType<typeof note>>>,
    ) => void = () => {};
    const onAdd = vi.fn(
      () =>
        new Promise<ReturnType<typeof ok<ReturnType<typeof note>>>>((r) => {
          release = r;
        }),
    );
    renderAs('admin', <Notes notes={[]} onAdd={onAdd} />);

    await user.type(composer(), 'Called back');
    await user.keyboard('{Meta>}{Enter}{Enter}{/Meta}');
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('Called back');
    expect(save()).toHaveAttribute('aria-busy', 'true');

    release(ok(note({ body: 'Called back' })));
    await waitFor(() => expect(composer()).toHaveValue(''));
  });

  it('also submits on Ctrl+Enter, and ignores a plain Enter', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(ok(note()));
    renderAs('admin', <Notes notes={[]} onAdd={onAdd} />);

    await user.type(composer(), 'One{Enter}two');
    expect(onAdd).not.toHaveBeenCalled();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onAdd).toHaveBeenCalledExactlyOnceWith('One\ntwo');
  });

  it('on success clears the field, lists the note first and announces it', async () => {
    const user = userEvent.setup();
    const onAdd = vi
      .fn()
      .mockResolvedValue(ok(note({ id: 'n-9', body: 'Fresh note' })));
    renderAs(
      'admin',
      <Notes notes={[note({ id: 'n-1', body: 'Older' })]} onAdd={onAdd} />,
    );

    await user.type(composer(), 'Fresh note');
    await user.click(save());

    expect(await screen.findByRole('status')).toHaveTextContent('Note added.');
    expect(composer()).toHaveValue('');
    expect(composer()).toHaveFocus();
    const items = screen.getAllByRole('article');
    expect(items[0]).toHaveTextContent('Fresh note');
    expect(items[1]).toHaveTextContent('Older');
  });

  it('does not list a note twice once the server list includes it', async () => {
    const user = userEvent.setup();
    const added = note({ id: 'n-9', body: 'Fresh note' });
    const onAdd = vi.fn().mockResolvedValue(ok(added));
    const { rerender } = renderAs('admin', <Notes notes={[]} onAdd={onAdd} />);
    await user.type(composer(), 'Fresh note');
    await user.click(save());
    await screen.findByText('Fresh note');

    rerender(<Notes notes={[added]} onAdd={onAdd} />);
    expect(screen.getAllByText('Fresh note')).toHaveLength(1);
  });

  it('sends the user to sign in when the session ended', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(fail('unauthorized', 'Sign in.'));
    renderAs('admin', <Notes notes={[]} onAdd={onAdd} />);

    await user.type(composer(), 'Called back');
    await user.click(save());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/login?reason=expired&next=%2Fcontacts%2Fc-00001',
      ),
    );
  });

  it('says so when there are no notes', () => {
    renderAs('admin', <Notes notes={[]} onAdd={vi.fn()} />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('caps the note at 2,000 characters', () => {
    renderAs('admin', <Notes notes={[]} onAdd={vi.fn()} />);
    expect(composer()).toHaveAttribute('maxlength', '2000');
  });

  it('replaces the composer for a viewer, who can still read notes', () => {
    renderAs(
      'viewer',
      <Notes notes={[note({ body: 'Left voicemail.' })]} onAdd={vi.fn()} />,
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
        notes={[note({ createdAt: '2026-11-13T16:12:00.000Z' })]}
        onAdd={vi.fn()}
        tz="UTC"
      />,
    );
    expect(screen.getByText(/Alex Morgan/)).toHaveTextContent('Admin');
    const t = screen.getByText('Nov 13, 4:12 PM');
    expect(t.tagName).toBe('TIME');
    expect(t).toHaveAttribute('datetime', '2026-11-13T16:12:00.000Z');
    expect(t.getAttribute('title')).toContain('2026');
  });
});
