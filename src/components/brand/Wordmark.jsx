import './Wordmark.css';

// The "swarm®" logo text. Size/color are set by whoever places it (see the
// menu bar, the intro hero, the page footer) — this just owns the markup.
export default function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`}>
      swarm<sup className="wordmark__reg">®</sup>
    </span>
  );
}
