import { useMemo } from 'react';
import { getLocationFacts } from '../../data/locationFacts';
import './LocationFacts.css';

// The Data panel's "Location" section: what the selected place is like — its
// region, its temperature, and how many mosquitoes and ticks it has — at the
// year and time of day the sliders are on. The numbers come from
// src/data/locationFacts.js; the look is all in LocationFacts.css.

const toFahrenheit = (c) => (c * 9) / 5 + 32;
const degrees = (n) => `${Math.round(n) < 0 ? '−' : ''}${Math.abs(Math.round(n))}°`; // (a real minus sign, not a hyphen)

function Population({ label, facts }) {
  const percent = Math.round(facts.index * 100);
  return (
    <div className="location-facts__item">
      <dt className="location-facts__label">{label}</dt>
      <dd className="location-facts__value" title={`Index ${percent} out of 100`}>
        {facts.level}
      </dd>
      {/* the bar is a picture of the same thing the word says */}
      <div className="location-facts__bar" role="img" aria-label={`${label}: ${facts.level}`}>
        <span style={{ '--v': facts.index }} />
      </div>
    </div>
  );
}

export default function LocationFacts({ location, year, hour }) {
  // the date is read once: the season doesn't change while the panel is open
  const date = useMemo(() => new Date(), []);
  // the Time of day slider moves in quarter-hours — no need to recompute finer than that
  const hourStep = Math.round(hour * 4) / 4;
  const facts = useMemo(
    () => (location ? getLocationFacts(location, year, hourStep, date) : null),
    [location, year, hourStep, date],
  );
  if (!facts) return null;

  const tempF = toFahrenheit(facts.temperatureC);

  return (
    <section className="info__section location-facts" aria-label="About this location">
      <h3 className="info__section-title">Location</h3>

      <dl className="location-facts__grid">
        <div className="location-facts__item">
          <dt className="location-facts__label">Region</dt>
          <dd className="location-facts__value">{facts.region}</dd>
        </div>

        <div className="location-facts__item">
          <dt className="location-facts__label">Temperature</dt>
          <dd className="location-facts__value">
            {degrees(tempF)}F<span className="location-facts__alt"> {degrees(facts.temperatureC)}C</span>
          </dd>
        </div>

        <Population label="Mosquito population" facts={facts.mosquito} />
        <Population label="Tick population" facts={facts.tick} />
      </dl>
    </section>
  );
}
