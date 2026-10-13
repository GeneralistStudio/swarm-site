// ---------------------------------------------------------------------------
// DISEASE LIBRARY
// ---------------------------------------------------------------------------
// What each bug can carry, and how contagious it is. This is the file the
// swarm reads from — today the "which diseases are active here" part is
// random; NEXT PHASE: make getRegionalDiseases() return real data per
// location (e.g. NE U.S. → mostly Lyme) and nothing else needs to change.
//
// To edit the library itself: add/remove rows in DISEASES below.
//   name           what shows on screen
//   carriedBy      'mosquito' and/or 'tick'
//   contagiousness 0 = Low · 1 = Moderate · 2 = High · 3 = Extreme
// ---------------------------------------------------------------------------

export const BUG_TYPES = {
  mosquito: { label: 'Mosquito' },
  tick: { label: 'Tick' },
};

export const CONTAGIOUS_LEVELS = ['Low', 'Moderate', 'High', 'Extreme'];

export const DISEASES = {
  dengue: { name: 'Dengue Fever', carriedBy: ['mosquito'], contagiousness: 2 },
  westNile: { name: 'West Nile', carriedBy: ['mosquito'], contagiousness: 1 },
  malaria: { name: 'Malaria', carriedBy: ['mosquito'], contagiousness: 3 },
  zika: { name: 'Zika', carriedBy: ['mosquito'], contagiousness: 1 },
  yellowFever: { name: 'Yellow Fever', carriedBy: ['mosquito'], contagiousness: 2 },
  chikungunya: { name: 'Chikungunya', carriedBy: ['mosquito'], contagiousness: 2 },
  eee: { name: 'EEE', carriedBy: ['mosquito'], contagiousness: 3 },

  lyme: { name: 'Lyme', carriedBy: ['tick'], contagiousness: 1 },
  rmsf: { name: 'Rocky Mountain Fever', carriedBy: ['tick'], contagiousness: 2 },
  anaplasmosis: { name: 'Anaplasmosis', carriedBy: ['tick'], contagiousness: 1 },
  babesiosis: { name: 'Babesiosis', carriedBy: ['tick'], contagiousness: 1 },
  powassan: { name: 'Powassan', carriedBy: ['tick'], contagiousness: 3 },
};

const idsFor = (bugType) =>
  Object.keys(DISEASES).filter((id) => DISEASES[id].carriedBy.includes(bugType));

// small seedable PRNG so a given place always gets the same (random-looking)
// disease mix, instead of reshuffling every time you re-pick it
function seededRandom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Which diseases are circulating at this location, and how common each is.
// Returns:
//   mosquito / tick   [{ id, weight }] — higher weight = more of the infected
//                     bugs carry that disease
//   infectionRate     0–1, the share of bugs that are infected at all (the
//                     rest are clean). Here it scales with the location's risk
//                     level; the glowing bugs on screen are the infected ones.
//
// PLACEHOLDER: random, but stable per location. NEXT PHASE: replace the body
// with real regional data, keeping this return shape.
export function getRegionalDiseases(location) {
  const rand = seededRandom(`${location?.label ?? ''}|${location?.lat ?? 0}|${location?.lon ?? 0}`);

  const pick = (bugType, count) => {
    const pool = idsFor(bugType);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count).map((id) => ({ id, weight: 1 + Math.floor(rand() * 3) }));
  };

  return {
    mosquito: pick('mosquito', rand() < 0.5 ? 2 : 3),
    tick: pick('tick', rand() < 0.5 ? 1 : 2),
    infectionRate: 0.12 + 0.4 * (location?.intensity ?? 0.5),
  };
}

// What one individual bug is carrying. Most bugs are clean (empty array); an
// infected one (see infectionRate) carries one disease from its region's mix
// (weighted), sometimes two. Returns an array of disease ids.
export function rollCarriedDiseases(bugType, regional) {
  const pool = regional?.[bugType] ?? [];
  if (pool.length === 0 || Math.random() >= (regional.infectionRate ?? 1)) return [];

  const weightedPick = (options) => {
    let r = Math.random() * options.reduce((sum, o) => sum + o.weight, 0);
    for (const o of options) {
      r -= o.weight;
      if (r <= 0) return o;
    }
    return options[options.length - 1];
  };

  const first = weightedPick(pool);
  const carried = [first.id];
  if (pool.length > 1 && Math.random() < 0.3) {
    const second = weightedPick(pool.filter((o) => o.id !== first.id));
    carried.push(second.id);
  }
  return carried;
}

// Rolls up a group of bugs (the ones currently in the swarm circle) into what
// the tooltip shows. `bugs` is [{ type: 'mosquito' | 'tick', diseases: [id] }].
// Returns null for an empty group.
//   types     which kinds are present            -> the "Mosquito" "Tick" chips
//   diseases  everything they carry, most common first -> "Carrying"
//             (empty if none of the bugs in the group are infected)
//   level     the worst contagiousness among those      -> "Contagious"
//             ('None' if nothing is carried)
export function summarizeBugs(bugs) {
  if (bugs.length === 0) return null;

  const types = [];
  const counts = new Map();
  for (const bug of bugs) {
    if (!types.includes(bug.type)) types.push(bug.type);
    for (const id of bug.diseases) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  types.sort((a, b) => Object.keys(BUG_TYPES).indexOf(a) - Object.keys(BUG_TYPES).indexOf(b));

  const ids = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
  const levelIndex = ids.reduce((max, id) => Math.max(max, DISEASES[id].contagiousness), -1);

  return {
    types: types.map((t) => BUG_TYPES[t].label),
    diseases: ids.map((id) => DISEASES[id].name),
    level: levelIndex < 0 ? 'None' : CONTAGIOUS_LEVELS[levelIndex],
  };
}
