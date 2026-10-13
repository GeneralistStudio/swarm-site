import { lazy, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// The 3D globe is loaded SEPARATELY from the rest of the site.
// ---------------------------------------------------------------------------
// The globe needs three.js + react-three-fiber, which are about two thirds of
// all the code on the site. If they were bundled with everything else, nothing
// could appear until ALL of it had downloaded and run. Instead the site's
// first screen (sky, grass, wordmark, location box) is made from the small
// main bundle, and the globe's code downloads right behind it and fades in.
//
//   import { Globe3D } from '.../lazyGlobe';
//   <Suspense fallback={null}><Globe3D … /></Suspense>      ← use it like normal
// ---------------------------------------------------------------------------

export const loadGlobe = () => import('./Globe3D');
export const Globe3D = lazy(loadGlobe);

// true one moment AFTER the first screen has painted — so the globe's code
// only starts downloading once the page's own bundle, CSS and fonts are done
// with the connection
export function useAfterFirstPaint() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTimeout(() => setReady(true), 0));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}
