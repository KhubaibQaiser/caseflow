'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import X from 'lucide-react/icons/x';

import { DialogClose, DialogPortal, DialogScrim, DialogTitle } from './dialog';

type SheetProps = {
  side: 'right';
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

/** A modal panel from the edge, used inside <Dialog>. Esc, the scrim and ✕ close it; focus returns to the trigger. */
export function Sheet({ side, title, children, footer }: SheetProps) {
  return (
    <DialogPortal>
      <DialogScrim />
      <RadixDialog.Content
        aria-describedby={undefined}
        data-side={side}
        className="bg-panel shadow-sheet data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-transparent"
      >
        <header className="border-line flex items-center justify-between gap-3 border-b py-2.5 pr-2.5 pl-4">
          <DialogTitle className="text-ink m-0 text-sm font-semibold">
            {title}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="rounded-ctl text-ink-2 hover:bg-track hover:text-ink grid size-8 cursor-pointer place-items-center transition-colors duration-150"
          >
            <X aria-hidden className="size-4" />
          </DialogClose>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
        <footer className="border-line bg-surface flex gap-2 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      </RadixDialog.Content>
    </DialogPortal>
  );
}
