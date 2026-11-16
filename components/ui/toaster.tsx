'use client';

import { Toaster as Sonner } from 'sonner';
import CircleAlert from 'lucide-react/icons/circle-alert';

export { toast } from 'sonner';

// Sonner injects unlayered CSS, which beats Tailwind's layered utilities; the `!` marks win it back.
const TOAST =
  'flex w-(--width) items-center gap-3.5 rounded-lg border border-transparent bg-ink py-2.5 pr-3 pl-3.5 font-sans! text-13 text-surface shadow-float-ink duration-200! ease-out! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-accent! focus-visible:outline-solid!';

/** Mounted once in the root layout. Usage: toast.success('Contact saved'), with `action` for Undo or Retry. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      // Every action toast in the spec is Undo or Retry; 6s leaves time to reach it. Hover and focus pause it.
      duration={6000}
      gap={8}
      className="font-sans!"
      icons={{
        success: null,
        error: (
          <CircleAlert aria-hidden className="text-accent-on-ink size-4" />
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: TOAST,
          content: 'min-w-0 flex-1',
          title: 'font-medium',
          icon: 'shrink-0',
          actionButton:
            'rounded-ctl text-accent-on-ink ml-auto min-h-6 shrink-0 cursor-pointer px-1 font-semibold hover:underline underline-offset-3',
        },
      }}
    />
  );
}
