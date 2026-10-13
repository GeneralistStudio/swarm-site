// ---------------------------------------------------------------------------
// MY LOCATION — the "Share location" option on the intro screen
// ---------------------------------------------------------------------------
// Asks the browser where this device is. The browser shows its own permission
// popup ("… wants to know your location"); if the visitor allows it, we get a
// latitude/longitude and turn it into one more place, "Your location", that
// works exactly like the cities in cities.js — a marker on the globes, a
// stop for the arrows in the Data panel.
//
// Privacy: the position is used right here in the page to place the marker and
// pick the local time of day. It is never sent anywhere and never saved — a
// reload starts from scratch.
//
// It only works on https:// pages (and on localhost while developing); that's
// a browser rule, and GitHub Pages is https.
// ---------------------------------------------------------------------------

export const MY_LOCATION_LABEL = 'Your location';

// Turns a position into a place the rest of the site can use. Anything the
// site can't know yet is estimated, like for the other placeholder places:
//   timezoneOffset  from this device's own clock (so the sky, the grass and the
//                   time-of-day slider show YOUR local time, daylight saving
//                   included)
//   intensity       a latitude-based guess at how heavy the bug pressure is —
//                   about 0.9 at the equator, easing to ~0.3 near the poles
//   region + climate  worked out from the coordinates (see locationFacts.js)
// NEXT PHASE: replace the guesses with real regional data.
export function buildMyLocation(lat, lon) {
  return {
    label: MY_LOCATION_LABEL,
    lat,
    lon,
    intensity: Math.max(0.25, 0.9 - (0.8 * Math.abs(lat)) / 90),
    timezoneOffset: -new Date().getTimezoneOffset() / 60,
  };
}

// Why it didn't work — the intro screen shows a different line for each.
//   'denied'       the visitor said no (or the browser has blocked it)
//   'unavailable'  the browser couldn't work out where this device is
//   'timeout'      it took too long
//   'unsupported'  this browser has no location feature at all
export function requestMyLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject({ reason: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(buildMyLocation(position.coords.latitude, position.coords.longitude)),
      (error) => reject({ reason: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable' }),
      {
        enableHighAccuracy: false, // a city-level fix is plenty (and doesn't wake up GPS)
        timeout: 15_000,
        maximumAge: 5 * 60_000, // an answer from the last five minutes is fine
      },
    );
  });
}
