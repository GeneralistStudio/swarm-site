import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToVector3 } from './geo';
import { TERRITORY_CLUSTERS } from '../../data/placeholderLocationData';
import Continents from './Continents';

const RADIUS = 1;

// Opaque white sphere. Continent outlines are drawn on top by <Continents/>
// (real coastline data). A slightly larger back-face sphere sits behind it
// to render as a clean black rim around the silhouette — a classic
// "toon outline" trick, so the rim is a property of the sphere's geometry
// (always exactly at the visible edge) rather than a line that would
// rotate with the surface.
function GlobeSurface() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshBasicMaterial color="#f7f6ef" />
      </mesh>
      <Continents radius={RADIUS * 1.001} color="#1b1c1a" />
      <mesh>
        <sphereGeometry args={[RADIUS * 1.003, 48, 48]} />
        <meshBasicMaterial color="#1b1c1a" side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function TerritoryDots({ year }) {
  const visible = useMemo(() => {
    return TERRITORY_CLUSTERS.filter((c) => year >= c.bornYear).map((c) => {
      const age = Math.min(1, (year - c.bornYear) / (75 * c.growth));
      return { ...c, intensity: age };
    });
  }, [year]);

  return (
    <group>
      {visible.map((c, i) => {
        const pos = latLonToVector3(c.lat, c.lon, RADIUS * 1.01);
        const scale = 0.015 + c.intensity * 0.02;
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[scale, 8, 8]} />
            <meshBasicMaterial color="#7ed957" transparent opacity={0.35 + c.intensity * 0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function SelectedMarker({ lat, lon }) {
  if (lat == null || lon == null) return null;
  const pos = latLonToVector3(lat, lon, RADIUS * 1.02);
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.02, 12, 12]} />
      <meshBasicMaterial color="#111111" />
    </mesh>
  );
}

function InteractionSphere({ onSelect }) {
  const { camera, raycaster, pointer } = useThree();
  const meshRef = useRef();

  function handlePointerUp(e) {
    if (!onSelect) return;
    // only treat as a "pick" if it wasn't a drag (OrbitControls handles drag)
    if (e.delta > 4) return;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(meshRef.current)[0];
    if (hit) {
      // intersectObject returns the hit point in world space, but the mesh
      // sits inside AutoRotateGroup — convert back to the mesh's local
      // (pre-rotation) space so the lat/lon matches latLonToVector3's frame
      // (which is what TerritoryDots/SelectedMarker place points in),
      // instead of drifting further off with every degree of auto-rotation.
      const p = meshRef.current.worldToLocal(hit.point.clone()).normalize();
      const lat = 90 - (Math.acos(p.y) * 180) / Math.PI;
      let lon = (Math.atan2(p.z, -p.x) * 180) / Math.PI - 180;
      if (lon < -180) lon += 360;
      onSelect({ lat, lon });
    }
  }

  return (
    <mesh ref={meshRef} onPointerUp={handlePointerUp}>
      <sphereGeometry args={[RADIUS, 32, 32]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function AutoRotateGroup({ enabled, children }) {
  const ref = useRef();
  useFrame((_, delta) => {
    // keeps spinning continuously — independent of any camera drag via
    // OrbitControls, which only orbits the camera, not this group
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.12;
  });
  return <group ref={ref}>{children}</group>;
}

export default function Globe3D({
  interactive = true,
  autoRotate = true,
  year = 2025,
  selected = null,
  onSelect,
  className,
}) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      {/* fov/distance tuned with margin so the sphere never clips against
          the canvas edge; the wrapping container is kept square (1:1) by
          its caller so this framing holds at any viewport size */}
      <Canvas camera={{ position: [0, 0, 3], fov: 42 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <AutoRotateGroup enabled={autoRotate}>
            <GlobeSurface />
            <TerritoryDots year={year} />
            <SelectedMarker lat={selected?.lat} lon={selected?.lon} />
            {interactive && <InteractionSphere onSelect={onSelect} />}
          </AutoRotateGroup>
        </Suspense>
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={(3 * Math.PI) / 4}
          />
        )}
      </Canvas>
    </div>
  );
}
