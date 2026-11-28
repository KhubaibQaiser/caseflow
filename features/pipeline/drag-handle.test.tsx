import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { DragHandle } from './drag-handle';

it('the Drag button names the contact and is a real button', () => {
  const handleRef = vi.fn();
  render(<DragHandle name="Marisol Ortega" handleRef={handleRef} />);
  const button = screen.getByRole('button', { name: 'Drag Marisol Ortega' });
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveAttribute('data-drag-handle');
  expect(button).toHaveTextContent('Drag');
  expect(handleRef).toHaveBeenCalledWith(button);
});
