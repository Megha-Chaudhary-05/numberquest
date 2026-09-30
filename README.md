# NumberQuest

A colourful 2D maths puzzle adventure for ages 11–20. 600 levels across four
worlds and three difficulty tiers, three stars per level, hints that teach rather
than give away, and progress that lives on the player's own device.

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
| Sunbeam Meadow | 150 | 0 stars |
| Coral Lagoon | 150 | 60 stars |
| Equation Ridge | 150 | 150 stars |
| Riddle Ruins | 150 | 260 stars |

Each world holds **50 easy, 50 medium and 50 hard levels**, 1800 stars in total
across the game. A tier is a filter, not a lock: the moment a world opens, all
three of its tiers are playable. The level list and the world map remember which
tier you last browsed, and skipping or "next level" stays inside that tier so a
player working through hard levels is never dropped into easy.

Stars: 3 for first try with no hint, 2 for one slip or one hint, 1 for clearing
it at all. A wrong answer costs a few points, never progress, and there are no
lives to lose.

Seven puzzle kinds are implemented: number sequences, arithmetic word problems,
repeating-pattern shapes, count-the-picture grids, doubling rows, missing
addends, token-built equations, and riddles. Every one explains its answer.

### Where the levels come from

The first levels of each world are hand-written openers — one idea per level, the
interaction style introduced gently. The remaining 590 are generated from
templates by a seeded PRNG in `src/data/generators.ts`.

Two properties make generation safe:

1. **Deterministic.** The seed is derived from the level id, so a level always
   generates the same puzzle. Saved progress can never point at a level that has
   quietly changed shape.
2. **Self-verifying.** Every generator returns the answer it actually computed,
   and `npm run test:logic` re-derives that answer from the level's own data —
   counting the emoji, re-solving the equation, re-balancing the sum — for all
   600 levels. A generator that drifts out of sync fails the build.

The test suite also asserts no two levels in a tier share a title, and that
prompts carry their own numbers so no two levels read identically.

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

Levels are assembled in `src/data/puzzles.ts`: hand-written openers from the
`OPENERS` list fill the first slots of each world's easy tier, and
`src/data/generators.ts` fills the rest. The map, level lists, unlocks, tier
filters and scoring all derive from the resulting array, so changing
`LEVELS_PER_GROUP` rescales the whole game consistently.

To add a hand-written level, append it to `OPENERS` — it becomes the next easy
level of its world. A new *kind* needs one component in `src/components/puzzle/`
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

`npm run test:logic` checks the puzzle content itself across all 600 levels: that
the diagrams really contain the numbers the answers claim, that every sequence
continues to its stated answer under a real rule, that every fill-in-gap sum
balances, that every equation bank really has a true arrangement of its own
tokens, that every level accepts its own answer, that titles are unique within a
tier, and that the save format survives garbage input.

`npm run test:ui` mounts every screen in a simulated browser and drives it with
real clicks — wrong answers, retries, hints, tier switching, unlocks, resets, and
a full play-through. It samples the first, middle and last level of every world
and tier, since mounting all 600 in jsdom would take minutes. It catches dead
buttons and broken state, not just bad maths.
