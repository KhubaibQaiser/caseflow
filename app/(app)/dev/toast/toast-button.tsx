'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';

export function ToastButton() {
  return (
    <Button variant="primary" onClick={() => toast.success('Contact saved')}>
      Show toast
    </Button>
  );
}
