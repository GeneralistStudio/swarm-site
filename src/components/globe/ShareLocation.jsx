import { useEffect, useRef, useState } from 'react';
import { requestMyLocation } from '../../data/myLocation';

// The intro screen's "Share location" control. Pressing the button makes the
// browser show its own permission popup. If the visitor says yes, `onShare` is
// called with their position (see src/data/myLocation.js) and the app takes
// it from there. If they say no, nothing happens except a line of text telling
// them to click a city on the globe instead — nothing is added.
// The look is all in GlobeIntro.css (".share-location").

const HINT = 'or click a city on the globe';
const FAILED = {
  denied: 'Location not shared — click a city on the globe instead.',
  unavailable: "Couldn't find your location — click a city on the globe instead.",
  timeout: 'That took too long — click a city on the globe instead.',
  unsupported: "This browser can't share location — click a city on the globe.",
};

function PinIcon() {
  return (
    <svg className="share-location__icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export default function ShareLocation({ onShare }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'asking' | 'failed'
  const [reason, setReason] = useState(null);

  // always call the newest onShare, even if the answer arrives later
  const onShareRef = useRef(onShare);
  useEffect(() => {
    onShareRef.current = onShare;
  });
  // …and ignore an answer that arrives after this control is gone
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleClick() {
    if (status === 'asking') return;
    setStatus('asking');
    try {
      const place = await requestMyLocation();
      if (!mounted.current) {
        onShareRef.current(place); // still hand it over — the app decides what to do with a late answer
        return;
      }
      setStatus('idle');
      onShareRef.current(place);
    } catch (error) {
      if (!mounted.current) return;
      setReason(error?.reason ?? 'unavailable');
      setStatus('failed');
    }
  }

  const asking = status === 'asking';
  const failed = status === 'failed';

  return (
    <div className="share-location">
      <button type="button" className="share-location__button" onClick={handleClick} disabled={asking}>
        <PinIcon />
        {asking ? 'Waiting for permission…' : failed ? 'Try again' : 'Share location'}
      </button>
      <p className="share-location__hint" data-failed={failed} aria-live="polite">
        {failed ? FAILED[reason] ?? FAILED.unavailable : HINT}
      </p>
    </div>
  );
}
