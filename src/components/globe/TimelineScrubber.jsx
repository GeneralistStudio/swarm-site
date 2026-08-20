import { useEffect, useRef } from 'react';
import './TimelineScrubber.css';

const START_YEAR = 2025;
const END_YEAR = 2100;

export default function TimelineScrubber({ year, onChange, playing, onTogglePlay }) {
  const rafRef = useRef();

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    function tick(now) {
      const dt = now - last;
      last = now;
      // full sweep every ~14s
      const yearsPerMs = (END_YEAR - START_YEAR) / 14000;
      let next = year + dt * yearsPerMs;
      if (next > END_YEAR) next = START_YEAR;
      onChange(next);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const pct = ((year - START_YEAR) / (END_YEAR - START_YEAR)) * 100;

  return (
    <div className="timeline-scrubber" data-swarm-ignore>
      <span className="timeline-year timeline-year--start">{START_YEAR}</span>
      <div className="timeline-track">
        <div className="timeline-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={START_YEAR}
          max={END_YEAR}
          step={1}
          value={Math.round(year)}
          onChange={(e) => onChange(Number(e.target.value))}
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
