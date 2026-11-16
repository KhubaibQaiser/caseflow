import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Tooltip } from './tooltip';

async function tipOn(side?: 'right') {
  render(
    <Tooltip content="Contacts" side={side}>
      <button>Go</button>
    </Tooltip>,
  );
  await userEvent.setup().tab();
  // The visible copy carries data-side; the role=tooltip span is a hidden duplicate.
  const tips = await screen.findAllByText('Contacts');
  return tips.find((el) => el.hasAttribute('data-side'));
}

describe('Tooltip side', () => {
  it('opens above by default', async () => {
    expect(await tipOn()).toHaveAttribute('data-side', 'top');
  });

  it('opens to the right when asked, so it never covers the next icon', async () => {
    expect(await tipOn('right')).toHaveAttribute('data-side', 'right');
  });
});
