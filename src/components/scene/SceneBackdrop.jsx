import TimeOfDayBackground from './TimeOfDayBackground';
import GrassLayers from './GrassLayers';
import IntroGlow from './IntroGlow';
import Stars from './Stars';
import NoiseOverlay from './NoiseOverlay';

// hour is computed once in App (single shared clock) and threaded through
// here — each of these used to run its own useTimeOfDay/setInterval, which
// could drift out of phase with each other and each independently trigger a
// repaint; one shared value keeps them perfectly in lockstep.
export default function SceneBackdrop({ hour, phase }) {
  return (
    <>
      <TimeOfDayBackground hour={hour} />
      <Stars active={phase === 'intro'} hour={hour} />
      <IntroGlow active={phase === 'intro'} />
      <GrassLayers hour={hour} blurred={phase === 'intro'} />
      <NoiseOverlay />
    </>
  );
}
