import { gradientForHour } from '../../hooks/useTimeOfDay';
import './TimeOfDayBackground.css';

export default function TimeOfDayBackground({ hour }) {
  const [top, accentTop, mid, accentLow, bottom] = gradientForHour(hour);

  return (
    <div
      className="time-of-day-bg"
      style={{
        // CSS transition handles the slow crossfade between recomputed stops.
        // accentTop/accentLow are narrow bands rather than wide washes, so
        // they read as a hint of color rather than dominating the gradient.
        background: `linear-gradient(180deg, ${top} 0%, ${accentTop} 12%, ${mid} 50%, ${accentLow} 75%, ${bottom} 100%)`,
      }}
    />
  );
}
