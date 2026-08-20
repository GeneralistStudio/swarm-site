import { motion } from 'framer-motion';
import './Nav.css';

export default function Nav({ showWordmark, activeModal, onOpenModal }) {
  return (
    <nav className="nav">
      {showWordmark && (
        <motion.span layoutId="wordmark" className="wordmark wordmark--nav">
          swarm<sup className="wordmark__reg">®</sup>
        </motion.span>
      )}
      <div className="nav__tabs">
        <button
          type="button"
          className={`nav__tab ${activeModal === 'swarm' ? 'nav__tab--active' : ''}`}
          onClick={() => onOpenModal('swarm')}
          data-swarm-ignore
        >
          Swarm
        </button>
        <button
          type="button"
          className={`nav__tab ${activeModal === 'about' ? 'nav__tab--active' : ''}`}
          onClick={() => onOpenModal('about')}
          data-swarm-ignore
        >
          About
        </button>
      </div>
    </nav>
  );
}
