import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import GlobeIntro from './components/globe/GlobeIntro';
import IntroGlobe from './components/globe/IntroGlobe';
import MainScene from './components/scene/MainScene';
import SceneBackdrop from './components/scene/SceneBackdrop';
import SiteMenu from './components/menu/SiteMenu';
import InfoPanel from './components/info/InfoPanel';
import PageFrame from './pages/PageFrame';
import { loadGlobe, useAfterFirstPaint } from './components/globe/lazyGlobe';
import { PAGES, prefetchPages } from './pages/lazyPages';
import { CITIES } from './data/cities';
import { TIMELINE } from './data/diseaseHotspots';
import { useTimeOfDay, interpolateKeyframes } from './hooks/useTimeOfDay';
import { useHashRoute } from './router/useHashRoute';
import PerfMeter from './components/dev/PerfMeter';
import { perfMeterOn } from './components/dev/perfFlag';
import './App.css';

// Drives --ink, the adaptive foreground color shared by the wordmark and
// other UI text — white at night, near-black in daytime. Same day/night
// plateau shape as GrassLayers' palettes, on the same local-hour clock —
// kept separate per-component rather than shared since each owns its own
// small palette.
const INK_KEYFRAMES = [
  { hour: 0, colors: ['#ffffff'] },
  { hour: 6.5, colors: ['#ffffff'] },
  { hour: 8, colors: ['#1b1c1a'] },
  { hour: 18, colors: ['#1b1c1a'] },
  { hour: 20, colors: ['#ffffff'] },
  { hour: 24, colors: ['#ffffff'] },
];

// When the "day" look starts and ends (local hour, 24h clock). Some UI sits
// on the sky and can't survive the sky's grey in-between at dawn and dusk, so
// instead of fading it just flips between a fully light and a fully dark look
// at these two moments (currently the bug tooltip — see BugTooltip.css).
const DAY_STARTS = 7;
const NIGHT_STARTS = 18.5;

export default function App() {
  const path = useHashRoute();
  const Page = PAGES[path];
  const isHome = !Page; // "/" — and any unknown address falls back to Home

  // Loading order, so the first screen shows as fast as possible:
  //   1. the small main bundle (this file, the sky, the share-location button)
  //   2. the 3D globe (three.js — big, so it comes in behind and fades in)
  //   3. only then, when the browser is idle, the other pages — so a click in
  //      the menu opens them instantly without slowing 1 and 2 down
  const afterFirstPaint = useAfterFirstPaint();
  useEffect(() => {
    if (!afterFirstPaint) return undefined;
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    let handle;
    loadGlobe().then(() => {
      handle = idle(prefetchPages, { timeout: 6000 });
    });
    return () => cancel(handle);
  }, [afterFirstPaint]);

  const [phase, setPhase] = useState('intro'); // 'intro' | 'main'
  const [location, setLocation] = useState(null);

  // The Data panel's two sliders. Both start "unset" — year on today, time of
  // day following the real clock at the chosen place — and both feed the sky
  // AND the swarm (how many bugs, and mosquitoes vs ticks).
  const [year, setYear] = useState(TIMELINE.today);
  const [hourOverride, setHourOverride] = useState(null); // null = follow the real clock
  const [scrubbing, setScrubbing] = useState(false);
  const scrubTimer = useRef(null);

  const { hour: liveHour } = useTimeOfDay(location?.timezoneOffset ?? 0);
  const hour = hourOverride ?? liveHour;
  const [inkColor] = interpolateKeyframes(hour, INK_KEYFRAMES);
  const daylight = hour >= DAY_STARTS && hour < NIGHT_STARTS ? 'day' : 'night';

  // Dragging the time slider: the sky follows right away instead of drifting
  // there over its usual slow 8-second crossfade (which would lag far behind
  // the handle). It goes back to the slow fade half a second after you stop.
  function handleHourChange(value) {
    setHourOverride(value);
    setScrubbing(true);
    clearTimeout(scrubTimer.current);
    scrubTimer.current = setTimeout(() => setScrubbing(false), 500);
  }

  const [territoryYear, setTerritoryYear] = useState(TIMELINE.today);
  // the intro timeline plays by itself (sweeping the green across the globe),
  // unless the visitor's device is set to reduce motion
  const [playing, setPlaying] = useState(() => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  // Data panel open? Home's swarm canvas reads this too: panel open = show the
  // circle around the cursor + the disease tooltip
  const [infoOpen, setInfoOpen] = useState(false);

  // "Your location": only set if the visitor pressed "Share location" and said
  // yes (see ShareLocation.jsx). Until then — and for good if they never do —
  // the places to choose from are just the cities.
  const [myLocation, setMyLocation] = useState(null);
  const cities = useMemo(() => (myLocation ? [...CITIES, myLocation] : CITIES), [myLocation]);

  // intro screen: go in with a place
  function enterLocation(place) {
    setLocation(place);
    setPhase('main');
    // stop the timeline's per-frame rAF loop before the transition — it was
    // still ticking through GlobeIntro's exit-fade at the same time
    // MainScene/SwarmCanvas were mounting their own loop, doubling up main
    // -thread work right at the transition
    setPlaying(false);
  }

  // The visitor shared their location: it becomes one more place to pick —
  // and, since they pressed the button to use it, the one we go in with. (If
  // the answer arrives after they've already clicked a city, it's just added
  // to the list and nothing switches under them.)
  function handleShareLocation(place) {
    setMyLocation(place);
    if (phase === 'intro') enterLocation(place);
  }

  // Data panel (or the intro globe): pick one of the places
  function handleSelectLocation(place) {
    if (phase === 'intro') enterLocation(place);
    else setLocation(place);
  }

  return (
    <div className="app-root" style={{ '--ink': inkColor }} data-scrubbing={scrubbing} data-daylight={daylight}>
      {isHome ? (
        <>
          {/* sky, stars, grass, grain — only on Home; the other pages have
              their own plain background */}
          <SceneBackdrop hour={hour} phase={phase} />

          <AnimatePresence>
            {phase === 'intro' && (
              <IntroGlobe key="intro-globe" year={territoryYear} cities={cities} onSelectCity={handleSelectLocation} />
            )}
          </AnimatePresence>

          {/* mode="wait" (rather than the default overlapping exit+enter):
              MainScene mounts SwarmCanvas, which does its own setup (event
              listeners, rAF loop) — sequencing it after GlobeIntro's exit-fade
              finishes avoids doing both at once during the transition */}
          <AnimatePresence mode="wait">
            {phase === 'intro' ? (
              <GlobeIntro
                key="intro"
                cities={cities}
                onSelectCity={handleSelectLocation}
                onShareLocation={handleShareLocation}
                year={territoryYear}
                onYearChange={setTerritoryYear}
                playing={playing}
                onTogglePlay={() => setPlaying((p) => !p)}
              />
            ) : (
              <MainScene key="main" location={location} infoOpen={infoOpen} year={year} hour={hour} />
            )}
          </AnimatePresence>

          {/* "i" button + slide-in Data panel (also where location changes) */}
          {phase === 'main' && (
            <InfoPanel
              cities={cities}
              open={infoOpen}
              onOpenChange={setInfoOpen}
              location={location}
              onSelectLocation={handleSelectLocation}
              year={year}
              onYearChange={setYear}
              hour={hour}
              liveHour={liveHour}
              hourIsLive={hourOverride === null}
              onHourChange={handleHourChange}
              onHourReset={() => setHourOverride(null)}
            />
          )}
        </>
      ) : (
        <PageFrame key={path}>
          <Suspense fallback={null}>
            <Page />
          </Suspense>
        </PageFrame>
      )}

      {/* the hamburger menu: on every page, and on Home once you're past the
          intro (the intro has its own big wordmark and no menu) */}
      {(!isHome || phase === 'main') && <SiteMenu currentPath={path} />}

      {/* frame meter for tracking down stutter — only with ?perf in the address */}
      {perfMeterOn && <PerfMeter />}
    </div>
  );
}
