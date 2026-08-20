import { useMemo } from 'react';
import * as THREE from 'three';
import { mesh } from 'topojson-client';
import landTopology from 'world-atlas/land-110m.json';
import { latLonToVector3 } from './geo';

// Real coastline data (Natural Earth 110m, via world-atlas) instead of a
// lat/lon grid. `mesh` (rather than `feature`) gives us the outline as a
// single deduplicated line network — no double-drawn shared borders.
export default function Continents({ radius = 1, color = '#1b1c1a' }) {
  const segments = useMemo(() => {
    const landMesh = mesh(landTopology, landTopology.objects.land);
    // landMesh.coordinates is an array of LineStrings: [ [ [lon,lat], ... ], ... ]
    const lines = [];
    for (const line of landMesh.coordinates) {
      const pts = line.map(([lon, lat]) => new THREE.Vector3(...latLonToVector3(lat, lon, radius)));
      if (pts.length > 1) lines.push(pts);
    }
    return lines;
  }, [radius]);

  return (
    <group>
      {segments.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pts.length}
              array={new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} />
        </line>
      ))}
    </group>
  );
}
