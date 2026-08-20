# Swarm® — structural scaffold

React + Vite. Globe is real 3D (`three` / `@react-three/fiber` / `@react-three/drei`).
Location data, time-of-day math, and swarm tuning all read from a placeholder data
layer so a real backend can be dropped in without touching components.

## Run it

```
npm install
npm run dev
```

## Structure

```
src/
  App.jsx                     phase state machine: intro (globe) -> main (scene)
                               + which modal (if any) is open

  components/
    globe/
      Globe3D.jsx              the actual 3D globe (r3f Canvas). Interactive
                                (drag/click-to-pick) or passive (docked badge).
      geo.js                   lat/lon <-> 3D sphere math, shared everywhere
      GlobeIntro.jsx           full-screen intro: headline, location input,
                                globe, legend, timeline
      GlobeBadge.jsx           docked top-left mini-globe shown once a
                                location is picked (shares layoutId with the
                                intro globe so framer-motion animates the dock)
      TimelineScrubber.jsx     2025->2100 scrubber, reused in the intro and
                                inside the Swarm panel

    scene/
      MainScene.jsx            composes background + grass + swarm canvas
                                + globe badge for the main experience
      TimeOfDayBackground.jsx  gradient driven by local hour at the location
      GrassLayers.jsx          parallax scrolling grass strips
      SwarmCanvas.jsx          the interaction itself — ported directly from
                                swarm-prototype.html, tweak panel removed,
                                now config-driven via props

    modals/
      ModalShell.jsx           generic overlay/scroll container both tabs use
      SwarmPanel.jsx           "Swarm" tab: the problem — territory map,
                                timeline, disease stats
      AboutPanel.jsx           "About" tab: product story + email capture

    nav/
      Nav.jsx                  persistent top-right wordmark + tab triggers

  hooks/
    useTimeOfDay.js            local-hour -> gradient color interpolation
    useSwarmConfig.js          location intensity -> bug population/behavior

  data/
    placeholderLocationData.js seed locations, mosquito territory clusters,
                                global stat curves — THE file to replace with
                                real API calls later
```

## What's placeholder on purpose

- **Location resolution** (`resolveLocation`) — a small lookup table + a
  deterministic hash fallback so any typed location "works" offline. Swap for
  a real geocoding call.
- **Bug/disease data** (`TERRITORY_CLUSTERS`, `getGlobalStats`) — illustrative
  numbers/geography, not sourced projections.
- **Timezone** — derived crudely from longitude (`lon / 15`). A real build
  should use a tz-lookup keyed on lat/lon.
- **Globe surface** — a lat/lon graticule (grid lines), not traced continent
  outlines. Visually close to the line-art look in the reference screenshots
  but not the real geometry yet — swapping in real coastline data only
  touches `Globe3D.jsx`.
- **Colors/type/radii** — all pulled from CSS variables in `src/index.css`.
  Structural pass only, per your note — untouched otherwise.

## Deploy later

Push to GitHub, then import the repo in Vercel — zero config needed for a
Vite app. `npm run build` already verified clean.
