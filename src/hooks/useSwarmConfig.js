import { useMemo } from 'react';
import { getBugTargets } from '../data/bugActivity';

// Base config lifted straight from the swarm-prototype.html tuning values.
// `intensity` (0-1, from location data) scales how aggressively bugs swarm and
// how far the cursor's reach extends. HOW MANY bugs there are — and how many
// are mosquitoes vs ticks — comes from src/data/bugActivity.js, using the
// place, the year and the time of day.
const BASE_CONFIG = {
  maxBugs: 150,
  seedBugs: 25,
  captureRadius: 90,
  spawnEveryPx: 40,
  orbitRadiusMin: 30,
  orbitRadiusMax: 110,
  orbitSpeed: 0.035,
  followStrength: 0.05,
  maxSpeedSwarm: 7,
  maxSpeedWander: 1.2,
  wanderJitter: 0.25,
  bugSize: 4.3,

  repelRadiusStart: 260,
  repelDuration: 3500,
  repelForce: 16,
  maxSpeedFlee: 14,
  fleeRecoveryMs: 550,
  fleeDamping: 0.94,

  detachSpeed: 55,
  detachKick: 8,

  // Ticks: slow grass-bound crawlers that latch onto a fixed point near the
  // cursor instead of swarming around it.
  maxTicks: 18,
  seedTicks: 6,
  tickCrawlSpeed: 0.65, // slower than mosquitoes' 1.2 wander speed, but brisk
  tickAttachRadius: 20, // the "inner circle" an attached tick sits on
  tickSize: 5,
  grassBandFraction: 0.22, // bottom slice of the canvas ticks are confined to
};

export function useSwarmConfig(location, year, hour) {
  const intensity = location?.intensity ?? 0.5;
  const lat = location?.lat ?? 0;
  const lon = location?.lon ?? 0;
  // the clock ticks over by the minute (and by the second while scrubbing the
  // time slider) — round it so the counts are only recomputed every ~6 minutes
  const hourStep = Math.round(hour * 10) / 10;

  return useMemo(() => {
    const clamped = Math.min(1, Math.max(0, intensity));
    const targets = getBugTargets({ lat, lon }, year, hourStep);
    return {
      ...BASE_CONFIG,
      // how many of each there SHOULD be right now. The swarm drifts toward
      // these (adding or removing bugs) whenever they change.
      targetBugs: targets.mosquitoes,
      targetTicks: targets.ticks,
      // waving the cursor around pulls in extra mosquitoes, up to this ceiling
      maxBugs: Math.round(60 + targets.mosquitoes * 1.8),
      seedBugs: targets.mosquitoes,
      spawnEveryPx: Math.round(70 - clamped * 45), // denser locations spawn faster
      captureRadius: Math.round(70 + clamped * 40),
      maxTicks: targets.ticks,
      seedTicks: targets.ticks,
    };
  }, [intensity, lat, lon, year, hourStep]);
}
