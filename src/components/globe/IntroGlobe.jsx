import { Suspense, useRef } from 'react';
import { motion } from 'framer-motion';
import { Globe3D, useAfterFirstPaint } from './lazyGlobe';
import { useViewportSize } from '../../hooks/useViewportSize';
import { getExpandedGlobeRect } from './globeLayout';
import './IntroGlobe.css';

// The big globe on the first ("earth") screen. It shows the same city dots as
// the Data panel's globe — hover one to see its name, click it to go in. (If
// the visitor shared their location, "Your location" is one of the dots.) Once
// a place is picked it fades out with the intro — from then on the globe lives
// inside the Data panel (see components/info/InfoPanel.jsx), where places can
// be changed.
export default function IntroGlobe({ year, cities, onSelectCity }) {
  const { width, height } = useViewportSize();
  const { top, left, size } = getExpandedGlobeRect(width, height);
  const showGlobe = useAfterFirstPaint(); // the 3D code loads in behind the first screen

  // The little name tag that follows the pointer over a dot. It's moved by
  // writing straight to the element — the pointer moves many times a second,
  // and re-rendering React for each one would be wasted work.
  const labelRef = useRef(null);
  function handleHoverCity(city, x, y) {
    const label = labelRef.current;
    if (!label) return;
    if (!city) {
      label.dataset.visible = 'false';
      return;
    }
    if (label.textContent !== city.label) label.textContent = city.label;
    label.style.transform = `translate(${x}px, ${y}px)`;
    label.dataset.visible = 'true';
  }

  return (
    <motion.div
      className="intro-globe"
      style={{ top, left, width: size, height: size }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      data-swarm-ignore
    >
      {showGlobe && (
        <Suspense fallback={null}>
          <Globe3D
            className="intro-globe__canvas"
            interactive
            autoRotate
            cloud
            cloudYear={year}
            dots={false}
            cities={cities}
            onSelectCity={onSelectCity}
            onHoverCity={handleHoverCity}
          />
        </Suspense>
      )}
      <div ref={labelRef} className="intro-globe__label" data-visible="false" aria-hidden="true" />
    </motion.div>
  );
}
