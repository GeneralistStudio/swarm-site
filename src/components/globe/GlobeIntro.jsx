import { motion } from 'framer-motion';
import TimelineScrubber from './TimelineScrubber';
import './GlobeIntro.css';

export default function GlobeIntro({ query, onQueryChange, onSubmit, year, onYearChange, playing, onTogglePlay }) {
  return (
    <motion.div className="globe-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="globe-intro__header">
        <h1 className="wordmark wordmark--hero">
          swarm<sup className="wordmark__reg">®</sup>
        </h1>
        <div className="location-input">
          <input
            type="text"
            placeholder="Enter a Location..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
          <button type="button" onClick={onSubmit}>
            Submit
          </button>
        </div>
      </div>

      <div className="globe-intro__footer">
        <div className="legend">
          <span className="legend__dot" />
          Mosquito territory
        </div>
        <TimelineScrubber year={year} onChange={onYearChange} playing={playing} onTogglePlay={onTogglePlay} />
      </div>
    </motion.div>
  );
}
