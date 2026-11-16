'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogPortal = RadixDialog.Portal;
export const DialogTitle = RadixDialog.Title;

export function DialogScrim() {
  return (
    <RadixDialog.Overlay className="bg-scrim data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out fixed inset-0 z-40" />
  );
}

type DialogContentProps = {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Actions, primary last. Wrap Cancel in DialogClose. */
  footer: ReactNode;
};

/** A centred modal for decisions that need protected focus (discard changes, delete). */
export function DialogContent({
  title,
  description,
  children,
  footer,
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogScrim />
      <RadixDialog.Content
        {...(description === undefined && { 'aria-describedby': undefined })}
        className="rounded-surface border-line bg-surface shadow-float data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out fixed top-1/2 left-1/2 z-50 flex w-[min(400px,calc(100vw-32px))] -translate-1/2 flex-col gap-2 border p-5"
      >
        <DialogTitle className="text-ink m-0 text-base font-semibold">
          {title}
        </DialogTitle>
        {description !== undefined && (
          <RadixDialog.Description className="text-13 text-ink-2 m-0">
            {description}
          </RadixDialog.Description>
        )}
        {children}
        <div className="mt-3 flex flex-wrap justify-end gap-2">{footer}</div>
      </RadixDialog.Content>
    </DialogPortal>
  );
}
