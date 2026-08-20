// ---------------------------------------------------------------------------
// PLACEHOLDER DATA LAYER
// ---------------------------------------------------------------------------
// Everything in this file stands in for a future backend call that resolves
// a place name to real coordinates + real bug/disease data. Structure is
// written so swapping this for a fetch() later doesn't touch any component.
// ---------------------------------------------------------------------------

// A handful of seed locations so the intro flow is fully testable offline.
// Falls back to a deterministic "guess" (hashed lat/lon + mid intensity) for
// anything typed that isn't in this list, so the flow never dead-ends.
const KNOWN_LOCATIONS = {
  'newton, ma': { lat: 42.33, lon: -71.21, label: 'Newton, MA', intensity: 0.35, timezoneOffset: -4 },
  'miami, fl': { lat: 25.76, lon: -80.19, label: 'Miami, FL', intensity: 0.85, timezoneOffset: -4 },
  'lagos, nigeria': { lat: 6.52, lon: 3.38, label: 'Lagos, Nigeria', intensity: 0.95, timezoneOffset: 1 },
  'london, uk': { lat: 51.51, lon: -0.13, label: 'London, UK', intensity: 0.15, timezoneOffset: 1 },
  'bangkok, thailand': { lat: 13.76, lon: 100.5, label: 'Bangkok, Thailand', intensity: 0.9, timezoneOffset: 7 },
  'phoenix, az': { lat: 33.45, lon: -112.07, label: 'Phoenix, AZ', intensity: 0.4, timezoneOffset: -7 },
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function resolveLocation(query) {
  const key = query.trim().toLowerCase();
  if (KNOWN_LOCATIONS[key]) return { ...KNOWN_LOCATIONS[key] };

  // deterministic fallback so any typed location still "works" during dev
  const h = hashString(key || 'default');
  const lat = ((h % 140) - 70);
  const lon = (((h >> 3) % 360) - 180);
  return {
    lat,
    lon,
    label: query.trim() || 'Unknown location',
    intensity: 0.3 + ((h % 60) / 100), // 0.3 - 0.9
    timezoneOffset: Math.round(lon / 15),
  };
}

// Mosquito territory "clusters" used to render dots on the globe, and to
// animate spread over the 2025 -> 2100 timeline. Each cluster has a birth
// year (when it starts appearing) and a growth rate (how fast it densifies).
// This is illustrative placeholder geography, not scientific projection data.
export const TERRITORY_CLUSTERS = [
  { lat: 51, lon: 10, bornYear: 2025, growth: 0.9 },   // central europe
  { lat: 55, lon: 25, bornYear: 2040, growth: 0.7 },   // eastern europe
  { lat: 45, lon: 35, bornYear: 2060, growth: 0.5 },   // black sea
  { lat: 6, lon: -5, bornYear: 2025, growth: 1.0 },    // west africa
  { lat: 9, lon: 8, bornYear: 2025, growth: 1.0 },     // west africa
  { lat: 4, lon: 20, bornYear: 2030, growth: 0.8 },    // central africa
  { lat: -4, lon: 15, bornYear: 2045, growth: 0.6 },   // central africa south
  { lat: 14, lon: -16, bornYear: 2025, growth: 0.9 },  // senegal
];

export function getGlobalStats(year) {
  // simple linear-ish placeholder growth curve for the "problem" panel
  const t = (year - 2025) / (2100 - 2025);
  return {
    malariaCases: Math.round(30_000_000 * (1 + t * 1.4)),
    dengueCases: Math.round(500_000 * (1 + t * 2.1)),
    bugDiseaseDeaths: Math.round(700_000 * (1 + t * 1.6)),
  };
}
