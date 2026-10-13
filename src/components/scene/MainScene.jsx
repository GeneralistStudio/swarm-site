import { motion } from 'framer-motion';
import SwarmCanvas from './SwarmCanvas';
import { useSwarmConfig } from '../../hooks/useSwarmConfig';
import './MainScene.css';

// The Home page's "game" — the swarm canvas. The location label and globe
// that used to sit top-left now live in the Data panel (components/info).
// `infoOpen` = the Data panel is open: the canvas then shows the swarm circle
// and the disease tooltip. `year` and `hour` (the Data panel's sliders) decide,
// together with the place, how many mosquitoes and ticks there are.
export default function MainScene({ location, infoOpen, year, hour }) {
  const config = useSwarmConfig(location, year, hour);

  return (
    <motion.div
      className="main-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <SwarmCanvas config={config} location={location} infoOpen={infoOpen} hour={hour} />
    </motion.div>
  );
}
