import { useEffect, useState } from 'react';

/** `flag`, but only once it has stayed true for `ms`; it drops at once. Keeps fast loads from flashing. */
export function useDelayedFlag(flag: boolean, ms = 300): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!flag) return;
    const t = setTimeout(() => setLate(true), ms);
    return () => {
      clearTimeout(t);
      setLate(false);
    };
  }, [flag, ms]);
  // `late` resets in the cleanup, a render after `flag` drops; `flag &&` hides that frame.
  return flag && late;
}
