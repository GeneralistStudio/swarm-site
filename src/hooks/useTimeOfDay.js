import { useEffect, useState } from 'react';

// Keyframe gradients keyed by local hour. Each is [top, accentTop, mid,
// accentLow, bottom] colors — the accent stops are narrow bands (see the
// gradient position template in TimeOfDayBackground) rather than full
// washes, so they read as "a little" color rather than dominating.
// Night's accents are the exact RGB inversion of day's (#EDFF85 -> #12007A,
// #FBD0D0 -> #042F2F) — see invertHex. Placeholder palette otherwise —
// swap freely once real design tokens are set.
const KEYFRAMES = [
  { hour: 0, colors: ['#0b0c14', '#12007a', '#141522', '#042f2f', '#1b1c1a'] },   // deep night
  { hour: 5, colors: ['#171826', '#241150', '#2c2536', '#0c2b2b', '#3a2a28'] },   // pre-dawn
  { hour: 6.5, colors: ['#3a3350', '#5a3a6f', '#8a6a6f', '#7a5550', '#c99a6b'] }, // dawn
  { hour: 9, colors: ['#bcd6e6', '#edff85', '#dfe6d8', '#fbd0d0', '#e9e6cf'] },   // morning
  { hour: 13, colors: ['#cfe6ee', '#edff85', '#e7ecda', '#fbd0d0', '#eef0d8'] },  // midday
  { hour: 17, colors: ['#e7cfa8', '#f5e58a', '#e3c2a4', '#f7c9c9', '#dba98f'] },  // late afternoon
  { hour: 19, colors: ['#2c2440', '#4a2a5f', '#6a4a55', '#3a2530', '#c97a4a'] },  // dusk
  { hour: 21, colors: ['#12121f', '#1c0a4a', '#241f2e', '#0c2a2a', '#2e2422'] },  // night
  { hour: 24, colors: ['#0b0c14', '#12007a', '#141522', '#042f2f', '#1b1c1a'] },
];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
export function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex(ca.map((v, i) => v + (cb[i] - v) * t));
}
// Exact RGB inversion — used to derive a "night" color from a given "day"
// color (or vice versa) without hand-computing the hex.
export function invertHex(hex) {
  return rgbToHex(hexToRgb(hex).map((v) => 255 - v));
}

// Generic hour -> interpolated-colors lookup, shared by the sky gradient
// and anything else (e.g. grass) that wants its own palette to react to
// the same local-hour clock.
export function interpolateKeyframes(hour, keyframes) {
  let lo = keyframes[0], hi = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (hour >= keyframes[i].hour && hour <= keyframes[i + 1].hour) {
      lo = keyframes[i];
      hi = keyframes[i + 1];
      break;
    }
  }
  const span = hi.hour - lo.hour || 1;
  const t = (hour - lo.hour) / span;
  return lo.colors.map((c, i) => lerpColor(c, hi.colors[i], t));
}

// Same idea as interpolateKeyframes but for a plain numeric value (e.g. an
// opacity) instead of a color array.
export function interpolateScalar(hour, keyframes) {
  let lo = keyframes[0], hi = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (hour >= keyframes[i].hour && hour <= keyframes[i + 1].hour) {
      lo = keyframes[i];
      hi = keyframes[i + 1];
      break;
    }
  }
  const span = hi.hour - lo.hour || 1;
  const t = (hour - lo.hour) / span;
  return lo.value + (hi.value - lo.value) * t;
}

export function gradientForHour(hour) {
  return interpolateKeyframes(hour, KEYFRAMES);
}

// timezoneOffset: hours from UTC for the selected location (placeholder —
// a real build would use a tz-lookup service keyed on lat/lon).
export function useTimeOfDay(timezoneOffset = 0) {
  const [gradient, setGradient] = useState(() => computeGradient(timezoneOffset));

  useEffect(() => {
    const tick = () => setGradient(computeGradient(timezoneOffset));
    tick();
    const id = setInterval(tick, 60_000); // recompute once a minute
    return () => clearInterval(id);
  }, [timezoneOffset]);

  return gradient; // { colors: [top, mid, bottom], hour }
}

function computeGradient(timezoneOffset) {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  let localHour = (utcHour + timezoneOffset) % 24;
  if (localHour < 0) localHour += 24;
  return { colors: gradientForHour(localHour), hour: localHour };
}
