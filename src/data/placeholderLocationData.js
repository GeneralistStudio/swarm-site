// ---------------------------------------------------------------------------
// PLACEHOLDER DATA LAYER
// ---------------------------------------------------------------------------
// Everything in this file stands in for a future backend call that resolves
// real bug/disease data. Structure is written so swapping this for a fetch()
// later doesn't touch any component. (The places themselves — the cities and
// "Your location" — live in cities.js and myLocation.js.)
// ---------------------------------------------------------------------------

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
