import { memo } from 'react';
import TimeOfDayBackground from './TimeOfDayBackground';
import GrassLayers from './GrassLayers';
import IntroGlow from './IntroGlow';
import Stars from './Stars';
import NoiseOverlay from './NoiseOverlay';

// hour is computed once in App (single shared clock) and threaded through
// here — each of these used to run its own useTimeOfDay/setInterval, which
// could drift out of phase with each other and each independently trigger a
// repaint; one shared value keeps them perfectly in lockstep.
//
// memo: this only depends on the time of day and which phase we're in. Without
// it, everything here re-rendered on EVERY change anywhere in the app — each
// letter typed in the location box, each tick of the Year slider.
export default memo(function SceneBackdrop({ hour, phase }) {
  return (
    <>
      <TimeOfDayBackground hour={hour} />
      <Stars active={phase === 'intro'} hour={hour} />
      <IntroGlow active={phase === 'intro'} />
      <GrassLayers hour={hour} blurred={phase === 'intro'} />
      <NoiseOverlay />
    </>
  );
});
