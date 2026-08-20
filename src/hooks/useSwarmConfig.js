import { useMemo } from 'react';

// Base config lifted straight from the swarm-prototype.html tuning values.
// `intensity` (0-1, from location data) scales population + aggressiveness
// so a high-risk location genuinely feels more overwhelming.
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
  bugSize: 5,

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
  tickSpawnIntervalMs: 2200,
  tickCrawlSpeed: 0.65, // slower than mosquitoes' 1.2 wander speed, but brisk
  tickAttachRadius: 20, // the "inner circle" an attached tick sits on
  tickSize: 5,
  grassBandFraction: 0.22, // bottom slice of the canvas ticks are confined to
};

export function useSwarmConfig(intensity = 0.5) {
  return useMemo(() => {
    const clamped = Math.min(1, Math.max(0, intensity));
    return {
      ...BASE_CONFIG,
      maxBugs: Math.round(60 + clamped * 260),
      seedBugs: Math.round(10 + clamped * 40),
      spawnEveryPx: Math.round(70 - clamped * 45), // denser locations spawn faster
      captureRadius: Math.round(70 + clamped * 40),
      maxTicks: Math.round(6 + clamped * 24),
      seedTicks: Math.round(2 + clamped * 6),
    };
  }, [intensity]);
}
