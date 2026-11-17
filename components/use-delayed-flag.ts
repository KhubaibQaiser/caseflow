import { useEffect, useState } from 'react';

/** `flag`, but only once it has stayed true for `ms`; it drops at once. Keeps fast loads from flashing. */
export function useDelayedFlag(flag: boolean, ms = 300): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!flag) {
      setLate(false);
      return;
    }
    const t = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(t);
  }, [flag, ms]);
  // The effect clears `late` a render after `flag` drops; this hides that frame.
  return flag && late;
}
