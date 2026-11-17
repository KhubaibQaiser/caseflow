/** The bordered surface the list's empty and error states sit in. */
export const listFrame = 'border-line bg-surface rounded-surface border py-10';

/** The page column for the list and the board: fills the viewport below the 34px top bar (one calc, so no one-off copies). */
export const listPageFrame =
  'flex flex-col gap-3 md:h-[calc(100dvh-34px)] md:min-h-120';
