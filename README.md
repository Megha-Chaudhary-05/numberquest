# NumberQuest

A colourful 2D maths puzzle adventure for ages 11–20. Ten hand-written puzzles
across four worlds, three stars per puzzle, hints that teach rather than give
away, and progress that lives on the player's own device.

No account, no server, no tracking. Everything is static files.

## Run it locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

To check the production build exactly as it will be deployed:

```bash
npm run build
npm run preview
```

## Deploy

The build is fully static and uses relative asset paths, so it works from any
static host — including a subdirectory such as
`https://yourname.github.io/numberquest/`.

```bash
npm run build
```

Upload the contents of `dist/` to your host.

| Host | How |
| --- | --- |
| GitHub Pages | Push the repo, then Settings → Pages → deploy from `main` / `dist` |
| Netlify | `netlify deploy --dir=dist` |
| Vercel | `vercel --prod` (framework preset: Vite) |
| Cloudflare Pages | Build command `npm run build`, output directory `dist` |
| Any web server | Copy `dist/` into the document root |

Routing uses a hash (`#/play/apple-cart`) rather than clean URLs, so no server
rewrite rules are needed. That is what makes subdirectory hosting work with no
configuration.

## Install on Android

The game is an installable PWA, so it runs full-screen, launches from an icon,
and works offline once loaded. No app store needed.

1. Open the deployed URL in Chrome on Android.
2. Either accept the install prompt, or use the browser menu → **Install app** /
   **Add to Home screen**.
3. Launch it from the home screen. It opens in standalone mode with no browser
   chrome.

Offline: a service worker precaches every asset on first load, so the whole game
plays with no connection. Progress is saved in `localStorage` and survives being
closed, though it is per-device — clearing browser data resets it.

## The game

Four worlds, gated by cumulative stars:

| World | Levels | Unlocks at |
| --- | --- | --- |
| Sunbeam Meadow | 3 | 0 stars |
| Coral Lagoon | 3 | 4 stars |
| Equation Ridge | 2 | 9 stars |
| Riddle Ruins | 2 | 14 stars |

Stars: 3 for first try with no hint, 2 for one slip or one hint, 1 for clearing
it at all. A wrong answer costs a few points, never progress, and there are no
lives to lose.

Ten puzzle kinds are implemented: number sequences, arithmetic word problems,
repeating-pattern shapes, count-the-picture grids, doubling rows, missing
addends, token-built equations, and riddles. Every one explains its answer.

Accessibility: full keyboard support, visible focus rings, live regions for
feedback, 56px touch targets, and a reduce-motion setting that also follows the
device preference.

## Project layout

```
src/
  data/         puzzle + world content, and the types that describe it
  game/         grading, scoring, persistence, sound, progress context
  components/
    puzzle/     one input surface per puzzle kind, behind a shared contract
    ui/         buttons, cards, keypad, option grid, feedback, icons
    art/        mascot, logo, world art
  screens/      home, map, level select, play, results, settings
scripts/        test and icon tooling
```

Adding a puzzle means appending an object to `PUZZLES` in `src/data/puzzles.ts`.
The map, level list, unlocks, and scoring all derive from that array, so nothing
else needs to change. A new *kind* needs one component in `src/components/puzzle/`
plus one entry in its registry.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm test` | Logic tests, then UI tests |
| `npm run test:logic` | Puzzle maths, scoring, and save-format tests only |
| `npm run test:ui` | Screens and interactions, in a simulated browser |
| `npm run check` | Typecheck + lint + both test suites |
| `npm run verify` | Everything above, plus a production build |
| `npm run icons` | Regenerate the PWA icon set |

`npm run icons` needs no dependencies — it writes the PNGs by hand so the repo
has no image toolchain.

## Tests

`npm run test:logic` checks the puzzle content itself: that the diagrams really
contain the numbers the answers claim, that every riddle is satisfied by exactly
one option, that all valid equations are accepted and false ones refused, and
that the save format survives garbage input.

`npm run test:ui` mounts every screen in a simulated browser and drives it with
real clicks — wrong answers, retries, hints, unlocks, resets, and a full
play-through. It catches dead buttons and broken state, not just bad maths.
