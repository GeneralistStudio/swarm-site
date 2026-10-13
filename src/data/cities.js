// ---------------------------------------------------------------------------
// CITIES — the places you can switch between in the Data panel
// ---------------------------------------------------------------------------
// Each one shows as a small dot on the globe (click it, or use the arrows
// beside the location label); the globe turns to face it. Order here = the
// order the arrows step through.
//
//   label           what the pill shows (shown in capitals)
//   lat / lon       where the dot goes
//   intensity       0 – 1: how heavy the bug pressure is. Drives how many bugs
//                   swarm, and how strongly the disease mix leans
//   timezoneOffset  hours from UTC — sets the local time of day (the sky)
//   region          the world region shown in the Data panel's "Location" section
//   climate         what the temperature there is normally like, in °C:
//                     mean    the year-round average
//                     season  how far the average swings between winter and
//                             summer (half the gap between the coldest and
//                             hottest month)
//                     day     how far it swings between night and afternoon
//                             (half the gap between the day's low and high)
//                   Rough long-term averages from memory, rounded —
//                   PLACEHOLDERS. (Any other place — such as "Your location" —
//                   gets an estimate from its latitude: see climateFor() in
//                   locationFacts.js.)
//
// All of these are cities where the green cloud (src/data/diseaseHotspots.js)
// is, or arrives as the years pass.
//
// PLACEHOLDER numbers. NEXT PHASE: drive these (and the diseases per city)
// from real regional data.
// ---------------------------------------------------------------------------

export const CITIES = [
  // North America — Lyme and West Nile, working their way north and west
  // (Winnipeg: faint today, then the Lyme cloud fills in over it from ~2035)
  { label: 'Boston, MA', lat: 42.36, lon: -71.06, intensity: 0.35, timezoneOffset: -4, region: 'North America', climate: { mean: 10.9, season: 12.3, day: 4.5 } },
  { label: 'Los Angeles, CA', lat: 34.05, lon: -118.24, intensity: 0.4, timezoneOffset: -7, region: 'North America', climate: { mean: 18.6, season: 4.6, day: 5.0 } },
  { label: 'Montreal, QC', lat: 45.5, lon: -73.57, intensity: 0.3, timezoneOffset: -4, region: 'North America', climate: { mean: 6.8, season: 15.7, day: 5.0 } },
  { label: 'Winnipeg, MB', lat: 49.9, lon: -97.14, intensity: 0.3, timezoneOffset: -5, region: 'North America', climate: { mean: 3.0, season: 18.0, day: 6.0 } },

  // Mexico — dengue climbing into the highlands
  { label: 'Mexico City, MX', lat: 19.43, lon: -99.13, intensity: 0.6, timezoneOffset: -6, region: 'North America', climate: { mean: 17.4, season: 2.6, day: 8.0 } },

  // South America — dengue heartland, then moving south
  { label: 'São Paulo, BR', lat: -23.55, lon: -46.63, intensity: 0.8, timezoneOffset: -3, region: 'South America', climate: { mean: 19.5, season: 3.0, day: 4.0 } },
  { label: 'Buenos Aires, AR', lat: -34.6, lon: -58.38, intensity: 0.5, timezoneOffset: -3, region: 'South America', climate: { mean: 18.0, season: 6.9, day: 4.5 } },

  // Europe — West Nile and dengue arriving from the south, Lyme from the north
  { label: 'Rome, IT', lat: 41.9, lon: 12.5, intensity: 0.4, timezoneOffset: 2, region: 'Europe', climate: { mean: 15.5, season: 8.8, day: 5.0 } },
  { label: 'Berlin, DE', lat: 52.52, lon: 13.4, intensity: 0.25, timezoneOffset: 2, region: 'Europe', climate: { mean: 10.0, season: 9.5, day: 4.5 } },

  // Africa — malaria's stronghold, spreading into the highlands and the south
  { label: 'Nairobi, KE', lat: -1.29, lon: 36.82, intensity: 0.8, timezoneOffset: 3, region: 'Africa', climate: { mean: 18.0, season: 1.5, day: 5.5 } },
  { label: 'Johannesburg, ZA', lat: -26.2, lon: 28.05, intensity: 0.6, timezoneOffset: 2, region: 'Africa', climate: { mean: 16.4, season: 4.7, day: 7.0 } },

  // Asia — dengue hub, and the Japanese archipelago once it warms
  { label: 'Bangkok, TH', lat: 13.76, lon: 100.5, intensity: 0.9, timezoneOffset: 7, region: 'Asia', climate: { mean: 29.0, season: 2.0, day: 4.0 } },
  { label: 'Tokyo, JP', lat: 35.68, lon: 139.69, intensity: 0.4, timezoneOffset: 9, region: 'Asia', climate: { mean: 15.8, season: 10.6, day: 3.5 } },

  // Oceania — dengue moving down the east coast
  { label: 'Brisbane, AU', lat: -27.47, lon: 153.03, intensity: 0.55, timezoneOffset: 10, region: 'Oceania', climate: { mean: 21.4, season: 5.1, day: 5.0 } },
  { label: 'Sydney, AU', lat: -33.87, lon: 151.21, intensity: 0.35, timezoneOffset: 11, region: 'Oceania', climate: { mean: 18.4, season: 5.5, day: 4.0 } },
];
