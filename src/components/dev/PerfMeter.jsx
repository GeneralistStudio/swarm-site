import { useEffect, useRef } from 'react';
import './PerfMeter.css';

// A tiny live frame meter, for tracking down stutter. It only exists when the
// page address has ?perf in it (e.g. http://localhost:5173/swarm-site/?perf),
// so visitors never see it. Move the mouse around and watch:
//
//   fps       frames drawn in the last second (60 or 120 is smooth)
//   worst     the slowest frame in the last 5 seconds — a stutter shows up here
//             as a big number (anything over ~50 ms is a visible hitch)
//   hitches   how many frames have taken over 50 ms since the page loaded
//   blocked   how many times the page's own JavaScript froze the browser for
//             over 50 ms. If "hitches" climbs but "blocked" stays 0, the freeze
//             is the browser/graphics side, not the site's code.
//
// The last few hitches are listed with how long they were. (Whether it shows is
// decided by perfMeterOn in perfFlag.js.)
export default function PerfMeter() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let raf;
    let last = performance.now();
    let secondStart = last;
    let framesThisSecond = 0;
    let fps = 0;
    let hitches = 0;
    let blocked = 0;
    const recent = []; // [timestamp, frame ms] for the last 5 s
    const hitchLog = []; // newest last
    const t0 = last;

    let observer = null;
    try {
      observer = new PerformanceObserver((list) => {
        blocked += list.getEntries().length;
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      /* this browser can't report long tasks — "blocked" just stays 0 */
    }

    function tick(now) {
      const ms = now - last;
      last = now;
      framesThisSecond++;
      recent.push([now, ms]);
      while (recent.length && now - recent[0][0] > 5000) recent.shift();
      if (ms > 50) {
        hitches++;
        hitchLog.push(`${Math.round(ms)} ms at ${((now - t0) / 1000).toFixed(1)}s`);
        if (hitchLog.length > 4) hitchLog.shift();
      }
      if (now - secondStart >= 1000) {
        fps = Math.round((framesThisSecond * 1000) / (now - secondStart));
        framesThisSecond = 0;
        secondStart = now;
        let worst = 0;
        for (const [, v] of recent) if (v > worst) worst = v;
        el.textContent =
          `fps      ${fps}\n` +
          `worst    ${Math.round(worst)} ms\n` +
          `hitches  ${hitches}\n` +
          `blocked  ${blocked}` +
          (hitchLog.length ? `\n— last hitches —\n${hitchLog.join('\n')}` : '');
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  return <pre ref={ref} className="perf-meter" aria-hidden="true" />;
}
