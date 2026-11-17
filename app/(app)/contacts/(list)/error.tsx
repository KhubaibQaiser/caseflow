'use client';

import { ListErrorScreen } from '../../list-error-screen';

export default function ContactsError(props: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  return (
    <ListErrorScreen
      {...props}
      title="Contacts"
      unexpected="Something went wrong showing them."
    />
  );
}
