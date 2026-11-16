import { extendTailwindMerge } from 'tailwind-merge';

// Teach twMerge our @theme tokens it can't infer: text-13 is a size (not a colour), radii are named.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['13'], radius: ['ctl', 'surface', 'pill'] } },
});

export const cn = (...classes: (string | false | null | undefined)[]) =>
  twMerge(classes.filter(Boolean).join(' '));
