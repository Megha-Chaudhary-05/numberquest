import { generateLevel } from './generators'
import { DIFFICULTIES, WORLD_IDS, type Difficulty, type Puzzle } from './types'

/* ========================================================================== *
 * NumberQuest — level pack 1
 *
 * Ten hand-written puzzles, ordered by world, then by difficulty.
 *
 * Adding content: append an object to PUZZLES. Nothing else needs to change —
 * the map, level list, unlocks and scoring all derive from this array.
 * ========================================================================== */

/* ------------------------------------------------------------- openers ==== */
/**
 * The ten hand-written levels that open each world.
 *
 * They are the tutorial: one idea per level, in order, one of each interaction
 * style. Everything after these is generated (see `generators.ts`), so this list
 * stays small enough to genuinely hand-craft.
 *
 * `difficulty` and `levelNumber` are filled in by `withPlacement` below — the
 * literals below only carry the content.
 */
/**
 * `Puzzle` is a union, and a plain `Omit` over a union collapses to the shared
 * keys only — which would drop `items`, `parts`, `slots` and friends. This
 * distributes the omit across each member so every kind keeps its own fields.
 */
type OmitPlacement = Puzzle extends infer T
  ? T extends Puzzle
    ? Omit<T, 'difficulty' | 'levelNumber'>
    : never
  : never

const OPENERS: OmitPlacement[] = [
  /* ------------------------------------------------- World 1 · Sunbeam Meadow */
  {
    id: 'even-steps',
    kind: 'sequence',
    worldId: 'meadow',
    title: 'Even Steps',
    badge: '🌻',
    prompt: 'The path keeps counting. Which number comes next?',
    items: ['2', '4', '6', '8'],
    options: ['9', '10', '11', '12'],
    answer: '10',
    hint: 'Look at the gaps between neighbouring numbers, not the numbers themselves.',
    explanation:
      'Each step jumps by 2: 2 → 4 → 6 → 8. Two more than 8 is 10, so the pattern continues 10.',
    cheer: 'Perfect rhythm!',
    nudge: 'Almost — check how much each number grows by.',
    basePoints: 100,
  },
  {
    id: 'double-trouble',
    kind: 'sequence',
    worldId: 'meadow',
    title: 'Double Trouble',
    badge: '🍯',
    prompt: 'Every bee doubles the nectar count. What comes next?',
    items: ['1', '2', '4', '8'],
    options: ['10', '12', '16', '20'],
    answer: '16',
    hint: 'Try multiplying each number by 2 instead of adding 2.',
    explanation:
      'This pattern multiplies by 2: 1 → 2 → 4 → 8. Doubling 8 gives 16, so 16 is next.',
    cheer: 'Doubling done right!',
    nudge: 'Close! Think about ×2 rather than +2.',
    basePoints: 110,
  },
  {
    id: 'apple-cart',
    kind: 'numeric',
    worldId: 'meadow',
    title: 'The Apple Cart',
    badge: '🧺',
    prompt:
      'A picker gathers 24 apples, gives 9 away to a friend, then finds 15 more under the tree. How many apples are in the cart now?',
    parts: [null, 'apples'],
    answer: 30,
    unit: 'apples',
    hint: 'Do it in two steps: first the apples given away, then the apples found.',
    explanation:
      'Start with 24. Giving away 9 leaves 24 − 9 = 15. Finding 15 more gives 15 + 15 = 30. So the cart holds 30 apples.',
    cheer: 'Two clean steps — lovely!',
    nudge: 'Try handling the giving-away and the finding separately.',
    basePoints: 120,
  },

  /* ---------------------------------------------------- World 2 · Coral Lagoon */
  {
    id: 'wave-pattern',
    kind: 'visual',
    mode: 'next',
    worldId: 'lagoon',
    title: 'The Wave',
    badge: '🐠',
    prompt: 'The tide repeats the same three shapes. Which shape comes next?',
    rows: [['🔺', '🔵', '⭐', '🔺', '🔵', null]],
    answerMode: 'choice',
    options: ['🔺', '🔵', '⭐'],
    answer: '⭐',
    hint: 'The pattern is a group of three: triangle, circle, star — then it repeats.',
    explanation:
      'The shapes form a repeating trio: 🔺 🔵 ⭐. After 🔺 🔵 the star must come next, and the whole group starts again.',
    cheer: 'You spotted the repeating group!',
    nudge: 'Look for a set of three that keeps restarting.',
    basePoints: 130,
  },
  {
    id: 'reef-count',
    kind: 'visual',
    mode: 'count',
    worldId: 'lagoon',
    title: 'Count the Reef',
    badge: '🐡',
    prompt: 'How many fish are swimming across the whole reef?',
    rows: [
      ['🐠', '🐠', '🐠', '🐠'],
      ['🐠', '🐠', '🐠', '🐠', '🐠'],
      ['🐠', '🐠', '🐠', '🐠', '🐠', '🐠'],
    ],
    answerMode: 'numeric',
    answer: '15',
    unit: 'fish',
    hint: 'Count one row at a time, then add the rows together.',
    explanation:
      'Count each row: 4 + 5 + 6 = 15. Adding row by row is faster and far more reliable than counting every fish in one go.',
    cheer: 'Neat counting!',
    nudge: 'Try counting row by row instead of all at once.',
    basePoints: 140,
  },
  {
    id: 'coral-doubles',
    kind: 'visual',
    mode: 'count',
    worldId: 'lagoon',
    title: 'Coral Doubles',
    badge: '🌿',
    prompt:
      'Each row has twice as many sprouts as the row above. The last row is hidden — how many sprouts does it hold?',
    rows: [['🌿'], ['🌿', '🌿'], ['🌿', '🌿', '🌿', '🌿'], [null]],
    answerMode: 'numeric',
    answer: '8',
    unit: 'sprouts',
    hint: 'Find the number you multiply each row by.',
    explanation:
      'The rows double every time: 1 → 2 → 4. One more double turns 4 into 8, so the hidden row holds 8 sprouts.',
    cheer: 'Extrapolated like a pro!',
    nudge: 'Look at how each row compares with the one above it.',
    basePoints: 150,
  },

  /* -------------------------------------------------- World 3 · Equation Ridge */
  {
    id: 'missing-addend',
    kind: 'numeric',
    worldId: 'ridge',
    title: 'The Missing Addend',
    badge: '⚖️',
    prompt: 'One weight is missing from the scale. What number fills the gap?',
    parts: ['7', '+', null, '=', '12'],
    answer: 5,
    hint: 'Subtract the number you can see from the answer on the right.',
    explanation:
      'In 7 + ? = 12, subtract 7 from 12 to get 12 − 7 = 5. So the missing weight is 5, because 7 + 5 = 12.',
    cheer: 'The scale balances!',
    nudge: 'What must you add to 7 to reach 12?',
    basePoints: 160,
  },
  {
    id: 'true-equation',
    kind: 'equation',
    worldId: 'ridge',
    title: 'Build the Truth',
    badge: '🧱',
    prompt: 'Spend the tokens to build an equation that is actually true.',
    slots: ['num', 'op', 'num', '=', 'num'],
    tokens: ['9', '4', '5', '−', '+'],
    example: 'For example: 4 + 5 = 9',
    hint: 'Try the two different operators and check which side really matches.',
    explanation:
      'More than one answer works — 9 − 4 = 5, 9 − 5 = 4 and 4 + 5 = 9 are all true, and so is 5 + 4 = 9. The skill is building the equation first, then testing whether both sides really match.',
    cheer: 'A true equation — brilliant!',
    nudge: 'Not true yet. Swap an operator and test again.',
    basePoints: 180,
  },

  /* --------------------------------------------------- World 4 · Riddle Ruins */
  {
    id: 'sheep-flock',
    kind: 'riddle',
    worldId: 'ruins',
    title: 'The Clever Shepherd',
    badge: '🐑',
    prompt: 'Solve the shepherd’s riddle.',
    art: '🐑',
    riddle:
      'A shepherd has 17 sheep. He tells you: "All but nine of them run away." How many sheep are left in the field?',
    answerMode: 'numeric',
    answer: '9',
    unit: 'sheep',
    hint: 'The phrase "all but nine" already names the number that stays.',
    explanation:
      '"All but nine" means everything except nine. Whatever ran away, exactly nine sheep are still standing in the field.',
    cheer: 'The old riddle, solved!',
    nudge: 'Re-read the riddle — the answer is hiding in the wording.',
    basePoints: 190,
  },
  {
    id: 'locked-digits',
    kind: 'riddle',
    worldId: 'ruins',
    title: 'The Locked Digits',
    badge: '🔐',
    prompt: 'Which number is hiding behind the lock?',
    art: '🔐',
    riddle:
      'I hide somewhere between 20 and 30. My ones digit is exactly double my tens digit. Which number am I?',
    answerMode: 'choice',
    options: ['24', '26', '28', '22'],
    answer: '24',
    hint: 'Split each option into two digits and check whether the second is twice the first.',
    explanation:
      'In 24 the tens digit is 2 and the ones digit is 4, and 4 is exactly double 2. The others fail: 6, 8 and 2 are never double 2.',
    cheer: 'The lock is open!',
    nudge: 'Compare each number\'s two digits — one should be twice the other.',
    basePoints: 200,
  },
]

/* =========================================================== assembly ==== */
/**
 * How many levels each world+difficulty group holds. With four worlds and three
 * tiers that is 4 × 3 × 50 = 200 levels, 600 stars.
 *
 * The openers take the first `easy` slots of their world, so a new player meets
 * hand-written content first and generated levels after.
 */
export const LEVELS_PER_GROUP = 50

/** Stamp the placement fields onto an opener. */
function withPlacement(
  opener: OmitPlacement,
  difficulty: Difficulty,
  levelNumber: number,
): Puzzle {
  return { ...opener, difficulty, levelNumber } as Puzzle
}

function buildPuzzles(): Puzzle[] {
  const out: Puzzle[] = []

  for (const worldId of WORLD_IDS) {
    const worldOpeners = OPENERS.filter((o) => o.worldId === worldId)
    // Openers fill the first N easy slots, in the order they were written.
    const openerCount = Math.min(worldOpeners.length, LEVELS_PER_GROUP)
    const worldLevels: Puzzle[] = []

    for (const difficulty of DIFFICULTIES) {
      for (let n = 1; n <= LEVELS_PER_GROUP; n++) {
        const opener = difficulty === 'easy' && n <= openerCount ? worldOpeners[n - 1] : undefined
        if (opener) {
          worldLevels.push(withPlacement(opener, difficulty, n))
        } else {
          worldLevels.push(generateLevel(`${worldId}-${difficulty}-${n}`, worldId, difficulty, n))
        }
      }
    }

    // Hand-written openers carry hand-written point values, and a generated level
    // can come out lower than the opener before it. Flooring each level at one
    // more than the level before it guarantees a level is never worth less than
    // an earlier one in the same world, so "later level, more points" always
    // holds.
    let floor = 0
    for (const level of worldLevels) {
      const basePoints = Math.max(level.basePoints, floor + 1)
      out.push({ ...level, basePoints } as Puzzle)
      floor = basePoints
    }
  }

  return out
}

/** Every level in the game, ordered world → difficulty → level number. */
export const PUZZLES: Puzzle[] = buildPuzzles()

/* ============================================================ selectors ==== */

const byId = new Map(PUZZLES.map((p) => [p.id, p]))

export const getPuzzle = (id: string | undefined): Puzzle | undefined =>
  id ? byId.get(id) : undefined

/** Every level in a world, all difficulties, in play order. */
export const puzzlesInWorld = (worldId: Puzzle['worldId']): Puzzle[] =>
  PUZZLES.filter((p) => p.worldId === worldId)

/** One difficulty slice of one world, ordered by level number. */
export const puzzlesInGroup = (
  worldId: Puzzle['worldId'],
  difficulty: Difficulty,
): Puzzle[] => PUZZLES.filter((p) => p.worldId === worldId && p.difficulty === difficulty)

/**
 * Flat, ordered play-through. `ProgressContext` uses this to find the next level
 * after a clear, so it runs world by world, easy → medium → hard.
 */
export const LEVEL_ORDER: Puzzle[] = PUZZLES

/** The level after `id` in play order, or null at the very end. */
export const nextPuzzle = (id: string): Puzzle | null => {
  const i = LEVEL_ORDER.findIndex((p) => p.id === id)
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null
}

export const totalBasePoints = PUZZLES.reduce((sum, p) => sum + p.basePoints, 0)

/** Three stars for every level in the game. */
export const MAX_STARS = PUZZLES.length * 3

/** How many levels a world holds across all difficulties. */
export const worldLevelCount = (worldId: Puzzle['worldId']): number =>
  puzzlesInWorld(worldId).length

/** Stars available in one world across all difficulties. */
export const worldMaxStars = (worldId: Puzzle['worldId']): number =>
  worldLevelCount(worldId) * 3
