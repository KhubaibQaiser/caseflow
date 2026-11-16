import { ForbiddenState } from '@/components/shell/forbidden-state';

// Safety net for forbidden(); pages that know the action render ForbiddenState themselves.
export default function Forbidden() {
  return (
    <ForbiddenState
      action="do that"
      backHref="/contacts"
      backLabel="Back to contacts"
    />
  );
}
