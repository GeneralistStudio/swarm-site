import { useEffect, useRef } from 'react';
import { TIMELINE } from '../../data/diseaseHotspots';
import './TimelineScrubber.css';

// The little timeline on the intro screen: it runs from TODAY to 2100, and the
// green on the globe (the insect-borne disease cloud) follows it — growing and
// spreading as the years go by.
//
// It plays by itself: forward from today to 2100 (~12 seconds), a beat at 2100,
// a quick rewind back to today, a beat there, and round again. Drag the line,
// or press ❚❚, to take over; ▶ carries on from where it is.
const START_YEAR = TIMELINE.today;
const END_YEAR = TIMELINE.max;

// ---- DESIGN KNOBS -----------------------------------------------------------
const FORWARD_MS = 12000; // today → 2100
const HOLD_END_MS = 1500; // a pause at 2100
const REWIND_MS = 2500; // 2100 → today (quicker than going forward)
const HOLD_START_MS = 1500; // a pause at today
// How often the new year is handed to the globe while playing. Each time, the
// green is redrawn (a 2048×1024 picture), so ~15 a second is smooth enough to
// look continuous without re-drawing it every frame.
const UPDATE_EVERY_MS = 66;
// -----------------------------------------------------------------------------

export default function TimelineScrubber({ year, onChange, playing, onTogglePlay }) {
  // the newest year, readable from inside the play loop below without
  // restarting the loop every time it changes
  const yearRef = useRef(year);
  useEffect(() => {
    yearRef.current = year;
  });

  useEffect(() => {
    if (!playing) return undefined;

    // carry on from wherever the line is now
    let progress = Math.min(1, Math.max(0, (yearRef.current - START_YEAR) / (END_YEAR - START_YEAR)));
    let phase = progress >= 1 ? 'holdEnd' : 'forward'; // 'forward' | 'holdEnd' | 'rewind' | 'holdStart'
    let holdLeft = HOLD_END_MS;
    let last = performance.now();
    let lastSent = -Infinity;
    let raf;

    function send(now, force) {
      if (!force && now - lastSent < UPDATE_EVERY_MS) return;
      lastSent = now;
      onChange(START_YEAR + progress * (END_YEAR - START_YEAR));
    }

    function tick(now) {
      const dt = Math.min(now - last, 100); // (a hiccup shouldn't make it leap)
      last = now;

      if (phase === 'forward') {
        progress = Math.min(1, progress + dt / FORWARD_MS);
        if (progress === 1) {
          phase = 'holdEnd';
          holdLeft = HOLD_END_MS;
          send(now, true); // land exactly on 2100
        } else send(now, false);
      } else if (phase === 'holdEnd') {
        holdLeft -= dt;
        if (holdLeft <= 0) phase = 'rewind';
      } else if (phase === 'rewind') {
        progress = Math.max(0, progress - dt / REWIND_MS);
        if (progress === 0) {
          phase = 'holdStart';
          holdLeft = HOLD_START_MS;
          send(now, true); // …and exactly on today
        } else send(now, false);
      } else {
        holdLeft -= dt;
        if (holdLeft <= 0) phase = 'forward';
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, onChange]);

  const pct = ((year - START_YEAR) / (END_YEAR - START_YEAR)) * 100;

  return (
    <div className="timeline-scrubber" data-swarm-ignore>
      <span className="timeline-year timeline-year--start">Today</span>
      <div className="timeline-track">
        <div className="timeline-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={START_YEAR}
          max={END_YEAR}
          step={1}
          value={Math.round(year)}
          aria-label="Year"
          onChange={(e) => {
            onChange(Number(e.target.value));
            if (playing) onTogglePlay(); // grabbing the line stops it playing itself
          }}
        />
      </div>
      <span className="timeline-year timeline-year--end">{END_YEAR}</span>
      <button
        type="button"
        className="timeline-play"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause timeline' : 'Play timeline'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
    </div>
  );
}
