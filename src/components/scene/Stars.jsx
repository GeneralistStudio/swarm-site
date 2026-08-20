import { useMemo } from 'react';
import { interpolateScalar } from '../../hooks/useTimeOfDay';
import './Stars.css';

const STAR_COUNT = 26;

// Dim (not fully hidden) during the day, bright at night — same local-hour
// clock as the sky/grass.
const OPACITY_KEYFRAMES = [
  { hour: 0, value: 0.9 },
  { hour: 6.5, value: 0.9 },
  { hour: 8, value: 0.12 },
  { hour: 18, value: 0.12 },
  { hour: 20, value: 0.9 },
  { hour: 24, value: 0.9 },
];

// Only rendered on the intro (globe) screen. Pure CSS drift — each star just
// eases back and forth along a short randomized path — so there's no
// per-frame JS cost.
export default function Stars({ active, hour }) {
  const opacity = interpolateScalar(hour, OPACITY_KEYFRAMES);

  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 68, // stay clear of the grass band
        size: 1.5 + Math.random() * 2.2,
        dx: (Math.random() - 0.5) * 50,
        dy: (Math.random() - 0.5) * 28,
        duration: 14 + Math.random() * 18,
        delay: -Math.random() * 20,
      })),
    []
  );

  return (
    <div
      className={`stars ${active ? 'stars--active' : ''}`}
      style={{ '--stars-opacity': opacity }}
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            '--dx': `${s.dx}px`,
            '--dy': `${s.dy}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
