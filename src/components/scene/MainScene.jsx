import { motion } from 'framer-motion';
import SwarmCanvas from './SwarmCanvas';
import { useSwarmConfig } from '../../hooks/useSwarmConfig';
import './MainScene.css';

export default function MainScene({ location }) {
  const config = useSwarmConfig(location?.intensity ?? 0.5);

  return (
    <motion.div
      className="main-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <SwarmCanvas config={config} />
      {/* the globe itself is the persistent, App-level globe docked
          top-left — this just labels it, positioned to sit right below it */}
      <p className="main-scene__location-label" data-swarm-ignore>
        {location?.label ?? 'Unknown location'}
      </p>
    </motion.div>
  );
}
