import { useEffect, useState } from 'react';
import Globe3D from './Globe3D';
import { useViewportSize } from '../../hooks/useViewportSize';
import { getExpandedGlobeRect } from './globeLayout';
import './PersistentGlobe.css';

// Exported so MainScene can position the location label relative to
// exactly where the docked globe ends up, without duplicating numbers.
export const DOCKED_TOP = 8;
export const DOCKED_LEFT = 16;
export const DOCKED_SIZE = 52;

const FADE_MS = 250;

// One Globe3D instance, mounted once for the life of the app — a
// separately-mounted copy per phase (intro vs. badge) doesn't survive a
// WebGL canvas well, so instead of moving/resizing this single container
// (previously a spring animation), we crossfade: fade out, snap to the new
// phase's rect while invisible, fade back in.
export default function PersistentGlobe({ phase, year, selected, onSelect, onDockedClick }) {
  const { width, height } = useViewportSize();
  const [visualPhase, setVisualPhase] = useState(phase);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (phase === visualPhase) return;
    setVisible(false);
    const swap = setTimeout(() => setVisualPhase(phase), FADE_MS);
    return () => clearTimeout(swap);
  }, [phase, visualPhase]);

  useEffect(() => {
    if (visualPhase !== phase) return;
    // Single rAF isn't enough — it can run before the browser paints the
    // just-swapped (still opacity:0) rect, so the opacity:1 update lands in
    // the same paint and the fade-in never visibly starts from 0. A second
    // rAF forces that paint to happen first.
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [visualPhase, phase]);

  const { top: expandedTop, left: expandedLeft, size: expandedSize } = getExpandedGlobeRect(width, height);

  const rect =
    visualPhase === 'intro'
      ? { top: expandedTop, left: expandedLeft, width: expandedSize, height: expandedSize }
      : { top: DOCKED_TOP, left: DOCKED_LEFT, width: DOCKED_SIZE, height: DOCKED_SIZE };

  return (
    <div
      className="persistent-globe"
      style={{ ...rect, opacity: visible ? 1 : 0 }}
      onClick={visualPhase === 'main' ? onDockedClick : undefined}
      data-swarm-ignore
    >
      <Globe3D
        interactive={visualPhase === 'intro'}
        autoRotate
        year={year}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  );
}
