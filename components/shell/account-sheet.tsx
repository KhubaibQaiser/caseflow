'use client';

import { Dialog } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';

import { AccountIdentity, SignOutForm } from './account-block';
import type { SignOut } from './account-block';

// Loaded on first tap of the Account tab, so the dialog code stays off first paint.
export default function AccountSheet({
  signOut,
  onClose,
}: {
  signOut: SignOut;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <Sheet
        side="right"
        title="Account"
        footer={<SignOutForm signOut={signOut} className="w-full" />}
      >
        <AccountIdentity />
      </Sheet>
    </Dialog>
  );
}
