import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToVector3 } from './geo';
import { TERRITORY_CLUSTERS } from '../../data/placeholderLocationData';
import Continents from './Continents';
import { createCloudCanvas, drawCloud } from './diseaseCloud';
import { TIMELINE } from '../../data/diseaseHotspots';
import { brandYellow } from '../../theme';

const RADIUS = 1;

// The sphere itself. `filled` = a solid white fill; `filled={false}` = see-
// through (outline only) — it's still drawn invisibly so it hides the
// coastlines on the far side of the globe. Continent outlines are drawn on
// top by <Continents/> (real coastline data). A slightly larger back-face
// sphere sits behind it to render as a clean black rim around the silhouette
// — a classic "toon outline" trick, so the rim is a property of the sphere's
// geometry (always exactly at the visible edge) rather than a line that
// would rotate with the surface.
function GlobeSurface({ filled }) {
  return (
    <>
      {/* renderOrder -1: must draw before the rim sphere below, or the
          invisible version would let the rim show through the middle */}
      <mesh renderOrder={-1}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshBasicMaterial color="#f7f6ef" colorWrite={filled} />
      </mesh>
      {/* Keep the coastlines BELOW the rim's radius (1.003) or they stick out
          past the edge of the globe. The cloud is drawn separately, as a decal
          that ignores depth (see DiseaseCloud) — so it can't clash with the
          surface — and everything that must stay on top of it (coastlines,
          markers) is drawn after it via renderOrder. */}
      <Continents radius={RADIUS * 1.002} color="#1b1c1a" />
      <mesh>
        <sphereGeometry args={[RADIUS * 1.003, 48, 48]} />
        <meshBasicMaterial color="#1b1c1a" side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// The disease cloud (see diseaseCloud.js): a flat map image of the cloud for
// the given year, wrapped around the sphere. Each globe keeps its own copy of
// the image and just redraws it when the year changes.
// repaint the flat map for `year`, then tell three.js to re-upload it
function redrawCloud(canvas, texture, year) {
  drawCloud(canvas, year);
  texture.needsUpdate = true;
}

function DiseaseCloud({ year }) {
  const { canvas, texture } = useMemo(() => {
    const flatMap = createCloudCanvas();
    const t = new THREE.CanvasTexture(flatMap);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { canvas: flatMap, texture: t };
  }, []);

  useEffect(() => {
    redrawCloud(canvas, texture, year);
  }, [canvas, texture, year]);
  useEffect(() => () => texture.dispose(), [texture]);

  // A "decal": painted over the near half of the globe WITHOUT consulting the
  // depth buffer. Two surfaces sitting this close together used to fight over
  // which is in front (white diamond-shaped slits through the cloud, worse on
  // some graphics cards); with no depth test there's nothing to fight over.
  // Back faces are culled, so only the half facing you is painted.
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[RADIUS * 1.001, 48, 48]} />
      <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
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
          <mesh key={i} position={pos} renderOrder={2}>
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
    // transparent + renderOrder: drawn after the cloud so the cloud doesn't tint it
    <mesh position={pos} renderOrder={3}>
      <sphereGeometry args={[0.02, 12, 12]} />
      <meshBasicMaterial color="#111111" transparent />
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
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// How far to tip the globe (up or down) when it turns to face a place:
//   1 = all the way, so the city lands dead center
//   0 = not at all — only turn left/right, leaving the city above/below center
// Anything in between blends the two.
const FOCUS_TILT = 1;
const MAX_PITCH = (80 * Math.PI) / 180; // never let it tip past (almost) the poles

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // → shortest way round
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Where the globe should point to put a place in the middle: spin around the
// vertical axis for its longitude, then tip it forward/back for its latitude.
// (Same turn, in the same order, as dragging — see AutoRotateGroup — so north
// is always up and the camera never has to move.)
function focusRotation(lat, lon) {
  const [x, , z] = latLonToVector3(lat, lon, 1);
  return {
    yaw: -Math.atan2(x, z),
    pitch: clamp(((lat * Math.PI) / 180) * FOCUS_TILT, -MAX_PITCH, MAX_PITCH),
  };
}

// DESIGN KNOBS — how the city globe moves
const SPIN_SPEED = 0.12; // radians per second the globe turns by itself
const COAST_DECAY = 3; // how fast a flicked globe slows down (bigger = stops sooner)
const MAX_COAST = 6; // fastest a flick can send it, in radians per second
const DRAG_THRESHOLD_PX = 4; // moving less than this is a click, not a drag

// The globe's orientation, in one place. It's two turns — `yaw` (spin around
// the vertical axis) and `pitch` (tip toward/away from you) — and this is the
// only thing that rotates it:
//   • auto-rotate adds to the yaw
//   • `draggable` lets you grab the globe and turn it (left/right = yaw,
//     up/down = pitch). Let go mid-swipe and it coasts to a stop, like the big
//     intro globe. The camera stays put, so the globe can never end up rolled
//     sideways.
//   • `focus` ({ lat, lon }) eases both turns until that place is dead center
//     ("snap", but smooth). Nothing zooms; the camera isn't touched.
//
// With a focus, the auto-spin works like this: it runs by default, STOPS when
// a different place is picked (the globe settles on it and stays still), and
// STARTS AGAIN as soon as the globe is dragged.
function AutoRotateGroup({ enabled, focus, draggable, holdRef, children }) {
  const ref = useRef();
  const { gl } = useThree();
  const view = useRef({ yaw: 0, pitch: 0 }); // where the globe is pointing now
  const goal = useRef(null); // where it's easing to, or null when at rest
  const coast = useRef({ yaw: 0, pitch: 0 }); // leftover speed from a flick (rad/s)
  const dragging = useRef(false); // a finger/mouse is holding the globe
  const spinning = useRef(true); // is the auto-spin currently on?
  const firstFocus = useRef(true);
  const focusLat = focus?.lat;
  const focusLon = focus?.lon;

  useEffect(() => {
    if (focusLat == null || focusLon == null) return;
    const turn = focusRotation(focusLat, focusLon);
    if (firstFocus.current) {
      // the first time it appears, start already facing the place (no spin-in)
      view.current = { ...turn };
      firstFocus.current = false;
      goal.current = null;
    } else {
      // a place was picked: turn to it, and hold still once there
      goal.current = turn;
      spinning.current = false;
      coast.current = { yaw: 0, pitch: 0 };
    }
  }, [focusLat, focusLon]);

  // grab-and-turn
  useEffect(() => {
    if (!draggable) return;
    const canvas = gl.domElement;
    let start = null; // where the grab began
    let last = null; // the previous sample, to measure how fast it's being swiped
    let moved = false; // has it moved far enough to count as a drag?
    setCanvasCursor(gl, 'grab');

    const onMove = (e) => {
      // dragging across the globe's radius turns it about one radian, so the
      // surface under your finger follows it
      const radiusPx = canvas.clientHeight * 0.465;
      const v = view.current;
      v.yaw = start.yaw + (e.clientX - start.x) / radiusPx;
      v.pitch = clamp(start.pitch + (e.clientY - start.y) / radiusPx, -MAX_PITCH, MAX_PITCH);

      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) {
        moved = true;
        spinning.current = true; // any real drag wakes the auto-spin back up
      }

      // speed of the swipe (smoothed), so letting go can carry on from it
      const now = performance.now();
      const dt = (now - last.t) / 1000;
      if (dt > 0.004) {
        const c = coast.current;
        c.yaw += ((v.yaw - last.yaw) / dt - c.yaw) * 0.5;
        c.pitch += ((v.pitch - last.pitch) / dt - c.pitch) * 0.5;
        last = { t: now, yaw: v.yaw, pitch: v.pitch };
      }
    };
    const onUp = () => {
      const c = coast.current;
      // held still before letting go (or never really dragged) → no coasting
      if (!moved || performance.now() - last.t > 100) {
        c.yaw = 0;
        c.pitch = 0;
      } else {
        c.yaw = clamp(c.yaw, -MAX_COAST, MAX_COAST);
        c.pitch = clamp(c.pitch, -MAX_COAST, MAX_COAST);
      }
      start = null;
      dragging.current = false;
      setCanvasCursor(gl, 'grab');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, yaw: view.current.yaw, pitch: view.current.pitch };
      last = { t: performance.now(), yaw: view.current.yaw, pitch: view.current.pitch };
      moved = false;
      goal.current = null; // grabbing the globe cancels a turn in progress…
      coast.current = { yaw: 0, pitch: 0 }; // …and any coasting
      dragging.current = true;
      setCanvasCursor(gl, 'grabbing');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    setCanvasTouchAction(gl, 'none');
    canvas.addEventListener('pointerdown', onDown);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, draggable]);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const v = view.current;
    const turn = goal.current;
    if (turn) {
      const ease = 1 - Math.exp(-delta * 4); // bigger number = snappier
      const dYaw = wrapAngle(turn.yaw - v.yaw);
      const dPitch = turn.pitch - v.pitch;
      v.yaw += dYaw * ease;
      v.pitch += dPitch * ease;
      if (Math.abs(dYaw) < 0.002 && Math.abs(dPitch) < 0.002) {
        view.current = { ...turn };
        goal.current = null;
      }
    } else if (!dragging.current) {
      // keeps spinning continuously — except while the pointer is over a city dot,
      // which then stays put under it (so it can be read and clicked)
      if (enabled && spinning.current && !holdRef?.current) v.yaw += delta * SPIN_SPEED;

      // coasting after a flick: carries on from the swipe's speed, slowing to a stop
      const c = coast.current;
      if (c.yaw !== 0 || c.pitch !== 0) {
        const dt = Math.min(delta, 0.1); // a hiccup in the frame rate shouldn't fling it
        v.yaw += c.yaw * dt;
        const pitch = v.pitch + c.pitch * dt;
        v.pitch = clamp(pitch, -MAX_PITCH, MAX_PITCH);
        if (pitch !== v.pitch) c.pitch = 0; // hit the top/bottom
        const slow = Math.exp(-dt * COAST_DECAY);
        c.yaw *= slow;
        c.pitch *= slow;
        if (Math.abs(c.yaw) < 0.001 && Math.abs(c.pitch) < 0.001) {
          c.yaw = 0;
          c.pitch = 0;
        }
      }
    }
    // yaw first, then pitch about the screen's horizontal axis
    group.rotation.set(view.current.pitch, view.current.yaw, 0);
  });
  return <group ref={ref}>{children}</group>;
}

// (these live outside the components so they can touch the canvas element)
// the mouse pointer over the globe: a hand over a city, "grab" elsewhere
function setCanvasCursor(gl, value) {
  gl.domElement.style.cursor = value;
}
function setCanvasTouchAction(gl, value) {
  gl.domElement.style.touchAction = value;
}

// The cities you can pick (src/data/cities.js, plus "Your location" if it was
// shared): a small dot each — no labels on the globe itself; the name shows in
// the Data panel, or in a hover label on the intro screen — with the selected
// one in yellow. Click a dot to select it. Hovering one lights it up. Each dot
// has a bigger invisible click area around it, and a globe-sized invisible
// "blocker" keeps clicks from reaching cities on the far side of the globe.
function CityMarkers({ cities, selectedLabel, onSelectCity, onHoverCity, holdRef }) {
  const gl = useThree((state) => state.gl);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const yellow = brandYellow().hex;
  const setCursor = (value) => setCanvasCursor(gl, value);
  const stop = (e) => e.stopPropagation();

  return (
    <group>
      <mesh onClick={stop} onPointerOver={stop} onPointerMove={stop} onPointerUp={stop}>
        <sphereGeometry args={[RADIUS, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {cities.map((city) => {
        const selected = city.label === selectedLabel;
        const hovered = !selected && city.label === hoveredLabel;
        return (
          <group key={city.label} position={latLonToVector3(city.lat, city.lon, RADIUS * 1.012)}>
            {(selected || hovered) && (
              <mesh renderOrder={3}>
                <sphereGeometry args={[selected ? 0.034 : 0.027, 16, 16]} />
                {/* depthWrite off, or this ring would hide the yellow dot inside it */}
                <meshBasicMaterial color="#1b1c1a" transparent depthWrite={false} toneMapped={false} />
              </mesh>
            )}
            <mesh renderOrder={4}>
              <sphereGeometry args={[selected ? 0.026 : hovered ? 0.02 : 0.013, 16, 16]} />
              <meshBasicMaterial color={selected || hovered ? yellow : '#1b1c1a'} transparent toneMapped={false} />
            </mesh>
            <mesh
              renderOrder={5}
              onClick={(e) => {
                if (e.delta > 4) return; // that was a drag, not a click
                e.stopPropagation();
                onSelectCity?.(city);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setCursor('pointer');
                setHoveredLabel(city.label);
                if (holdRef) holdRef.current = true; // stop the spin while it's under the pointer
              }}
              onPointerMove={(e) => onHoverCity?.(city, e.nativeEvent.clientX, e.nativeEvent.clientY)}
              onPointerOut={() => {
                setCursor('grab');
                setHoveredLabel((current) => (current === city.label ? null : current));
                if (holdRef) holdRef.current = false;
                onHoverCity?.(null);
              }}
            >
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function Globe3D({
  interactive = true,
  autoRotate = true,
  year = 2025,
  selected = null,
  onSelect,
  className,
  paused = false,
  cloud = false, // draw the disease cloud
  cloudYear = TIMELINE.today, // …as it looks in this year
  dots = true, // the green "mosquito territory" dots (they follow `year`)
  filled = true, // false = see-through, outline only
  cities = null, // a list of places to show as clickable dots (replaces click-anywhere)
  selectedCity = null, // the label of the one that's selected
  onSelectCity, // called with the city that was clicked
  onHoverCity, // called as the pointer moves over a city — (city, clientX, clientY) — and with null when it leaves
  focus = null, // { lat, lon } — turn the globe to face this place, smoothly
}) {
  // true while the pointer is over a city dot: the auto-spin holds still then
  const holdSpin = useRef(false);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      {/* fov/distance tuned with margin so the sphere never clips against
          the canvas edge; the wrapping container is kept square (1:1) by
          its caller so this framing holds at any viewport size.
          `paused` stops rendering entirely (used while the Data panel is
          slid off-screen, so a hidden globe isn't burning GPU). */}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 42, near: 1, far: 10 }}
        frameloop={paused ? 'never' : 'always'}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <AutoRotateGroup enabled={autoRotate} focus={focus} draggable={interactive && !!cities} holdRef={holdSpin}>
            <GlobeSurface filled={filled} />
            {cloud && <DiseaseCloud year={cloudYear} />}
            {dots && <TerritoryDots year={year} />}
            <SelectedMarker lat={selected?.lat} lon={selected?.lon} />
            {interactive && !cities && <InteractionSphere onSelect={onSelect} />}
            {cities && (
              <CityMarkers
                cities={cities}
                selectedLabel={selectedCity}
                onSelectCity={onSelectCity}
                onHoverCity={onHoverCity}
                holdRef={holdSpin}
              />
            )}
          </AutoRotateGroup>
        </Suspense>
        {interactive && !cities && (
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
