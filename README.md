# Swarm® — structural scaffold

React + Vite. Globe is real 3D (`three` / `@react-three/fiber` / `@react-three/drei`).
Location data, time-of-day math, and swarm tuning all read from a placeholder data
layer so a real backend can be dropped in without touching components.

## Run it

```
npm install
npm run dev
```

## Changing the look (no JavaScript needed)

Every piece of UI keeps its look in its own `.css` file, and each of those starts
with a **"DESIGN KNOBS"** block — plain-English variables for position, size, colors,
fonts and animation timing. Change a value, save, and the site updates.

| To change…                                        | Edit this file                          |
| ------------------------------------------------- | --------------------------------------- |
| The hamburger menu (width, colors, fonts, speed, background blur) | `src/components/menu/SiteMenu.css` |
| Menu link names / order / the Terms + Privacy row | `src/siteConfig.js`                     |
| The "i" button + Data panel (slide-in, globe)     | `src/components/info/InfoPanel.css`     |
| The disease tooltip beside the swarm circle       | `src/components/scene/BugTooltip.css`   |
| The intro timeline's playback: how long it takes to sweep today → 2100, the pauses at each end, how fast it rewinds, how often the green is redrawn | `FORWARD_MS`, `HOLD_END_MS`, `REWIND_MS`, `HOLD_START_MS`, `UPDATE_EVERY_MS` at the top of `src/components/globe/TimelineScrubber.jsx` |
| The intro's "Share location" card + its "or click a city" line (width, type, the red "not shared" line) | `.share-location` knobs at the top of `src/components/globe/GlobeIntro.css` (the words are in `ShareLocation.jsx`) |
| The name tag that follows the pointer over a city on the intro globe | `--intro-label-*` knobs in `src/components/globe/IntroGlobe.css` |
| The Data panel's "Location" section — its look (type, bars, spacing) | `src/components/info/LocationFacts.css` |
| …what it says: how temperature shifts with the year (warming path), the words for "Low / High…" populations, how regions are named | top of `src/data/locationFacts.js` |
| …each city's region and normal climate (average, summer/winter swing, day/night swing) | `src/data/cities.js` |
| When the tooltip flips between its light and dark looks (it snaps at dawn/dusk instead of fading through grey) | `DAY_STARTS` / `NIGHT_STARTS` in `src/App.jsx`; the two looks are the `--tooltip-day-*` / `--tooltip-night-*` knobs in `BugTooltip.css` |
| The swarm circle (color, size) and the yellow highlight on diseased bugs — its yellow on a dark sky vs a pale sky, the glow, the thin outline, and how bright the sky must be before the pale look takes over | top of `src/components/scene/SwarmCanvas.jsx` (`RING_*`, `HIGHLIGHT_*`, `PALE_SKY_*`) |
| The mosquitoes' color (`'auto'` = white in the dark, dark in the light, with the grey chosen from the sky at dawn/dusk — or a fixed color), how solid each kind is, how fast the shade eases, and how many bugs a moving mouse can spawn per frame | `BUG_COLOR`, `BUG_ALPHA`, `BUG_SHADE_EASE_MS`, `MAX_SPAWNS_PER_FRAME` at the top of `src/components/scene/SwarmCanvas.jsx` (the "pick the grey" maths: `bugContrast.js`) |
| The click ("bug spray") ripple — one soft ring that blurs and bends what's behind it. `RIPPLE_STYLE`: `'soft'` (default) or `'line'` (the original thin red circle); add `?ripple=line` to the page address to compare. Chrome/Edge bend what's behind the ring; Safari and Firefox get the same ring as blur + soft light/shade | `RIPPLE_STYLE`, `RIPPLE_SIZE` (how far it spreads, × the spray radius), `RIPPLE_RING_WIDTH`, `RIPPLE_BLUR`, `RIPPLE_WARP`, `RIPPLE_SHINE`, `RIPPLE_SHINE_BLUR`, `RIPPLE_SLOTS` at the top of `src/components/scene/softRipple.js` |
| The grass wake (**currently switched off** — set `GRASS_WAKE` to `true` to bring it back) — the grass swaying and settling behind the pointer as you move through it (a patch of simulated water that travels with the pointer; no circles). Chrome/Edge bend the blades; Safari and Firefox get a stronger light/shade version of the same wake instead, since they can't bend what's behind an element | `GRASS_WAKE` (on/off — it's off right now), how it's stirred (`WAKE_WIDTH`, `WAKE_DEPTH`) and how smooth that is (`POINTER_SMOOTHING_MS` — more = silkier, but the wake trails the pointer a little), the water (`WATER_SPEED`, `WATER_DAMPING` — lower = the grass settles faster), its look (`WATER_BEND`, `SWAY` — lower = more side-to-side, `WATER_SHINE`, `LIGHT_ANGLE`) and how hard it works (`WAKE_AREA`, `WATER_FPS` — 60 by default, drop to 30 to go lighter; it also backs off by itself if the browser struggles — and `WATER_CELL`) at the top of `src/components/scene/grassWake.js`; **how tall the strip of grass that reacts is** (`--wake-zone-height`, the sky above it is never touched) and how far down it the light/shade fades in (`--wake-shine-full-at`) in `src/components/scene/SwarmCanvas.css` |
| Which diseases exist + how contagious each is     | `src/data/diseaseData.js` (`DISEASES`)  |
| Where the disease cloud sits, and when (by year)  | `src/data/diseaseHotspots.js`           |
| The year slider's range (1900–2100) and "today"   | `TIMELINE` in `src/data/diseaseHotspots.js` |
| The cloud's COLOR + strength                      | top of `src/components/globe/diseaseCloud.js` (`CLOUD_COLOR`) |
| The Year + Time of day sliders' look (line, handle, type, the painted day) | `src/components/info/RangeSlider.css` |
| How many mosquitoes / ticks there are (by place, year, hour) | `src/data/bugActivity.js` (the knobs at the top; the dawn/dusk curves are `mosquitoActivity` / `tickActivity`) |
| How fast the sky changes color when the time changes | `--sky-transition` in `src/App.css` |
| Page background, title size, content width        | `src/pages/Page.css`                    |
| Product page layout                               | `src/pages/ProductPage.css`             |
| Education page layout                             | `src/pages/EducationPage.css`           |
| The footer at the bottom of every page            | `src/pages/PageFooter.css`              |
| The swarm® logo font / ® mark                     | `src/components/brand/Wordmark.css`     |
| Site-wide fonts, base colors, corner radii        | `src/index.css` (the `:root` block)     |
| The YELLOW (location dot, slider handle, glowing bugs, selected city, intro glow) | `--yellow` in `src/index.css` |
| The cities in the Data panel (names, places, bug pressure) | `src/data/cities.js`           |
| How far the globe tips up/down to center a city (1 = dead center, 0 = turns left/right only) | `FOCUS_TILT` in `src/components/globe/Globe3D.jsx` |
| The Data panel globe's motion: auto-spin speed, how long a flick coasts, the drag-vs-click threshold (it spins by default, stops when a city is picked, starts again on any drag) | `SPIN_SPEED`, `COAST_DECAY`, `MAX_COAST`, `DRAG_THRESHOLD_PX` in `src/components/globe/Globe3D.jsx` |
| The location pill + its arrows (colors, size)     | `--info-tag-*` / `--info-arrow-*` knobs in `src/components/info/InfoPanel.css` |

Page text lives in the matching `.jsx` file (`ProductPage.jsx` etc.) — it's HTML-style
markup, so headings are `<h1>`, paragraphs `<p>`, and so on.

## Structure

```
src/
  App.jsx                     the top level: which page is showing (from the URL),
                               intro -> game phase, and the location
  siteConfig.js               menu link labels + order

  router/
    useHashRoute.js           tiny router: the page is whatever follows the # in the URL
                               (e.g. /#/product) — works on GitHub Pages as-is

  pages/                      every page except Home
    lazyPages.js              which page each address shows. Pages are loaded on demand
                               (so Home doesn't download them up front), and fetched in
                               the background once Home is idle so the menu feels instant
    PageFrame.jsx / Page.css  shared frame: background, centered column, inner scrolling
    ProductPage.jsx           product story: competitors, the Swarm package, features
    EducationPage.jsx         the problem: territory map, stats, resources
    CompanyPage.jsx           filler
    TermsPage.jsx             filler
    PrivacyPage.jsx           filler
    PageFooter.jsx            "Enjoy the outdoors" + email signup + big wordmark

  components/
    menu/SiteMenu.jsx         hamburger dropdown (top center)
    info/InfoPanel.jsx        "i" button + slide-in Data panel (top left). Holds the
                               Year + Time of day sliders (RangeSlider.jsx), then the
                               "Location" section (LocationFacts.jsx: region, temperature,
                               mosquito + tick population — they follow the place, the
                               year and the time of day); the globe + location
                               pill at the bottom is where you change city (click a
                               dot, or the arrows) and the globe turns to face it.
                               On short windows the empty room above the globe shrinks
                               first, then the body scrolls
    brand/Wordmark.jsx        the swarm® logo text
    globe/
      Globe3D.jsx             the 3D globe (r3f Canvas)
      lazyGlobe.js            how the globe is loaded: three.js is two thirds of the site's
                               code, so it downloads as its own file just AFTER the first
                               screen draws (import { Globe3D } from here, inside <Suspense>)
      GlobeIntro.jsx          first screen: wordmark, "Share location" button, legend, timeline
      ShareLocation.jsx       the button + its states (waiting / not shared / try again)
      IntroGlobe.jsx          the big globe on that first screen: city dots to click, a name
                               tag on hover (the spin holds still while the pointer is on a dot)
      TimelineScrubber.jsx    the little Today -> 2100 timeline: plays by itself on the intro
                               screen (the green on the globe follows it); drag it or press the
                               pause button to take over
      diseaseCloud.js         draws the disease cloud for a given year (from data/diseaseHotspots.js)
                                onto a flat map that Globe3D wraps around the sphere
    scene/                    Home: sky, stars, grass, grain, and the swarm canvas
      BugTooltip.jsx          the disease info card beside the circle (Data panel open)

  hooks/
    useTimeOfDay.js           local-hour -> sky/grass color interpolation (and SKY_STOPS,
                                where the sky's five colors sit)
    useSwarmConfig.js         location intensity -> bug population/behavior

  data/
    placeholderLocationData.js mosquito territory clusters, global stat curves — THE file to replace with
                                real API calls later
    cities.js                 the cities you can pick (intro globe + Data panel)
    myLocation.js             "Share location": asks the browser where this device is and
                                turns the answer into one more place, "Your location" —
                                a dot on the globes + a stop for the panel's arrows. Used
                                in the page only: never sent anywhere, never saved
    locationFacts.js          what the panel's "Location" section shows for a place, year and
                                hour: region, temperature (climate + season + time of day +
                                warming), and mosquito / tick population as a 0–1 index + a word
    bugActivity.js            turns place + year + hour into bug counts: mosquitoes vs
                                ticks from the nearby disease hotspots, and each bug's
                                time-of-day habits (with the research it's based on)
    diseaseHotspots.js        where vector-borne disease concentrates, and in which
                                years (the green cloud + the year slider's range).
                                Placeholder rows — replace with real data next
    diseaseData.js            disease library + which ones are active at a location.
                                Random (but stable per place) for now; replace
                                getRegionalDiseases() with real regional data next
```

## Keeping the site fast to load

The first screen (sky, grass, wordmark, share-location button) is built from a small
main file (~125 KB compressed). Everything heavy comes in behind it, in this
order: the 3D globe (three.js, ~265 KB compressed, fades in), then — when the
browser is idle — the other pages. The two rules that keep it that way:

- Import the globe from `src/components/globe/lazyGlobe.js`, wrapped in
  `<Suspense fallback={null}>` — never straight from `Globe3D.jsx`.
- Add pages in `src/pages/lazyPages.js` (they're lazy-loaded there), not as
  plain imports in `App.jsx`.

To see what the build weighs, run `npm run build` and look at the sizes it
prints: the `index-….js` line should stay in the low hundreds of KB.

### Keeping the animation light

The expensive things on a page like this are not JavaScript — they're the
browser re-blurring, blending and re-drawing big areas of the screen every
frame. Rules of thumb that keep it lean:

- **Blur only what's visible.** The menu's progressive blur is six layers; each
  is only as tall as its own band of the screen (a third of the page), not the
  full page masked down. Same picture, ~60% less area to blur.
- **Fewer, smaller layers.** The film grain is one layer that hops between six
  positions (not six full-screen layers); the grass uses only as many tiles as
  it needs to cover the screen plus one loop of scrolling.
- **Nothing keeps running after it's invisible.** The intro's stars and glow are
  removed from the page once they've faded out (`src/hooks/useLingering.js`).
  Anything new that's only for one phase should do the same.
- **No per-frame React updates.** Anything that changes every frame (a timer,
  a drag) should write straight to the element it affects, not to app-wide
  state that re-renders everything.
- **Check before and after.** `?perf` on the address shows a live frame meter;
  `document.getAnimations().length` in the browser console counts what's
  running (about 4 on the main scene: 3 grass layers + the grain).

### If the page stutters

Add `?perf` to the address (e.g. `http://localhost:5173/swarm-site/?perf`) for a
small live frame meter in the bottom-right corner: frames per second, the
slowest recent frame, how many frames have hitched (taken over 50 ms), and how
many of those were the site's own JavaScript freezing the browser. A big
"worst" number at the moment you see a stutter — and whether "blocked" goes up
with it — says where to look. (Behind the scenes: bugs share a few pre-built
sprite shades instead of each making its own canvases, so moving the mouse
never has to create graphics objects.)

## What's placeholder on purpose

- **Where "Your location" is** — it's the browser's real answer, but everything
  we'd normally look up for a place is a guess made from its coordinates: the
  region (`regionOf`), the climate (`climateFor`) and how heavy the bug pressure
  is (`buildMyLocation`'s latitude formula). Swap for real regional data.
- **Bug/disease data** (`TERRITORY_CLUSTERS`, `getGlobalStats`) — illustrative
  numbers/geography, not sourced projections.
- **Timezone** — for the cities it's a fixed offset in `cities.js`; for "Your
  location" it's this device's own clock offset (right for the visitor, daylight
  saving included).
- **Globe surface** — a lat/lon graticule (grid lines), not traced continent
  outlines. Visually close to the line-art look in the reference screenshots
  but not the real geometry yet — swapping in real coastline data only
  touches `Globe3D.jsx`.
- **Colors/type/radii** — all pulled from CSS variables in `src/index.css`.
  Structural pass only, per your note — untouched otherwise.

## Deploy later

Push to GitHub, then import the repo in Vercel — zero config needed for a
Vite app. `npm run build` already verified clean.
