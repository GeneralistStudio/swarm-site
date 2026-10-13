// ---------------------------------------------------------------------------
// BUG ACTIVITY — how many mosquitoes and ticks there are, and which kind
// ---------------------------------------------------------------------------
// Three things decide it:
//
//   WHERE   Each disease belongs to one carrier — mosquitoes carry malaria,
//           dengue, West Nile and Triple E; ticks carry Lyme (see DISEASES in
//           diseaseData.js). Add up the hotspots near a place
//           (diseaseHotspots.js) by carrier and you get how much mosquito
//           pressure vs tick pressure it has. Boston sits on the Lyme belt →
//           mostly ticks. Los Angeles has West Nile but no Lyme → mostly
//           mosquitoes. (The US case counts in the "Vector-borne hotspots"
//           artifact say the same: Massachusetts ~5,000 Lyme cases to 11 West
//           Nile; LA County ~110 West Nile cases and no Lyme.)
//
//   WHEN    (year) Each hotspot grows in or fades out over the years (its
//           from / until in diseaseHotspots.js), so places have more bugs in
//           the future and fewer in the past.
//
//   HOUR    (time of day) Mosquitoes and ticks keep different hours — see
//           mosquitoActivity() and tickActivity() below.
//
// PLACEHOLDER: the shapes are based on the research cited below, but every
// number is illustrative. NEXT PHASE: swap in real regional abundance data.
// ---------------------------------------------------------------------------
import { DISEASE_HOTSPOTS, hotspotStrength } from './diseaseHotspots';
import { DISEASES } from './diseaseData';

// ---- knobs ----------------------------------------------------------------
const MOSQUITOES_PER_PRESSURE = 100; // how many mosquitoes one unit of mosquito pressure brings
const TICKS_PER_PRESSURE = 40; // …and the same for ticks
const BASE_MOSQUITO = 0.25; // mosquitoes are everywhere, even far from any hotspot…
const BASE_TICK = 0.04; // …ticks mostly aren't (they need particular habitat)
const MAX_MOSQUITOES = 260;
const MAX_TICKS = 70;
// ---------------------------------------------------------------------------

const bump = (hour, center, width) => {
  // a smooth hill around `center` o'clock that wraps past midnight
  let d = Math.abs(hour - center);
  d = Math.min(d, 24 - d);
  return Math.exp(-0.5 * (d / width) ** 2);
};

// Mosquitoes — 0 to 1, by hour of day. Two peaks, dawn and dusk, a moderate
// level through the night, and a deep dip in the midday heat.
// Why: different species keep different hours — Aedes (dengue) bites around
// 7 AM and again around 5 PM; Culex (West Nile) from dusk into the evening;
// Anopheles (malaria) at night — and together they add up to a dawn peak, a
// dusk peak and a quiet midday. Sources:
//   https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8964714/  (Aedes aegypti, diel activity)
//   https://link.springer.com/article/10.1186/s41936-026-00564-8  (day- vs night-biting mosquitoes)
export function mosquitoActivity(hour) {
  const dawn = bump(hour, 6.2, 1.6);
  const dusk = bump(hour, 18.8, 1.9);
  const night = bump(hour, 0, 4.2);
  return Math.min(1, 0.25 + 0.3 * night + 0.75 * Math.max(dawn, dusk));
}

// Ticks — 0 to 1, by hour of day. Much flatter than mosquitoes: ticks don't
// follow dawn/dusk, they follow humidity and temperature. Research finds
// questing highest from late afternoon through the night (peaking just after
// dark) and lowest in the dry heat of late morning and midday. Sources:
//   https://pubmed.ncbi.nlm.nih.gov/14680102/  (diurnal questing of Ixodes nymphs)
//   https://academic.oup.com/jme/article/55/6/1569/5067279  (Ixodes scapularis questing)
export function tickActivity(hour) {
  return 0.55 + 0.45 * bump(hour, 22, 5.5);
}

const toRad = Math.PI / 180;
function distanceDegrees(lat1, lon1, lat2, lon2) {
  const a =
    Math.sin(((lat2 - lat1) * toRad) / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(((lon2 - lon1) * toRad) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(a)))) / toRad;
}

// How much mosquito-borne and tick-borne disease there is around a place in a
// given year: every hotspot nearby counts, by how strong it is that year and
// how close it is (fading out over about the hotspot's own width).
export function localPressure(location, year) {
  const pressure = { mosquito: 0, tick: 0 };
  for (const hotspot of DISEASE_HOTSPOTS) {
    const strength = hotspotStrength(hotspot, year);
    if (strength < 0.01) continue;
    const sigma = hotspot.spread * 0.9;
    const distance = distanceDegrees(location.lat, location.lon, hotspot.lat, hotspot.lon);
    if (distance > sigma * 3.5) continue;
    const carrier = DISEASES[hotspot.disease].carriedBy[0];
    pressure[carrier] += hotspot.weight * strength * Math.exp(-0.5 * (distance / sigma) ** 2);
  }
  return pressure;
}

// The headline: how many of each bug there should be right now.
// Mosquitoes and ticks each follow their own pressure (so a place with lots of
// Lyme is tick-heavy, a place with only West Nile is all mosquitoes), then
// each is scaled by how active that bug is at this hour. Returns
// { mosquitoes, ticks } (whole numbers).
export function getBugTargets(location, year, hour) {
  const pressure = localPressure(location, year);
  const mosquitoes = MOSQUITOES_PER_PRESSURE * (BASE_MOSQUITO + pressure.mosquito) * mosquitoActivity(hour);
  const ticks = TICKS_PER_PRESSURE * (BASE_TICK + pressure.tick) * tickActivity(hour);
  return {
    mosquitoes: Math.min(MAX_MOSQUITOES, Math.max(4, Math.round(mosquitoes))),
    ticks: Math.min(MAX_TICKS, Math.max(1, Math.round(ticks))),
  };
}

// How big the mosquito and tick POPULATIONS are around a place in a given
// year, each as a 0–1 index (1 = as many as the swarm ever shows).
//
// This is the same hotspot pressure as getBugTargets() above, but leaves out
// the time-of-day factor: how active the bugs are changes through the day, how
// many there are doesn't. So it moves with the place and the year, not the
// clock. Used by the Data panel's "Location" section (locationFacts.js).
export function populationIndex(location, year) {
  const pressure = localPressure(location, year);
  const mosquitoes = MOSQUITOES_PER_PRESSURE * (BASE_MOSQUITO + pressure.mosquito);
  const ticks = TICKS_PER_PRESSURE * (BASE_TICK + pressure.tick);
  return {
    mosquito: Math.min(1, mosquitoes / MAX_MOSQUITOES),
    tick: Math.min(1, ticks / MAX_TICKS),
  };
}
