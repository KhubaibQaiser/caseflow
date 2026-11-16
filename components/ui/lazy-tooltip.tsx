'use client';

import { Suspense, lazy } from 'react';

import type { TooltipProps } from './tooltip';

// floating-ui is ~20 kB gzipped and a tip is never needed on first paint,
// so it loads after hydration; the bare trigger shows until then.
const Tooltip = lazy(() =>
  import('./tooltip').then((m) => ({ default: m.Tooltip })),
);

export function LazyTooltip(props: TooltipProps) {
  return (
    <Suspense fallback={props.children}>
      <Tooltip {...props} />
    </Suspense>
  );
}
