import { motion } from 'framer-motion';
import TimelineScrubber from './TimelineScrubber';
import ShareLocation from './ShareLocation';
import Wordmark from '../brand/Wordmark';
import './GlobeIntro.css';

// The first screen: the wordmark, a "Share location" button, and — on the big
// globe behind it (IntroGlobe.jsx) — a dot for each city you can click instead.
// Either way you go straight in: sharing your location adds "Your location" as
// one more dot (see App.jsx), and clicking a dot picks that city.
export default function GlobeIntro({ cities, onSelectCity, onShareLocation, year, onYearChange, playing, onTogglePlay }) {
  return (
    <motion.div className="globe-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="globe-intro__header">
        <h1 className="globe-intro__title">
          <Wordmark className="wordmark--hero" />
        </h1>
        <ShareLocation onShare={onShareLocation} />
      </div>

      {/* For keyboard and screen-reader users, who can't click dots on a 3D
          globe: the same cities as buttons. Invisible until you Tab into it. */}
      <nav className="globe-intro__cities" aria-label="Choose a city">
        {cities.map((city) => (
          <button key={city.label} type="button" onClick={() => onSelectCity(city)}>
            {city.label}
          </button>
        ))}
      </nav>

      <div className="globe-intro__footer">
        <div className="legend">
          <span className="legend__dot" />
          Insect-borne diseases
        </div>
        <TimelineScrubber year={year} onChange={onYearChange} playing={playing} onTogglePlay={onTogglePlay} />
      </div>
    </motion.div>
  );
}
