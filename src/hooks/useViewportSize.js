import { useEffect, useState } from 'react';

export function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    // dragging the window edge fires resize events faster than the screen can
    // draw them: take at most one reading per frame, and none if nothing moved
    let frame = 0;
    function onResize() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const width = window.innerWidth;
        const height = window.innerHeight;
        setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
      });
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return size;
}
