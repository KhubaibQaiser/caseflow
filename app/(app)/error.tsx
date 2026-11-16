'use client';

import { ErrorContent } from '../error-content';

// A page error keeps the shell; the layout's <main> already wraps this.
export default function ShellError(props: {
  error: unknown;
  reset: () => void;
}) {
  return <ErrorContent {...props} />;
}
