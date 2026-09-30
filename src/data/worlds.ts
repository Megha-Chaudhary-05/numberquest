import type { World } from './types'

/**
 * The four worlds of NumberQuest.
 *
 * `starsToUnlock` is the *cumulative* total star count the player needs to have
 * earned across the whole game before this world opens. The first world needs
 * none, so it is always available. Max stars per world is `levels x 3`, and the
 * whole game is 30 stars, so the thresholds below stay reachable.
 */
export const WORLDS: World[] = [
  {
    id: 'meadow',
    name: 'Sunbeam Meadow',
    tagline: 'Counting, patterns and friendly arithmetic',
    emoji: '🌻',
    gradient: 'from-amber-200 via-orange-200 to-rose-200',
    accent: 'bg-sunny',
    starsToUnlock: 0,
  },
  {
    id: 'lagoon',
    name: 'Coral Lagoon',
    tagline: 'Spot shapes, count fast, read the pattern',
    emoji: '🐠',
    gradient: 'from-cyan-200 via-sky-300 to-indigo-300',
    accent: 'bg-sky',
    starsToUnlock: 4,
  },
  {
    id: 'ridge',
    name: 'Equation Ridge',
    tagline: 'Balance the scale and build true equations',
    emoji: '⛰️',
    gradient: 'from-violet-300 via-purple-300 to-fuchsia-300',
    accent: 'bg-grape',
    starsToUnlock: 9,
  },
  {
    id: 'ruins',
    name: 'Riddle Ruins',
    tagline: 'Ancient puzzles that reward careful thinking',
    emoji: '🗿',
    gradient: 'from-emerald-300 via-teal-300 to-sky-300',
    accent: 'bg-mint',
    starsToUnlock: 14,
  },
]

export const getWorld = (id: string | undefined): World | undefined =>
  WORLDS.find((w) => w.id === id)
