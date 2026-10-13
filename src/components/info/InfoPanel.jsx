import { Suspense, useEffect, useRef, useState } from 'react';
import { Globe3D } from '../globe/lazyGlobe';
import RangeSlider from './RangeSlider';
import LocationFacts from './LocationFacts';
import { TIMELINE } from '../../data/diseaseHotspots';
import './InfoPanel.css';

function InfoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" strokeWidth="1.3" />
      <circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none" />
      <path d="M12 11.2v6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// 6.5 -> "6:30 AM", 0 -> "12:00 AM", 13.25 -> "1:15 PM"
function formatHour(hour) {
  const totalMinutes = Math.round(hour * 60) % 1440;
  const h24 = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${minutes} ${h24 < 12 ? 'AM' : 'PM'}`;
}

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// The "i" button (top-left) and the Data panel it slides open. The body has
// two sections — Controls (the Year and Time-of-day sliders) and Location
// (region, temperature, mosquito + tick population for the selected place; see
// LocationFacts.jsx). At the bottom: the globe + the location pill, which is
// where you change place. You pick from a short list of cities
// (src/data/cities.js) — click a dot on the globe, or use the arrows either
// side of the label — and the globe turns to face the one you choose.
// Look/animation: InfoPanel.css.
// `open` / `onOpenChange` are controlled by App, because the swarm canvas also
// needs to know whether the panel is open (it shows the circle + tooltip). The
// same goes for the Year and Time-of-day sliders: App owns their values, since
// the swarm (how many bugs, and which kind) and the sky both follow them.
export default function InfoPanel({
  cities, // the places to pick from: the cities, plus "Your location" if it was shared
  open,
  onOpenChange,
  location,
  onSelectLocation,
  year,
  onYearChange,
  hour, // the time being shown (the slider's value, or the live clock)
  liveHour, // what the real clock says at this location
  hourIsLive,
  onHourChange,
  onHourReset,
}) {
  // the globe only renders while the panel is on screen (see handleTransitionEnd)
  const [globeRunning, setGlobeRunning] = useState(open);
  const buttonRef = useRef(null);
  const closeRef = useRef(null);

  // which place we're on, and stepping to the one before / after it
  const cityIndex = cities.findIndex((city) => city.label === location?.label);

  function stepCity(direction) {
    const next = cityIndex === -1 ? (direction > 0 ? 0 : cities.length - 1) : (cityIndex + direction + cities.length) % cities.length;
    onSelectLocation(cities[next]);
  }

  function openPanel() {
    onOpenChange(true);
    setGlobeRunning(true);
  }
  function closePanel() {
    onOpenChange(false);
  }

  // stop the (hidden) globe only once the slide-out has actually finished,
  // so this keeps working if you change the animation length in the CSS
  function handleTransitionEnd(e) {
    if (e.target === e.currentTarget && e.propertyName === 'transform' && !open) {
      setGlobeRunning(false);
    }
  }

  // Escape closes the panel; focus moves into/out of it for keyboard users
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <div className="info" data-open={open} data-swarm-ignore>
      <button
        ref={buttonRef}
        type="button"
        className="info__button"
        aria-label="Open data panel"
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
        onClick={openPanel}
      >
        <InfoIcon />
      </button>

      <aside className="info__panel" aria-label="Data" onTransitionEnd={handleTransitionEnd}>
        <header className="info__header">
          <h2 className="info__title">
            <InfoIcon className="info__title-icon" />
            Data
          </h2>
          <button ref={closeRef} type="button" className="info__close" aria-label="Close data panel" onClick={closePanel}>
            <CloseIcon />
          </button>
        </header>

        <div className="info__body">
          <section className="info__section">
            <h3 className="info__section-title">Controls</h3>
            <RangeSlider
              id="year"
              label="Year"
              value={year}
              onChange={onYearChange}
              min={TIMELINE.min}
              max={TIMELINE.max}
              mark={TIMELINE.today}
              onReset={() => onYearChange(TIMELINE.today)}
              resetDisabled={year === TIMELINE.today}
            />
            <RangeSlider
              id="hour"
              label="Time of day"
              gradient
              value={Math.round(hour * 4) / 4}
              onChange={onHourChange}
              min={0}
              max={24}
              step={0.25}
              format={formatHour}
              startLabel="12 AM"
              endLabel="12 AM"
              mark={liveHour}
              onReset={onHourReset}
              resetDisabled={hourIsLive}
            />
          </section>

          {/* what the selected place is like — changes with the place, the
              year and the time of day */}
          <LocationFacts location={location} year={year} hour={hour} />

          {/* More sections go below — e.g. an "Active" list. This area fills the
              space between the header and the globe (and scrolls if it runs
              out of room). */}
        </div>

        {/* The globe sits straight on the panel, bleeding past its bottom and
            side edges — the panel's rounded shape crops it (see InfoPanel.css). */}
        <div className="info__globe-area">
          <div className="info__globe">
            <Suspense fallback={null}>
              <Globe3D
                interactive
                autoRotate
                cloud
                cloudYear={year}
                dots={false}
                filled={false}
                cities={cities}
                selectedCity={location?.label}
                onSelectCity={onSelectLocation}
                focus={location}
                paused={!globeRunning}
              />
            </Suspense>
          </div>

          {/* the location pill, with an arrow either side to step through the cities */}
          <div className="info__picker">
            <button type="button" className="info__arrow" aria-label="Previous city" onClick={() => stepCity(-1)}>
              <ChevronIcon direction="left" />
            </button>
            <p className="info__tag" aria-live="polite">
              <span className="info__tag-dot" aria-hidden="true" />
              <span className="info__tag-label">{location?.label}</span>
            </p>
            <button type="button" className="info__arrow" aria-label="Next city" onClick={() => stepCity(1)}>
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
