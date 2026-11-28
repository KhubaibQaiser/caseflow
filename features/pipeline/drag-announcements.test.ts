import { expect, it } from 'vitest';

import {
  DRAG_INSTRUCTIONS,
  endText,
  overText,
  startText,
} from './drag-announcements';

it('announcements say where the card is, and leave a completed move to the toast', () => {
  expect(DRAG_INSTRUCTIONS).toBe(
    'Press Space to pick up this contact. Use the Left and Right arrow keys to choose a column, Space to drop, Escape to cancel.',
  );
  expect(startText('Marisol Ortega', 'lead')).toBe(
    'Picked up Marisol Ortega from Lead.',
  );
  expect(overText('Marisol Ortega', 'active')).toBe(
    'Marisol Ortega is over Active.',
  );
  expect(overText('Marisol Ortega', null)).toBe(
    'Marisol Ortega is not over a column.',
  );
  expect(endText('Marisol Ortega', 'lead', 'active', true)).toBe(
    'Marisol Ortega was not moved.',
  );
  expect(endText('Marisol Ortega', 'lead', 'lead', false)).toBe(
    'Marisol Ortega stays in Lead.',
  );
  expect(endText('Marisol Ortega', 'lead', null, false)).toBe(
    'Marisol Ortega stays in Lead.',
  );
  expect(endText('Marisol Ortega', 'lead', 'active', false)).toBeUndefined();
});
