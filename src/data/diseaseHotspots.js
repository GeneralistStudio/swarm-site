// ---------------------------------------------------------------------------
// DISEASE HOTSPOTS — the data behind the green cloud on the globes
// ---------------------------------------------------------------------------
// Where mosquito- and tick-borne disease concentrates, all diseases combined
// into one map. Each row is one hotspot:
//   disease  which disease it belongs to (an id from DISEASES in diseaseData.js)
//   lat/lon  center of the hotspot, in degrees
//   weight   how many cases cluster there, 0 – 1.3 (bigger = denser)
//   spread   how wide the cloud reaches, in degrees
//
// …and, optionally, WHEN it's there (this is what the year slider moves through):
//   from     the year it starts appearing  (it grows in over `ramp` years)
//   until    the year it starts fading out (it shrinks away over `ramp` years)
//   ramp     how many years the growing in / fading out takes (default 25)
// A row with neither `from` nor `until` is there in every year.
//
// "Today" (see TIMELINE below) shows the original map: everything that has
// emerged by now, nothing historic left, nothing projected yet.
//
// PLACEHOLDER: illustrative — the broad shape of the story (malaria pushed
// back out of the temperate zones, dengue / West Nile / Lyme emerging, then
// warming carrying all of them poleward), NOT real case counts or projections.
// NEXT PHASE: replace these rows with real data; src/components/globe/
// diseaseCloud.js turns whatever is here into the cloud.
// ---------------------------------------------------------------------------

// The year slider in the Data panel: its range, and what "today" is.
export const TIMELINE = {
  min: 1900,
  max: 2100,
  today: new Date().getFullYear(),
};

const smoothstep = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// How present a hotspot is in a given year: 0 (not there) … 1 (full strength).
export function hotspotStrength(hotspot, year) {
  const ramp = hotspot.ramp ?? 25;
  const grownIn = hotspot.from == null ? 1 : smoothstep((year - hotspot.from) / ramp);
  const fadedOut = hotspot.until == null ? 0 : smoothstep((year - hotspot.until) / ramp);
  return grownIn * (1 - fadedOut);
}

export const DISEASE_HOTSPOTS = [
  // Malaria — sub-Saharan Africa carries most of the world's burden
  { disease: 'malaria', lat: 9, lon: 8, weight: 1.3, spread: 7 },
  { disease: 'malaria', lat: -3, lon: 24, weight: 1.3, spread: 9 },
  { disease: 'malaria', lat: 2, lon: 32, weight: 0.9, spread: 5 },
  { disease: 'malaria', lat: 8, lon: 38, weight: 0.7, spread: 5 },
  { disease: 'malaria', lat: -16, lon: 36, weight: 0.9, spread: 5 },
  { disease: 'malaria', lat: -6, lon: 35, weight: 0.8, spread: 5 },
  { disease: 'malaria', lat: 13, lon: 0, weight: 0.9, spread: 8 },
  { disease: 'malaria', lat: 7, lon: -3, weight: 0.7, spread: 5 },
  { disease: 'malaria', lat: 5, lon: 15, weight: 0.6, spread: 5 },
  { disease: 'malaria', lat: 9, lon: 30, weight: 0.5, spread: 5 },
  { disease: 'malaria', lat: -19, lon: 47, weight: 0.5, spread: 4 },
  { disease: 'malaria', lat: -12, lon: 20, weight: 0.6, spread: 6 },
  { disease: 'malaria', lat: 21, lon: 84, weight: 0.7, spread: 5 },
  { disease: 'malaria', lat: 21, lon: 96, weight: 0.4, spread: 3 },
  { disease: 'malaria', lat: -4, lon: 138, weight: 0.5, spread: 4 },
  { disease: 'malaria', lat: -6, lon: 144, weight: 0.6, spread: 3 },
  { disease: 'malaria', lat: -4, lon: -65, weight: 0.4, spread: 6 },
  { disease: 'malaria', lat: 31, lon: 68, weight: 0.3, spread: 4 },
  { disease: 'malaria', lat: 7, lon: -70, weight: 0.3, spread: 4 },
  { disease: 'malaria', lat: 15, lon: 45, weight: 0.2, spread: 3 },
  { disease: 'malaria', lat: 19, lon: -72, weight: 0.2, spread: 2 },

  // Dengue — Americas, South and Southeast Asia
  { disease: 'dengue', lat: -20, lon: -47, weight: 1.1, spread: 7, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: -8, lon: -40, weight: 0.7, spread: 6, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: 5, lon: -74, weight: 0.5, spread: 4, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: -18, lon: -60, weight: 0.5, spread: 5, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: -8, lon: -76, weight: 0.4, spread: 4, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: 16, lon: -92, weight: 0.5, spread: 5, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: 18, lon: -70, weight: 0.35, spread: 3, from: 1965, ramp: 35 },
  { disease: 'dengue', lat: 26, lon: -81, weight: 0.2, spread: 2, from: 1990, ramp: 20 },
  { disease: 'dengue', lat: 23.8, lon: 90.4, weight: 0.7, spread: 2.5, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 7.8, lon: 80.7, weight: 0.6, spread: 1.8, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 13, lon: 104, weight: 0.9, spread: 4, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 11, lon: 107, weight: 0.7, spread: 3, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 3.5, lon: 102, weight: 0.6, spread: 3, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: -7.5, lon: 110, weight: 0.8, spread: 4, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 13, lon: 122, weight: 0.9, spread: 3.5, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: -17, lon: 178, weight: 0.3, spread: 2, from: 1970, ramp: 30 },
  { disease: 'dengue', lat: -17, lon: 145, weight: 0.2, spread: 3, from: 1970, ramp: 30 },
  { disease: 'dengue', lat: 23, lon: 113, weight: 0.4, spread: 3, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 25, lon: 68, weight: 0.3, spread: 3, from: 1950, ramp: 35 },
  { disease: 'dengue', lat: 12, lon: -2, weight: 0.3, spread: 4, from: 1985, ramp: 30 },
  { disease: 'dengue', lat: -4, lon: 39, weight: 0.3, spread: 3, from: 1985, ramp: 30 },

  // West Nile — Mediterranean basin, southern Europe, US
  { disease: 'westNile', lat: 45, lon: 10.5, weight: 0.7, spread: 3, from: 1998, ramp: 15 },
  { disease: 'westNile', lat: 39, lon: 22, weight: 0.6, spread: 2.5, from: 2005, ramp: 12 },
  { disease: 'westNile', lat: 37.5, lon: -5.5, weight: 0.3, spread: 2.5, from: 2005, ramp: 12 },
  { disease: 'westNile', lat: 44, lon: 4, weight: 0.3, spread: 2.5, from: 1998, ramp: 15 },
  { disease: 'westNile', lat: 45, lon: 22, weight: 0.4, spread: 3.5, from: 1998, ramp: 15 },
  { disease: 'westNile', lat: 30.5, lon: 31, weight: 0.3, spread: 2.5 },
  { disease: 'westNile', lat: 32, lon: 35, weight: 0.2, spread: 1.5 },
  { disease: 'westNile', lat: 47, lon: 44, weight: 0.25, spread: 3, from: 1999, ramp: 15 },
  { disease: 'westNile', lat: 36, lon: -120, weight: 0.5, spread: 3.5, from: 1999, ramp: 8 },
  { disease: 'westNile', lat: 34, lon: -118, weight: 0.4, spread: 2, from: 1999, ramp: 8 },
  { disease: 'westNile', lat: 33.5, lon: -112, weight: 0.4, spread: 2.5, from: 1999, ramp: 8 },
  { disease: 'westNile', lat: 31, lon: -98, weight: 0.3, spread: 3.5, from: 1999, ramp: 8 },
  { disease: 'westNile', lat: 41.5, lon: -88, weight: 0.25, spread: 3, from: 1999, ramp: 8 },
  { disease: 'westNile', lat: 41, lon: -74, weight: 0.3, spread: 2.5, from: 1999, ramp: 8 },

  // Lyme — US Northeast and Upper Midwest, central and northern Europe
  { disease: 'lyme', lat: 42, lon: -73, weight: 1, spread: 4, from: 1975, ramp: 30 },
  { disease: 'lyme', lat: 45, lon: -91, weight: 0.7, spread: 4, from: 1985, ramp: 30 },
  { disease: 'lyme', lat: 39.5, lon: -77, weight: 0.7, spread: 3, from: 1975, ramp: 30 },
  { disease: 'lyme', lat: 45, lon: -77, weight: 0.4, spread: 4, from: 1985, ramp: 30 },
  { disease: 'lyme', lat: 51, lon: 13, weight: 0.8, spread: 5, from: 1965, ramp: 40 },
  { disease: 'lyme', lat: 59, lon: 15, weight: 0.5, spread: 4, from: 1965, ramp: 40 },
  { disease: 'lyme', lat: 60, lon: 24, weight: 0.5, spread: 3.5, from: 1965, ramp: 40 },
  { disease: 'lyme', lat: 47, lon: 12, weight: 0.6, spread: 3.5, from: 1965, ramp: 40 },
  { disease: 'lyme', lat: 53, lon: -2, weight: 0.2, spread: 2.5, from: 1965, ramp: 40 },
  { disease: 'lyme', lat: 56, lon: 60, weight: 0.3, spread: 6, from: 1992, ramp: 30 },
  { disease: 'lyme', lat: 56, lon: 80, weight: 0.2, spread: 6, from: 1992, ramp: 30 },
  { disease: 'lyme', lat: 46, lon: 128, weight: 0.4, spread: 4, from: 1985, ramp: 30 },
  { disease: 'lyme', lat: 43, lon: 142, weight: 0.2, spread: 2, from: 1985, ramp: 30 },
  { disease: 'lyme', lat: 47, lon: 5, weight: 0.3, spread: 2.5, from: 1965, ramp: 40 },

  // Triple E — Atlantic and Gulf coasts, Michigan, scattered Latin America
  { disease: 'eee', lat: 28, lon: -81.5, weight: 0.4, spread: 3, from: 1930, ramp: 15 },
  { disease: 'eee', lat: 33, lon: -82, weight: 0.25, spread: 3, from: 1930, ramp: 15 },
  { disease: 'eee', lat: 42, lon: -71.5, weight: 0.3, spread: 2, from: 1930, ramp: 15 },
  { disease: 'eee', lat: 44, lon: -85, weight: 0.25, spread: 2.5, from: 1930, ramp: 15 },
  { disease: 'eee', lat: 30, lon: -90, weight: 0.2, spread: 3, from: 1930, ramp: 15 },
  { disease: 'eee', lat: 9, lon: -79, weight: 0.15, spread: 3, from: 1930, ramp: 15 },

  // Malaria also reached well beyond the tropics in 1900 — and was pushed back through the 20th century
  { disease: 'malaria', lat: 33, lon: -88, weight: 0.8, spread: 6, until: 1935, ramp: 20 },
  { disease: 'malaria', lat: 41, lon: 14, weight: 0.6, spread: 5, until: 1935, ramp: 25 },
  { disease: 'malaria', lat: 38, lon: -4, weight: 0.4, spread: 4, until: 1935, ramp: 25 },
  { disease: 'malaria', lat: 41, lon: 23, weight: 0.4, spread: 4, until: 1945, ramp: 25 },
  { disease: 'malaria', lat: 46, lon: 40, weight: 0.5, spread: 6, until: 1945, ramp: 25 },
  { disease: 'malaria', lat: 38, lon: 36, weight: 0.5, spread: 5, until: 1960, ramp: 25 },
  { disease: 'malaria', lat: 28, lon: 113, weight: 0.7, spread: 6, until: 1960, ramp: 30 },
  { disease: 'malaria', lat: 35, lon: 115, weight: 0.4, spread: 5, until: 1950, ramp: 30 },
  { disease: 'malaria', lat: 24, lon: 78, weight: 0.7, spread: 7, until: 1960, ramp: 30 },
  { disease: 'malaria', lat: -25, lon: -62, weight: 0.4, spread: 5, until: 1950, ramp: 30 },
  { disease: 'malaria', lat: 18, lon: -95, weight: 0.5, spread: 6, until: 1965, ramp: 30 },

  // Malaria — spreading into highlands and back toward the temperate zones
  { disease: 'malaria', lat: -1.3, lon: 36.8, weight: 0.4, spread: 3, from: 2035, ramp: 35 },
  { disease: 'malaria', lat: -20, lon: 30, weight: 0.5, spread: 5, from: 2040, ramp: 35 },
  { disease: 'malaria', lat: 40, lon: 12, weight: 0.3, spread: 4, from: 2060, ramp: 30 },
  { disease: 'malaria', lat: 30, lon: -92, weight: 0.3, spread: 4, from: 2070, ramp: 25 },

  // Dengue — the Aedes range moves poleward
  { disease: 'dengue', lat: -33, lon: -58, weight: 0.5, spread: 4, from: 2030, ramp: 30 },
  { disease: 'dengue', lat: 31, lon: -90, weight: 0.5, spread: 4, from: 2035, ramp: 30 },
  { disease: 'dengue', lat: 43, lon: 6, weight: 0.5, spread: 3, from: 2035, ramp: 30 },
  { disease: 'dengue', lat: 33, lon: 114, weight: 0.4, spread: 4, from: 2040, ramp: 30 },
  { disease: 'dengue', lat: 35, lon: 136, weight: 0.4, spread: 3, from: 2040, ramp: 30 },
  { disease: 'dengue', lat: 40, lon: 14, weight: 0.4, spread: 3, from: 2045, ramp: 30 },
  { disease: 'dengue', lat: -28, lon: 150, weight: 0.4, spread: 4, from: 2050, ramp: 30 },
  { disease: 'dengue', lat: -26, lon: 28, weight: 0.4, spread: 4, from: 2055, ramp: 30 },
  { disease: 'dengue', lat: 48, lon: 10, weight: 0.25, spread: 3, from: 2075, ramp: 25 },

  // West Nile — moving north
  { disease: 'westNile', lat: 46, lon: -80, weight: 0.4, spread: 4, from: 2035, ramp: 25 },
  { disease: 'westNile', lat: 51, lon: 25, weight: 0.3, spread: 3, from: 2045, ramp: 25 },
  { disease: 'westNile', lat: 55, lon: 12, weight: 0.3, spread: 3, from: 2050, ramp: 25 },
  { disease: 'westNile', lat: 52, lon: 0, weight: 0.25, spread: 2.5, from: 2055, ramp: 25 },

  // Lyme — tick range pushes into Canada and northern Europe
  { disease: 'lyme', lat: 57, lon: -4, weight: 0.3, spread: 3, from: 2030, ramp: 30 },
  { disease: 'lyme', lat: 50, lon: -95, weight: 0.5, spread: 6, from: 2035, ramp: 35 },
  { disease: 'lyme', lat: 64, lon: 22, weight: 0.4, spread: 4, from: 2050, ramp: 30 },
  { disease: 'lyme', lat: 49, lon: 30, weight: 0.3, spread: 5, from: 2050, ramp: 30 },
  { disease: 'lyme', lat: 60, lon: 40, weight: 0.3, spread: 6, from: 2060, ramp: 30 },

  // Triple E — creeping north along the Atlantic coast
  { disease: 'eee', lat: 45, lon: -70, weight: 0.3, spread: 3, from: 2045, ramp: 30 },
  { disease: 'eee', lat: 40, lon: -76, weight: 0.25, spread: 3, from: 2055, ramp: 30 },
];
