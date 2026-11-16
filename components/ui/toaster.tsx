'use client';

import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import CircleAlert from 'lucide-react/icons/circle-alert';
import X from 'lucide-react/icons/x';

// An error that offers Retry stays until the user acts or dismisses it (WCAG 2.2.1).
const error: typeof sonnerToast.error = (message, data) =>
  sonnerToast.error(message, {
    ...(data?.action ? { duration: Infinity, closeButton: true } : {}),
    ...data,
  });

/** sonner's toast, with persistent action errors. */
export const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  { ...sonnerToast, error },
);

// Sonner injects unlayered CSS, which beats Tailwind's layered utilities; the `!` marks win it back.
const TOAST =
  'flex w-(--width) items-center gap-3.5 rounded-surface border border-transparent bg-ink py-2.5 pr-3 pl-3.5 font-sans! text-13 text-surface shadow-raised duration-200! ease-out! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-accent! focus-visible:outline-solid!';

/** Mounted once in the root layout. Usage: toast.success('Contact saved'), with `action` for Undo or Retry. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      // 6s leaves time to reach Undo; hover and focus pause it. Action errors never time out (see `error`).
      duration={6000}
      gap={8}
      className="font-sans!"
      icons={{
        success: null,
        error: (
          <CircleAlert aria-hidden className="text-accent-on-ink size-4" />
        ),
        close: <X aria-hidden className="size-4" />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: 'Dismiss',
        classNames: {
          toast: TOAST,
          content: 'min-w-0 flex-1',
          title: 'font-medium',
          icon: 'shrink-0',
          closeButton:
            'rounded-ctl order-last -mr-1 grid size-6 shrink-0 cursor-pointer place-items-center text-surface hover:bg-ink-2',
          actionButton:
            'rounded-ctl text-accent-on-ink ml-auto min-h-6 shrink-0 cursor-pointer px-1 font-semibold hover:underline underline-offset-3',
        },
      }}
    />
  );
}
