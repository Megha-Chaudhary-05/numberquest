/**
 * UI smoke tests: every screen mounted in a fake DOM, with real clicks and
 * keypresses driving real state. A dead button or a broken import fails here.
 *
 *   npm run test:ui
 *
 * test-logic.ts covers the maths; this file covers the wiring.
 */
import { JSDOM, VirtualConsole } from 'jsdom'

/* ------------------------------------------------------- fake browser --- */

const virtualConsole = new VirtualConsole()
const jsdomErrors: string[] = []
virtualConsole.on('jsdomError', (e: unknown) => {
  jsdomErrors.push(e instanceof Error ? e.message : String(e))
})
virtualConsole.on('error', (...args: unknown[]) => {
  // React logs propType/key warnings through console.error; keep them visible.
  console.error('[jsdom]', ...args)
})

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://numberquest.test/',
  pretendToBeVisual: true,
  virtualConsole,
})

const g = globalThis as Record<string, unknown>

/** Node 22 defines some of these itself (read-only), so assign via define. */
function define(key: string, value: unknown) {
  Object.defineProperty(g, key, { value, writable: true, configurable: true })
}

define('window', dom.window)
define('document', dom.window.document)
define('navigator', dom.window.navigator)
define('HTMLElement', dom.window.HTMLElement)
define('Element', dom.window.Element)
define('Node', dom.window.Node)
define('Event', dom.window.Event)
define('KeyboardEvent', dom.window.KeyboardEvent)
define('MouseEvent', dom.window.MouseEvent)
define('PointerEvent', dom.window.PointerEvent)
define('getComputedStyle', dom.window.getComputedStyle.bind(dom.window))
define('requestAnimationFrame', (cb: FrameRequestCallback) =>
  dom.window.setTimeout(() => cb(16), 16) as unknown as number,
)
define('cancelAnimationFrame', (id: number) => dom.window.clearTimeout(id))
define('IS_REACT_ACT_ENVIRONMENT', true)

// jsdom has no layout engine and no media queries.
const matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})
g.matchMedia = matchMedia
dom.window.matchMedia = matchMedia as typeof dom.window.matchMedia
dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {}
Object.defineProperty(dom.window, 'innerWidth', { value: 390, writable: true })
Object.defineProperty(dom.window, 'innerHeight', { value: 844, writable: true })

/* ------------------------------------------------------------ harness --- */

// Imported only after the browser globals exist: storage.ts probes
// localStorage once, at module load.
const React = await import('react')
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
type Root = import('react-dom/client').Root
const { MemoryRouter, Routes, Route } = await import('react-router-dom')
const { ProgressProvider } = await import('../src/game/ProgressContext.tsx')
const { HomeScreen } = await import('../src/screens/HomeScreen.tsx')
const { MapScreen } = await import('../src/screens/MapScreen.tsx')
const { LevelSelectScreen } = await import('../src/screens/LevelSelectScreen.tsx')
const { PlayScreen } = await import('../src/screens/PlayScreen.tsx')
const { ResultScreen } = await import('../src/screens/ResultScreen.tsx')
const { SettingsScreen } = await import('../src/screens/SettingsScreen.tsx')
const { PUZZLES } = await import('../src/data/puzzles.ts')
const { WORLDS } = await import('../src/data/worlds.ts')

const h = React.createElement
// tsx transpiles JSX with the classic runtime here, which reads a bare
// `React` global. The app itself is fine (Vite uses the automatic runtime).
define('React', React)

const SAVE_KEY = 'numberquest.save.v1'
let root: Root
let container: HTMLElement

function mount(path: string) {
  container = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      h(
        MemoryRouter,
        { initialEntries: [path] },
        h(
          ProgressProvider,
          null,
          h(
            Routes,
            null,
            h(Route, { path: '/', element: h(HomeScreen) }),
            h(Route, { path: '/map', element: h(MapScreen) }),
            h(Route, { path: '/levels', element: h(LevelSelectScreen) }),
            h(Route, { path: '/world/:worldId', element: h(LevelSelectScreen) }),
            h(Route, { path: '/play/:puzzleId', element: h(PlayScreen) }),
            h(Route, { path: '/result/:puzzleId', element: h(ResultScreen) }),
            h(Route, { path: '/settings', element: h(SettingsScreen) }),
            h(Route, { path: '*', element: h(HomeScreen) }),
          ),
        ),
      ),
    )
  })
}

function unmount() {
  if (root) act(() => root.unmount())
  container?.remove()
}

/** Fresh mount at a route, on a clean save unless told otherwise. */
function go(path: string, { keepSave = false } = {}) {
  unmount()
  if (!keepSave) dom.window.localStorage.clear()
  mount(path)
}

/* -------------------------------------------------------------- utils --- */

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok   ${name}`)
  } catch (error) {
    failed++
    console.error(`  FAIL ${name}`)
    console.error(`       ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    )
  }
}

const text = () => container.textContent ?? ''

function byText<T extends Element = HTMLElement>(selector: string, needle: string): T | undefined {
  const all = [...container.querySelectorAll<T>(selector)]
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
  // Exact match first, so "9" never accidentally selects "19".
  return (
    all.find((el) => norm(el.textContent ?? '') === needle) ??
    all.find((el) => norm(el.textContent ?? '').toLowerCase().includes(needle.toLowerCase()))
  )
}

function byLabel(label: string): HTMLElement | undefined {
  return container.querySelector<HTMLElement>(`[aria-label="${label}"]`)
}

function click(el: Element | undefined, what: string) {
  assert(el, `could not find ${what}`)
  act(() => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

/** Tap an element the way a finger would. */
function tap(el: Element | undefined, what: string) {
  assert(el, `could not find ${what}`)
  act(() => {
    el.dispatchEvent(new dom.window.PointerEvent('pointerdown', { bubbles: true }))
    el.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }))
    el.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }))
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

/** Type digits on the on-screen keypad. */
function typeAnswer(digits: string) {
  for (const digit of digits) tap(byLabel(digit), `keypad key ${digit}`)
}

const slotText = () => byLabel('Your answer')?.textContent?.trim() ?? ''

/** Let timers and animations run: option grading is 240ms, the win is 1600ms. */
async function settle(ms = 450) {
  await act(async () => {
    await new Promise((resolve) => dom.window.setTimeout(resolve, ms))
  })
}

const saveJson = () => {
  const raw = dom.window.localStorage.getItem(SAVE_KEY)
  return raw ? JSON.parse(raw) : null
}

/* ================================================================ tests ==== */

console.log('\nUI smoke tests\n')

/* ------------------------------------------------------------- home ---- */

await test('home screen shows the brand, the stats card and all three actions', () => {
  go('/')
  assert(text().includes('NumberQuest'), 'brand name missing')
  assert(text().includes('A maths puzzle adventure'), 'tagline missing')
  assert(text().includes('0 of 10 puzzles solved'), 'solved count missing')
  assert(byText('button', 'Start playing'), 'no start button')
  assert(byText('button', 'World map'), 'no map button')
  assert(byText('button', 'All levels'), 'no levels button')
  assert(byLabel('Open settings'), 'no settings button')
})

await test('home sound button toggles and persists the preference', () => {
  assert(byLabel('Mute sound effects'), 'sound should start on')
  tap(byLabel('Mute sound effects'), 'sound toggle')
  assert(saveJson()?.settings?.sound === false, 'preference was not saved')
  assert(byLabel('Turn on sound effects'), 'aria-label did not update')
  tap(byLabel('Turn on sound effects'), 'sound toggle')
  assert(saveJson()?.settings?.sound === true, 'preference was not restored')
})

/* -------------------------------------------------------------- map ---- */

await test('map lists all four worlds and shows open vs locked state', () => {
  go('/map')
  for (const world of WORLDS) assert(text().includes(world.name), `missing ${world.name}`)
  // Meadow is open on a fresh save, so it shows progress rather than a cost.
  assert(text().includes('0/3 solved'), 'open world should show its progress')
  assert(text().includes('more stars to unlock'), 'locked worlds should hint at the cost')
  assert(text().includes('14 more stars to unlock'), 'unlock cost should be exact')
})

await test('a locked world hides its levels and states the requirement', () => {
  go('/world/ruins')
  assert(text().includes('is locked'), 'locked world should say so')
  assert(text().includes('Collect 14 stars'), 'unlock requirement not stated')
  assert(text().includes('Back to the map'), 'no escape from a locked world')
  assert(
    !text().includes('The Clever Shepherd'),
    'locked levels must not be listed as playable',
  )
})

await test('level select for an open world shows its three levels', () => {
  go('/world/meadow')
  for (const id of ['even-steps', 'double-trouble', 'apple-cart']) {
    const puzzle = PUZZLES.find((p) => p.id === id)!
    assert(text().includes(puzzle.title), `missing ${puzzle.title}`)
  }
  assert(text().includes('0 of 3 puzzles solved'), 'world progress missing')
})

await test('an unknown world id falls back to the full level list', () => {
  go('/world/atlantis')
  assert(text().includes('All levels'), 'no fallback')
  for (const world of WORLDS) assert(text().includes(world.name), `missing ${world.name}`)
})

/* ------------------------------------------------- numeric + grading --- */

await test('numeric puzzle: a wrong answer gives a nudge and a retry, no penalty to progress', () => {
  go('/play/apple-cart')
  assert(text().includes('The Apple Cart'), 'wrong puzzle loaded')
  assert(text().includes('Puzzle 3 of 10'), 'level number missing')
  typeAnswer('24')
  assert(slotText().includes('24'), `answer slot did not update, got "${slotText()}"`)
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('Try handling the giving-away'), 'nudge missing')
  assert(text().includes('Have another go'), 'encouragement missing')
  assert(text().includes('Try again'), 'no retry button')
  assert(saveJson() === null || Object.keys(saveJson()?.levels ?? {}).length === 0, 'should not save a loss')
})

await test('numeric puzzle: editing after a wrong answer re-enables grading', () => {
  click(byText('button', 'Try again'), 'retry')
  assert(!text().includes('Try again'), 'the nudge should clear on retry')
  typeAnswer('3')
  assert(slotText().includes('3'), 'answer slot did not update after retry')
})

await test('numeric puzzle: a correct answer celebrates, then routes to results', async () => {
  typeAnswer('0')
  assert(slotText().includes('30'), `expected 30, got "${slotText()}"`)
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('Two clean steps'), 'cheer missing')
  assert(text().includes('Taking you to your results'), 'handoff message missing')
  await settle(2000)
  assert(text().includes('Level complete'), 'did not reach the results screen')
})

await test('results screen: stars, the answer, the why and the career totals', () => {
  // apple-cart was cleared on attempt 2 (24 was wrong, 30 was right), so the
  // honest headline is 2 stars — never a 3.
  assert(text().includes('Nicely done!'), 'should be a 2-star headline')
  assert(!text().includes('Flawless run!'), 'a 2-star run must not claim a flawless one')
  assert(text().includes('2 attempts'), 'attempt chip missing')
  assert(text().includes('No hints needed'), 'hint chip missing')
  assert(text().includes('First clear!'), 'first-clear badge missing')
  assert(text().includes('The answer'), 'answer section missing')
  assert(text().includes('30 apples'), 'answer not shown with its unit')
  assert(text().includes('Why it works'), 'explanation section missing')
  assert(text().includes('24 − 9 = 15'), 'explanation text missing')
  assert(text().includes('Sunbeam Meadow'), 'world progress missing')
  assert(!text().includes('World clear!'), 'meadow is not fully cleared yet')
  // apple-cart is level 3, so the next button must offer level 4, not level 2.
  assert(byText('button', 'Next · The Wave'), 'no next-level button')
  assert(
    !text().includes('Next · Double Trouble'),
    'next must point forwards, not back at the previous level',
  )
  assert(byText('button', 'Replay'), 'no replay button')
  assert(byText('button', 'Back home'), 'no way home')
})

await test('a solved level is written to localStorage with the right numbers', () => {
  const data = saveJson()
  equal(data.levels['apple-cart'].stars, 2, 'stars not saved')
  equal(data.levels['apple-cart'].solved, true, 'not marked solved')
  equal(data.totalStars, 2, 'total stars wrong')
  // 2 attempts, no hints: 120 base + 40 no-hint bonus - 15 mistake = 145.
  equal(data.totalPoints, 145, 'points do not match the scoring rule')
  equal(data.lastLevelId, 'apple-cart', 'last level not remembered')
})

await test('home picks up the saved progress and offers to continue', () => {
  go('/', { keepSave: true })
  assert(text().includes('Keep going!'), 'welcome back message missing')
  assert(text().includes('1 of 10 puzzles solved'), 'solved count not read back')
  assert(text().includes('Continue · '), 'no continue button')
})

await test('the level list marks the solved level with a tick and 3 stars', () => {
  go('/world/meadow', { keepSave: true })
  const button = container.querySelector('[aria-label^="Level 3,"]')
  assert(button, 'no level 3 button')
  assert(
    button?.getAttribute('aria-label')?.includes('Solved with 2 of 3 stars'),
    'star record not surfaced',
  )
})

/* ------------------------------------------ choice puzzles (the bug) --- */

await test('REGRESSION: the first tap on a choice option is graded immediately', async () => {
  go('/play/even-steps')
  // Nothing typed yet. A single tap must grade — it used to grade the stale
  // empty value and silently do nothing.
  tap(byText('button', '9'), 'option 9')
  await settle()
  assert(text().includes('Almost'), `a wrong first tap must be graded, got: ${text().slice(0, 120)}`)
})

await test('choice puzzle: retry then the correct option finishes the level', async () => {
  click(byText('button', 'Try again'), 'retry')
  tap(byText('button', '10'), 'option 10')
  // Grading is deliberately delayed so the pressed state paints first.
  await settle()
  assert(text().includes('Perfect rhythm!'), 'correct option not accepted on the first tap')
  await settle(2000)
  assert(text().includes('Level complete'), 'did not reach results')
  assert(text().includes('Even Steps'), 'results are for the wrong level')
  equal(saveJson().levels['even-steps'].stars, 2, 'two attempts should mean 2 stars')
})

await test('visual choice puzzle: a shape tap is graded on the first try', async () => {
  go('/play/wave-pattern')
  tap(byText('button', '🔺'), 'triangle option')
  await settle()
  assert(text().includes('Look for a set of three'), 'wrong shape was not graded')
})

await test('riddle choice puzzle: the correct option is accepted first time', async () => {
  go('/play/locked-digits')
  assert(text().includes('My ones digit is exactly double'), 'riddle wording changed')
  tap(byText('button', '24'), 'option 24')
  await settle()
  assert(text().includes('The lock is open!'), 'correct option not accepted on the first tap')
  await settle(2000)
  assert(text().includes('The Locked Digits'), 'results are for the wrong level')
})

/* --------------------------------------------------------- more kinds --- */

/** Tap token-bank buttons to build an equation. */
function buildEquation(tokens: string[]) {
  for (const token of tokens) tap(byText('button', token), `token ${token}`)
}

await test('equation puzzle: the fixed = is shown and the slots start empty', () => {
  go('/play/true-equation')
  assert(text().includes('9'), 'token bank missing')
  assert(text().includes('Token bank'), 'no bank label')
  // Four fillable slots, so "keep going…" until all four are placed.
  assert(text().includes('tap a token to start'), 'should start empty')
})

await test('equation puzzle: a false equation is rejected with the nudge', () => {
  // 9 + 4 = 5 is not true.
  buildEquation(['9', '+', '4', '5'])
  assert(text().includes('9 + 4 = 5'), 'live preview should show the built equation')
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('Not true yet'), 'false equation was accepted')
})

await test('equation puzzle: a true equation is accepted and graded', async () => {
  click(byText('button', 'Try again'), 'retry')
  // 9 − 4 = 5 is true. The 4th token fills the slot after the fixed '='.
  buildEquation(['9', '−', '4', '5'])
  assert(text().includes('9 − 4 = 5'), 'live preview wrong')
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('A true equation'), 'true equation was rejected')
  await settle(2000)
  assert(text().includes('Build the Truth'), 'results are for the wrong level')
})

await test('equation puzzle: a number in the operator slot is refused at grading', () => {
  go('/play/true-equation')
  // 9 and 4 go in, filling the number and operator slots. The build is
  // incomplete, so it must not be accepted.
  buildEquation(['9', '4'])
  assert(text().includes('keep going'), 'an incomplete build should say so')
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('Not true yet'), 'an incomplete build should not be accepted')
})

await test('visual count puzzle: the keypad count is graded, and the row hint helps', () => {
  go('/play/reef-count')
  typeAnswer('16')
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('Try counting row by row'), 'wrong count was accepted')
  click(byText('button', 'Try again'), 'retry')
  tap(byText('button', 'Show me a hint'), 'hint')
  assert(text().includes('Count one row at a time'), 'hint not revealed')
  assert(!byText('button', 'Show me a hint'), 'hint button should disappear once used')
})

await test('riddle puzzle: the obvious-but-wrong 17 is rejected, 9 is accepted', async () => {
  go('/play/sheep-flock')
  typeAnswer('17')
  click(byText('button', 'Check my answer'), 'check')
  assert(text().includes('Re-read the riddle'), 'the 17 trap should be rejected')
  click(byText('button', 'Try again'), 'retry')
  typeAnswer('9')
  click(byText('button', 'Check my answer'), 'check')
  await settle(2000)
  assert(text().includes('The Clever Shepherd'), 'did not clear the riddle')
})

await test('using a hint costs a star on an otherwise clean run', async () => {
  go('/play/coral-doubles')
  tap(byText('button', 'Show me a hint'), 'hint')
  typeAnswer('8')
  click(byText('button', 'Check my answer'), 'check')
  await settle(2000)
  assert(text().includes('Nicely done!'), 'a hinted first try should read as 2 stars, not 3')
  assert(saveJson().levels['coral-doubles'].stars === 2, 'hint should cost one star')
})

/* ------------------------------------------------------- dead ends ----- */

await test('an unknown level id shows a friendly dead end, not a crash', () => {
  go('/play/does-not-exist')
  assert(text().includes('could not find that puzzle'), 'no friendly message')
  assert(byText('button', 'Back to the world map'), 'no way out')
})

await test('a level can always be left or skipped, so nobody is ever trapped', () => {
  go('/play/missing-addend')
  assert(byText('button', 'Leave level'), 'no exit')
  // The skip button must point at the *next* level, never back at this one.
  const skip = byText('button', 'Skip to')
  assert(skip, 'no skip button')
  assert(skip.textContent?.includes('Build the Truth'), 'skip points at the wrong level')
  assert(
    !skip.textContent?.includes('Missing Addend'),
    'skip must never offer the level already being played',
  )
})

/* ---------------------------------------------------------- settings --- */

await test('settings shows both toggles and the per-world breakdown', () => {
  go('/settings', { keepSave: true })
  assert(text().includes('Sound effects'), 'no sound setting')
  assert(text().includes('Reduce motion'), 'no motion setting')
  assert(text().includes('Stored on this device only'), 'no privacy note')
  for (const world of WORLDS) assert(text().includes(world.name), `missing ${world.name}`)
  assert(byLabel('Reduce motion')?.getAttribute('aria-checked') === 'false', 'motion should start off')
})

await test('settings motion toggle flips aria-checked and persists', () => {
  tap(byLabel('Reduce motion'), 'motion toggle')
  assert(byLabel('Reduce motion')?.getAttribute('aria-checked') === 'true', 'aria-checked not updated')
  assert(saveJson().settings.reduceMotion === true, 'motion preference not saved')
})

await test('resetting progress needs a confirmation and then wipes the save', () => {
  tap(byText('button', 'Reset progress'), 'reset')
  assert(text().includes('Yes, erase everything'), 'reset is not a two-step action')
  click(byText('button', 'Yes, erase everything'), 'confirm reset')
  const data = saveJson()
  equal(data.totalStars, 0, 'stars not cleared')
  equal(data.totalPoints, 0, 'points not cleared')
  equal(Object.keys(data.levels).length, 0, 'level records not cleared')
  equal(data.lastLevelId, null, 'last level not cleared')
})

await test('after a reset, home is back to a clean slate', () => {
  go('/', { keepSave: true })
  assert(text().includes('0 of 10 puzzles solved'), 'home did not reset')
  assert(text().includes('Start playing'), 'should offer a fresh start')
})

/* ----------------------------------------------- every puzzle mounts --- */

await test('all 10 puzzles mount their own view without a dead end', () => {
  equal(PUZZLES.length, 10, 'expected 10 puzzles')
  for (const puzzle of PUZZLES) {
    unmount()
    mount(`/play/${puzzle.id}`)
    assert(!text().includes('could not find'), `${puzzle.id} did not resolve`)
    assert(text().includes(puzzle.prompt.slice(0, 20)), `${puzzle.id} prompt not shown`)
    assert(
      container.querySelector('input, [role="switch"], button') !== null,
      `${puzzle.id} rendered with no way to answer`,
    )
  }
})

unmount()

if (jsdomErrors.length > 0) {
  console.error('\nUncaught jsdom errors:')
  for (const e of jsdomErrors) console.error(`  ${e}`)
}

const failedCount = failed + jsdomErrors.length
console.log(
  `\n${passed} UI checks passed` + (failedCount ? `, ${failedCount} FAILED` : '') + '\n',
)
if (failedCount) process.exitCode = 1
