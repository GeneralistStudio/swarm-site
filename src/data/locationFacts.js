// ---------------------------------------------------------------------------
// LOCATION FACTS — what the Data panel's "Location" section shows
// ---------------------------------------------------------------------------
// For the place that's selected, in the year and at the time of day the
// sliders are on:
//
//   region        "North America", "Europe" … (the city's own, or worked out
//                 from latitude/longitude for any other place)
//   temperature   °C (the panel shows °F and °C). Built from the place's
//                 normal climate, then:
//                   + the time of YEAR — today's date, so it's warm in July in
//                     Boston and warm in January in Sydney
//                   + the time of DAY  — coolest around 3 AM, warmest ~3 PM
//                   + long-term WARMING for the chosen year — cooler in 1900,
//                     warmer by 2100, and more at high latitudes than near the
//                     equator
//   mosquito / tick population
//                 a 0–1 index and a word for it, from the same disease-hotspot
//                 model that decides how many bugs are in the swarm (see
//                 bugActivity.js), but for the whole year-round population,
//                 not "how active are they at 3 PM"
//
// PLACEHOLDER: the shapes are realistic, the numbers are illustrative.
//   - Warming follows a moderate-emissions path (roughly IPCC AR6: ~1.1 °C
//     above 1850–1900 in 2011–2020, ~2.7 °C by 2100), with polar
//     amplification — land near the poles warms about twice the global rate.
//   - Climate normals for the cities are rounded long-term averages.
// NEXT PHASE: replace getLocationFacts() with real climate + vector data.
// ---------------------------------------------------------------------------
import { populationIndex } from './bugActivity';
import { TIMELINE } from './diseaseHotspots';

// ---- knobs -----------------------------------------------------------------
// the words for a population, and where each starts (index 0–1). Mosquitoes are
// everywhere, so even a place with no disease hotspot sits at "Low" (index
// ≈ 0.1); ticks need particular habitat, so most places are "Very low".
const LEVELS = [
  { from: 0, label: 'Very low' },
  { from: 0.06, label: 'Low' },
  { from: 0.25, label: 'Moderate' },
  { from: 0.45, label: 'High' },
  { from: 0.7, label: 'Very high' },
];
// ---------------------------------------------------------------------------

export function levelOf(index) {
  let label = LEVELS[0].label;
  for (const level of LEVELS) if (index >= level.from) label = level.label;
  return label;
}

// ---- region ----------------------------------------------------------------
// Rough boxes — enough to name the continent any place (such as "Your location")
// falls in. Order matters: smaller / more specific areas are checked first.
export function regionOf(lat, lon) {
  if (lat < -60) return 'Antarctica';
  // Australia, New Zealand and the Pacific islands (Hawaii, Fiji, Polynesia…)
  if ((lat <= -10 && lon >= 112) || (lat < 0 && lon >= 141) || (lat < 25 && (lon >= 165 || lon <= -140))) return 'Oceania';
  // the narrow land bridge: Guatemala to Panama (Mexico itself is North America)
  if (lat >= 7 && lat <= 18.5 && lon >= -92.5 && lon <= -77.2) return 'Central America';
  if (lat >= -56 && lat < 13 && lon >= -82 && lon <= -34) return 'South America';
  if ((lat >= 7 && lon >= -170 && lon <= -50) || (lat > 59 && lon > -75 && lon <= -25)) return 'North America';
  // Africa — but not the Arabian side, east of the Red Sea
  if (lon >= -20 && lon <= 52 && lat >= -36 && lat <= 37 && !(lon > 33 && lat > 12)) return 'Africa';
  if (lat >= 36 && lat <= 72 && lon >= -25 && lon <= 40 && !(lat < 42 && lon > 28)) return 'Europe';
  if (lon >= 25 && lat >= -10) return 'Asia';
  // whatever is left is open water
  if (lon >= -60 && lon < 25) return lat >= 0 ? 'North Atlantic' : 'South Atlantic';
  if (lon >= 25 && lon < 112) return 'Indian Ocean';
  return 'Pacific Ocean';
}

// ---- climate ---------------------------------------------------------------
// The normal climate of a place: { mean, season, day } in °C (see cities.js).
// Places that have their own are used as they are; anything else is estimated
// from its latitude — about 27 °C at the equator, cooling toward the poles,
// with bigger winter/summer swings the further from the equator.
export function climateFor(location) {
  if (location.climate) return location.climate;
  const lat = Math.abs(location.lat);
  return {
    mean: Math.max(-25, 27 - 0.0072 * lat * lat),
    season: Math.min(20, 0.22 * lat),
    day: 5,
  };
}

// ---- warming ---------------------------------------------------------------
// Global surface temperature in each year, °C above the 1850–1900 average
// (illustrative, moderate-emissions path). Years in between are interpolated.
const GLOBAL_ANOMALY = [
  [1900, 0.0],
  [1940, 0.2],
  [1975, 0.2],
  [2000, 0.65],
  [2015, 1.0],
  [TIMELINE.today, 1.4],
  [2050, 2.0],
  [2075, 2.5],
  [2100, 2.7],
];

function globalAnomaly(year) {
  const table = GLOBAL_ANOMALY;
  if (year <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (year <= table[i][0]) {
      const [y0, a0] = table[i - 1];
      const [y1, a1] = table[i];
      return a0 + ((a1 - a0) * (year - y0)) / (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

// Land warms faster than the global average, and the poles fastest of all.
const amplification = (lat) => 1.15 + 0.9 * (Math.abs(lat) / 90) ** 2;

// how much warmer (or cooler) a place is in `year` than it is today, in °C
export function warmingVsToday(lat, year) {
  return (globalAnomaly(year) - globalAnomaly(TIMELINE.today)) * amplification(lat);
}

// ---- temperature -----------------------------------------------------------
const dayOfYear = (date) => Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86_400_000);

// °C right now (today's date, the given hour) in the given year
export function temperatureC(location, year, hour, date = new Date()) {
  const climate = climateFor(location);
  // hottest around 20 July in the northern half of the world, 20 January in the southern
  const hottestDay = location.lat >= 0 ? 201 : 20;
  const season = climate.season * Math.cos((2 * Math.PI * (dayOfYear(date) - hottestDay)) / 365.25);
  // coolest around 3 AM, warmest around 3 PM
  const daily = climate.day * Math.cos((2 * Math.PI * (hour - 15)) / 24);
  return climate.mean + season + daily + warmingVsToday(location.lat, year);
}

// ---- the lot ---------------------------------------------------------------
export function getLocationFacts(location, year, hour, date = new Date()) {
  const population = populationIndex(location, year);

  return {
    region: location.region ?? regionOf(location.lat, location.lon),
    temperatureC: temperatureC(location, year, hour, date),
    mosquito: { index: population.mosquito, level: levelOf(population.mosquito) },
    tick: { index: population.tick, level: levelOf(population.tick) },
  };
}
