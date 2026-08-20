import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import GlobeIntro from './components/globe/GlobeIntro';
import PersistentGlobe from './components/globe/PersistentGlobe';
import MainScene from './components/scene/MainScene';
import SceneBackdrop from './components/scene/SceneBackdrop';
import Nav from './components/nav/Nav';
import ModalShell from './components/modals/ModalShell';
import SwarmPanel from './components/modals/SwarmPanel';
import AboutPanel from './components/modals/AboutPanel';
import { resolveLocation } from './data/placeholderLocationData';
import { useTimeOfDay, interpolateKeyframes } from './hooks/useTimeOfDay';
import './App.css';

// Drives --ink, the adaptive foreground color shared by the wordmark and
// other UI text (e.g. the location label) — white at night, near-black in
// daytime. Same day/night plateau shape as GrassLayers' palettes, on the
// same local-hour clock — kept separate per-component rather than shared
// since each owns its own small palette.
const INK_KEYFRAMES = [
  { hour: 0, colors: ['#ffffff'] },
  { hour: 6.5, colors: ['#ffffff'] },
  { hour: 8, colors: ['#1b1c1a'] },
  { hour: 18, colors: ['#1b1c1a'] },
  { hour: 20, colors: ['#ffffff'] },
  { hour: 24, colors: ['#ffffff'] },
];

export default function App() {
  const [phase, setPhase] = useState('intro'); // 'intro' | 'main'
  const [location, setLocation] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // null | 'swarm' | 'about'

  const { hour } = useTimeOfDay(location?.timezoneOffset ?? 0);
  const [inkColor] = interpolateKeyframes(hour, INK_KEYFRAMES);

  // location-picking state lives here now, since it's shared between the
  // intro's chrome (GlobeIntro) and the single persistent globe (which
  // renders in both the expanded and docked state)
  const [query, setQuery] = useState('');
  const [pin, setPin] = useState(null); // { lat, lon } from a globe click
  const [territoryYear, setTerritoryYear] = useState(2025);
  const [playing, setPlaying] = useState(true);

  function handleQueryChange(value) {
    setQuery(value);
    setPin(null); // manual typing disassociates from a globe pick
  }

  function handleGlobeSelect({ lat, lon }) {
    setPin({ lat, lon });
    setQuery(`${lat.toFixed(1)}°, ${lon.toFixed(1)}°`);
  }

  function handleSubmit() {
    if (!query.trim()) return;
    const locationData = pin
      ? {
          lat: pin.lat,
          lon: pin.lon,
          label: query.trim(),
          intensity: 0.5,
          timezoneOffset: Math.round(pin.lon / 15),
        }
      : resolveLocation(query);
    setLocation(locationData);
    setPhase('main');
    // stop the timeline's per-frame rAF loop before the transition — it was
    // still ticking through GlobeIntro's exit-fade at the same time
    // MainScene/SwarmCanvas were mounting their own loop, doubling up main
    // -thread work right at the transition
    setPlaying(false);
  }

  function toggleModal(id) {
    setActiveModal((current) => (current === id ? null : id));
  }

  return (
    <div className="app-root" style={{ '--ink': inkColor }}>
      {/* mounted once, always visible — the intro's chrome sits on top of
          this with translucent panels so the grass reads through it */}
      <SceneBackdrop hour={hour} phase={phase} />

      {/* one globe, mounted for the life of the app — see PersistentGlobe
          for why this replaced two separately-mounted copies */}
      <PersistentGlobe
        phase={phase}
        year={territoryYear}
        selected={pin}
        onSelect={handleGlobeSelect}
        onDockedClick={() => setPhase('intro')}
      />

      {/* nav (wordmark + Swarm/About tabs) only exists once you're past the
          intro — the intro has its own hero wordmark and no tabs */}
      {phase === 'main' && (
        <Nav showWordmark activeModal={activeModal} onOpenModal={toggleModal} />
      )}

      {/* mode="wait" (rather than the default overlapping exit+enter):
          MainScene mounts SwarmCanvas, which does its own setup (event
          listeners, rAF loop) — sequencing it after GlobeIntro's exit-fade
          finishes avoids doing both at once during the transition */}
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <GlobeIntro
            key="intro"
            query={query}
            onQueryChange={handleQueryChange}
            onSubmit={handleSubmit}
            year={territoryYear}
            onYearChange={setTerritoryYear}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
          />
        ) : (
          <MainScene key="main" location={location} />
        )}
      </AnimatePresence>

      <ModalShell open={activeModal === 'swarm'} onClose={() => setActiveModal(null)}>
        <SwarmPanel />
      </ModalShell>
      <ModalShell open={activeModal === 'about'} onClose={() => setActiveModal(null)}>
        <AboutPanel />
      </ModalShell>
    </div>
  );
}
