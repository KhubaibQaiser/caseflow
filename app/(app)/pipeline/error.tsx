'use client';

import { ListErrorScreen } from '../list-error-screen';

export default function PipelineError(props: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  return (
    <ListErrorScreen
      {...props}
      title="Pipeline"
      hideSort
      unexpected="Something went wrong showing it."
    />
  );
}
