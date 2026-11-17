'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

// Loaded on demand: most saves never open it.
export default function DiscardDialog({
  onDiscard,
  onClose,
}: {
  onDiscard(): void;
  onClose(): void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Discard changes?"
        description="Your edits to this contact haven't been saved."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Keep editing</Button>
            </DialogClose>
            <Button variant="primary" onClick={onDiscard}>
              Discard
            </Button>
          </>
        }
      />
    </Dialog>
  );
}
