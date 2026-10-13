import { useEffect, useState } from 'react';

// For things that fade out and are then invisible: stays true while `active`,
// and for `ms` after it turns false (long enough for the fade-out to finish) —
// then false, so the component can be removed from the page entirely instead
// of sitting there at opacity 0 with its animations still running.
//
//   const show = useLingering(active, 1100);
//   if (!show) return null;
export function useLingering(active, ms) {
  const [lingering, setLingering] = useState(active);

  useEffect(() => {
    if (active) {
      // (re)appearing: keep it mounted from now until the next fade-out ends
      const wake = setTimeout(() => setLingering(true), 0);
      return () => clearTimeout(wake);
    }
    const done = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(done);
  }, [active, ms]);

  return active || lingering;
}
