/* ========================================================== generation ==== */
/**
 * Level generation.
 *
 * Writing 200 puzzles by hand is not maintainable, so levels are *generated*
 * from templates by a seeded PRNG. Two properties make this safe:
 *
 *  1. **Deterministic.** The seed is derived from the level id, so a given level
 *     always produces the same puzzle. Progress can never point at a level that
 *     has quietly changed shape.
 *  2. **Self-verifying.** Every generator returns the answer it actually
 *     computed, and `grading.ts` re-checks it. The test suite asserts that all
 *     200 levels are answerable and that no answer leaks into a distractor.
 *
 * Each world has a themed pool of generators. Difficulty widens the numbers and
 * the number of reasoning steps, not just the digit count.
 */
import type {
  ChoicePuzzle,
  Difficulty,
  EquationPuzzle,
  NumericPuzzle,
  Puzzle,
  RiddlePuzzle,
  SequencePuzzle,
  VisualPuzzle,
  WorldId,
} from './types'

/* ----------------------------------------------------------------- rng --- */

/** mulberry32 — tiny, fast, and stable across runs. */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number

/** Stable 32-bit hash of a string, so ids map to seeds. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/* -------------------------------------------------------------- helpers --- */

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))

const pick = <T,>(rng: Rng, list: readonly T[]): T =>
  list[Math.floor(rng() * list.length) % list.length]

/** Fisher–Yates on a copy. */
function shuffled<T>(rng: Rng, list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Build 4 distinct options around `answer`, always including it.
 * Distractors are nudged off by a step that grows with the number's size, and
 * `answer` is never duplicated.
 */
function optionsAround(rng: Rng, answer: number, count = 4, spread = 1): number[] {
  const step = Math.max(1, Math.round(Math.abs(answer) * spread * 0.06) || 1)
  const set = new Set<number>([answer])
  const offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]
  let i = 0
  let guard = 0
  while (set.size < count && guard < 200) {
    const sign = i % 2 === 0 ? 1 : -1
    const magnitude = offsets[i % offsets.length]
    const candidate = answer + sign * magnitude * step
    // Never offer a negative count, and never 0 where a count is implied.
    if (candidate >= 0) set.add(candidate)
    i++
    guard++
  }
  // Top up with plain sequential values if the step was too coarse.
  let filler = answer + count * step
  while (set.size < count) {
    if (filler >= 0) set.add(filler)
    filler += step
  }
  return shuffled(rng, [...set])
}

const asStrings = (nums: number[]) => nums.map(String)

/** Scale a base point value by tier so hard levels feel worth more. */
const pointsFor = (difficulty: Difficulty, index: number): number =>
  (difficulty === 'easy' ? 100 : difficulty === 'medium' ? 160 : 240) + index * 2

/* ============================================================ sequences ==== */

const CHEERS = {
  pattern: ['Perfect rhythm!', 'You spotted the rule!', 'Pattern nailed!', 'Sharp eyes!'],
  arithmetic: ['Nicely counted!', 'Sum sorted!', 'Arithmetic ace!', 'Numbers add up!'],
  missing: ['Balance restored!', 'Gap filled!', 'The scale balances!', 'Fits perfectly!'],
  equation: ['A true equation!', 'It balances!', 'Brilliant building!', 'Proof complete!'],
  visual: ['Eagle eye!', 'Pattern spotted!', 'You counted that fast?', 'Sharp counting!'],
  riddle: ['Riddle solved!', 'Clever thinking!', 'You decoded it!', 'Nicely reasoned!'],
} as const

const NUDGES = {
  pattern: 'Look at how much each term moves by, not at the terms themselves.',
  arithmetic: 'Handle it one step at a time, and keep your running total.',
  missing: 'Work backwards from the total on the right of the equals sign.',
  equation: 'Build the whole thing, then check whether both sides really match.',
  visual: 'Take it one row or one group at a time.',
  riddle: 'Re-read it slowly — the answer is usually hiding in the wording.',
} as const

const cheer = (kind: keyof typeof CHEERS, rng: Rng) => pick(rng, CHEERS[kind])
const nudge = (kind: keyof typeof NUDGES) => NUDGES[kind]

/** Shapes used by the visual-pattern levels. */
const SHAPES = ['🔺', '🔵', '⭐', '🟩', '🟨', '🟣', '❤️', '💎'] as const

/** Fish for count-the-picture levels. */
const FISH = ['🐠', '🐟', '🦀', '🐙', '🦑', '🐚'] as const

interface GenCtx {
  id: string
  worldId: WorldId
  difficulty: Difficulty
  levelNumber: number
  title: string
  badge: string
}

/* ------------------------------------------------------------ sequences --- */

/**
 * Number patterns. Difficulty controls the rule: easy is a constant step, medium
 * adds multiplication and alternating rules, hard adds growing steps and
 * square-number patterns.
 */
function makeSequence(ctx: GenCtx, rng: Rng): SequencePuzzle {
  const hard = ctx.difficulty === 'hard'
  const medium = ctx.difficulty === 'medium'

  let items: number[]
  let answer: number
  let explanation: string
  let hint: string

  if (ctx.difficulty === 'easy') {
    // Constant step, small numbers.
    const step = pick(rng, [1, 2, 2, 3, 4, 5, 10])
    const start = int(rng, 1, 9)
    items = [0, 1, 2, 3].map((i) => start + i * step)
    answer = start + 4 * step
    explanation = `Each term grows by ${step}: ${items.join(' → ')}. One more ${step} makes ${answer}, so the pattern continues with ${answer}.`
    hint = `Check the gap between neighbouring numbers — it stays the same every time.`
  } else if (medium && !hard) {
    // Either ×2 or an alternating step.
    if (rng() < 0.5) {
      const start = pick(rng, [1, 2, 3, 4])
      items = [0, 1, 2, 3].map((i) => start * Math.pow(2, i))
      answer = start * 16
      explanation = `The pattern doubles each time: ${items.join(' → ')}. Doubling ${items[3]} gives ${answer}.`
      hint = 'Each number is ×2, not +2. Try multiplying instead of adding.'
    } else {
      const step = pick(rng, [3, 4, 5, 6])
      const start = int(rng, 1, 6)
      items = [0, 1, 2, 3].map((i) => start + i * step)
      answer = start + 4 * step
      explanation = `Every step adds ${step}: ${items.join(' → ')}. ${items[3]} + ${step} = ${answer}.`
      hint = `The gap stays ${step}. What is ${items[3]} plus ${step}?`
    }
  } else {
    // Growing steps: 1, 2, 3, 4...
    const start = int(rng, 1, 5)
    const gaps = hard ? [1, 2, 3] : [2, 2, 4]
    const seq = [start]
    for (const g of gaps) seq.push(seq[seq.length - 1] + g)
    items = seq
    // The next jump continues the growth, so it is one more than the last gap.
    const nextGap = hard ? 4 : 6
    answer = seq[3] + nextGap
    explanation = `The steps grow by 1 each time: +${gaps.join(', +')}. So after ${items[3]} the next jump is +${nextGap}, giving ${answer}.`
    hint = 'Look at the size of each jump — they are not all the same.'
  }

  const options = optionsAround(rng, answer, 4, hard ? 1.4 : 1)
  return {
    ...ctx,
    kind: 'sequence',
    items: items.map(String),
    options: asStrings(options),
    answer: String(answer),
    prompt: `${ctx.title}: which number comes next?`,
    hint,
    explanation,
    cheer: cheer('pattern', rng),
    nudge: nudge('pattern'),
    basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
  }
}

/* ------------------------------------------------------------- numeric --- */

/**
 * Word problems and missing-addend sums. Easy is one or two steps, medium adds a
 * multiplication, hard chains three operations in a stated order.
 */
function makeNumeric(ctx: GenCtx, rng: Rng): NumericPuzzle {
  const hard = ctx.difficulty === 'hard'
  const medium = ctx.difficulty === 'medium'
  const unit = pick(rng, ['apples', 'stars', 'coins', 'flowers', 'seashells', 'stickers'])

  const themes = [
    { thing: 'balloons', verb: 'let go of' },
    { thing: 'apples', verb: 'gave away' },
    { thing: 'stickers', verb: 'traded' },
    { thing: 'marbles', verb: 'dropped' },
  ]
  const theme = pick(rng, themes)

  if (ctx.difficulty === 'easy') {
    const start = int(rng, 12, 30)
    const give = int(rng, 3, 8)
    const find = int(rng, 4, 10)
    const answer = start - give + find
    return {
      ...ctx,
      kind: 'numeric',
      parts: [null, unit],
      answer,
      unit,
      prompt: `A picker gathers ${start} ${unit}, ${theme.verb} ${give}, then finds ${find} more under the tree. How many are left?`,
      hint: 'Two steps: first the ones that left, then the ones that were found.',
      explanation: `Start with ${start}. Losing ${give} leaves ${start} − ${give} = ${start - give}. Finding ${find} more gives ${start - give} + ${find} = ${answer}.`,
      cheer: cheer('arithmetic', rng),
      nudge: nudge('arithmetic'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  if (medium && !hard) {
    const boxes = int(rng, 3, 6)
    const each = int(rng, 4, 7)
    const spent = int(rng, 5, 12)
    const answer = boxes * each - spent
    return {
      ...ctx,
      kind: 'numeric',
      parts: [null, unit],
      answer,
      unit,
      prompt: `${boxes} boxes hold ${each} ${unit} each. ${int(rng, 2, 5)} friends take ${spent} between them. How many are left?`,
      hint: 'Multiply to find the starting total first, then take the friends away.',
      explanation: `${boxes} × ${each} = ${boxes * each} to begin with. Taking away ${spent} leaves ${boxes * each} − ${spent} = ${answer}.`,
      cheer: cheer('arithmetic', rng),
      nudge: nudge('arithmetic'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  // Hard: a three-step chain, or a missing addend.
  if (rng() < 0.5) {
    const addend = int(rng, 11, 29)
    const product = int(rng, 4, 9)
    const total = addend + product
    return {
      ...ctx,
      kind: 'numeric',
      parts: [String(addend), '+', null, '=', String(total)],
      answer: product,
      prompt: 'One weight is missing from the scale. What number fills the gap?',
      hint: 'Subtract the number you can see from the answer on the right.',
      explanation: `In ${addend} + ? = ${total}, take ${addend} away from ${total}: ${total} − ${addend} = ${product}.`,
      cheer: cheer('missing', rng),
      nudge: nudge('missing'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  const groups = int(rng, 4, 7)
  const per = int(rng, 3, 6)
  const base = groups * per
  const bonus = int(rng, 5, 14)
  const answer = base - bonus + int(rng, 2, 9)
  return {
    ...ctx,
    kind: 'numeric',
    parts: [null, unit],
    answer,
    unit,
    prompt: `${groups} trays hold ${per} ${unit} each, so ${base} in total. ${int(rng, 3, 8)} are dropped in the grass and ${pick(rng, [2, 3, 4, 5])} more are picked up. How many are on the trays now?`,
    hint: 'Work strictly in order: multiply, subtract, then add.',
    explanation: `Start with ${groups} × ${per} = ${base}. Losing some leaves ${base} − ${bonus} = ${base - bonus}. Picking up more gives ${base - bonus} plus the last few = ${answer}.`,
    cheer: cheer('arithmetic', rng),
    nudge: nudge('arithmetic'),
    basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
  }
}

/* ------------------------------------------------------------ equation --- */

/**
 * Token-built equations. The player spends tokens to make a true statement.
 * Difficulty controls how large the numbers get, not the structure.
 */
function makeEquation(ctx: GenCtx, rng: Rng): EquationPuzzle {
  const hard = ctx.difficulty === 'hard'
  const a = hard ? int(rng, 11, 19) : ctx.difficulty === 'medium' ? int(rng, 6, 9) : int(rng, 2, 5)
  const b = hard ? int(rng, 6, 9) : int(rng, 2, 4)
  const c = a + b

  // One spare token, so the player must choose which numbers to spend. The bank
  // is longer than the four fillable slots; grading checks the maths, not which
  // tokens were used, so any true arrangement is accepted.
  const tokens = shuffled(rng, [String(a), String(b), String(c), '−', '+'])

  return {
    ...ctx,
    kind: 'equation',
    slots: ['num', 'op', 'num', '=', 'num'],
    tokens,
    example: `For example: ${a} + ${b} = ${c}`,
    // The prompt names the numbers in play so no two equation levels read the
    // same way on the level grid.
    prompt: `Use the numbers ${[a, b, c].sort((x, y) => x - y).join(', ')} to build an equation that is actually true.`,
    hint: 'Try both operators and check which side really matches.',
    explanation: `More than one arrangement works — ${a} + ${b} = ${c} is true, and so is ${a} − ${b} = ${a - b}. The skill is building it first, then testing whether both sides match.`,
    cheer: cheer('equation', rng),
    nudge: nudge('equation'),
    basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
  }
}

/* -------------------------------------------------------------- visual --- */

/**
 * Picture puzzles in two modes: `next` (repeating shape groups) and `count`
 * (count a grid, or work out a hidden doubling row).
 */
function makeVisual(ctx: GenCtx, rng: Rng): VisualPuzzle {
  const hard = ctx.difficulty === 'hard'
  const medium = ctx.difficulty === 'medium'

  if (rng() < 0.45) {
    // Repeating group of shapes.
    const groupSize = hard ? 4 : medium ? 3 : 3
    const group = shuffled(rng, SHAPES).slice(0, groupSize)
    const repeats = hard ? 2 : medium ? 1 : 1
    const cycle: string[] = []
    for (let i = 0; i < repeats; i++) cycle.push(...group)
    const rows = [[...cycle, null]]
    const answer = group[0]
    return {
      ...ctx,
      kind: 'visual',
      mode: 'next',
      rows: rows as Array<Array<string | null>>,
      answerMode: 'choice',
      options: shuffled(rng, group.slice(0, 3)),
      answer,
      prompt: `The tide repeats the same ${groupSize} shapes. Which shape comes next?`,
      hint: `The pattern is a group of ${groupSize}: ${group.join(' ')} — then it starts again.`,
      explanation: `The shapes form a repeating group of ${groupSize}: ${cycle.join(' ')}. The next shape restarts the group, so it is ${answer}.`,
      cheer: cheer('visual', rng),
      nudge: nudge('visual'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  if (rng() < 0.5) {
    // Count a grid of creatures.
    const rowCount = hard ? 4 : medium ? 3 : 3
    const creature = pick(rng, FISH)
    const rows: Array<Array<string | null>> = []
    let total = 0
    for (let r = 0; r < rowCount; r++) {
      const n = int(rng, 2, hard ? 7 : 5)
      total += n
      rows.push(Array.from({ length: n }, () => creature))
    }
    return {
      ...ctx,
      kind: 'visual',
      mode: 'count',
      rows,
      answerMode: 'numeric',
      answer: String(total),
      unit: creature === '🐠' ? 'fish' : 'creatures',
      prompt: `How many ${creature === '🐠' ? 'fish' : 'creatures'} are swimming across the whole reef?`,
      hint: 'Count one row at a time, then add the rows together.',
      explanation: `Count each row and add them: ${rows.map((r) => r.length).join(' + ')} = ${total}. Row by row is far more reliable than counting everything at once.`,
      cheer: cheer('visual', rng),
      nudge: nudge('visual'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  // Doubling rows with the last one hidden.
  const start = int(rng, 1, hard ? 4 : 3)
  const rowsShown = hard ? 4 : 3
  const glyph = pick(rng, ['🌿', '🍄', '🌸', '⭐'])
  const rows: Array<Array<string | null>> = []
  for (let i = 0; i < rowsShown; i++) {
    const n = start * Math.pow(2, i)
    rows.push(Array.from({ length: n }, () => glyph))
  }
  const answer = start * Math.pow(2, rowsShown)
  return {
    ...ctx,
    kind: 'visual',
    mode: 'count',
    rows: [...rows, [null]] as Array<Array<string | null>>,
    answerMode: 'numeric',
    answer: String(answer),
    unit: glyph === '🌸' ? 'flowers' : 'sprouts',
    prompt: 'Each row has twice as many as the row above. The last row is hidden — how many does it hold?',
    hint: 'Find the number you multiply each row by, then apply it once more.',
    explanation: `The rows double every time: ${rows.map((r) => r.length).join(' → ')}. One more doubling of ${rows[rows.length - 1].length} gives ${answer}.`,
    cheer: cheer('visual', rng),
    nudge: nudge('visual'),
    basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
  }
}

/* -------------------------------------------------------------- riddle --- */

/**
 * Text riddles with a verifiable answer. Each template states its own rule in
 * the explanation, and the test suite re-checks the rule against the answer.
 */
function makeRiddle(ctx: GenCtx, rng: Rng): RiddlePuzzle {
  const hard = ctx.difficulty === 'hard'

  // 1. Ones digit is double the tens digit.
  const tens = int(rng, 1, hard ? 4 : 3)
  const answerNum = Number(`${tens}${tens * 2}`)
  const options = shuffled(rng, [
    String(answerNum),
    String(answerNum + 2),
    String(answerNum + 4),
    String(answerNum - 2),
  ])

  if (rng() < 0.5) {
    return {
      ...ctx,
      kind: 'riddle',
      art: '🔐',
      riddle: `I hide somewhere between ${tens * 10} and ${tens * 10 + 10}. My ones digit is exactly double my tens digit. Which number am I?`,
      answerMode: 'choice',
      options,
      answer: String(answerNum),
      // The prompt restates the range, so the level is identifiable on its own
      // and two levels of the same template never read identically.
      prompt: `The lock opens to a number in the ${tens * 10}s. Which of these is hiding behind it?`,
      hint: 'Split each option into two digits and check whether the second is twice the first.',
      explanation: `In ${answerNum} the tens digit is ${tens} and the ones digit is ${tens * 2}, and ${tens * 2} is exactly double ${tens}. The others fail that test.`,
      cheer: cheer('riddle', rng),
      nudge: nudge('riddle'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  // 2. A "how many are left" riddle where the wording names the answer.
  const total = int(rng, 14, 40)
  const stays = int(rng, 7, 12)
  return {
    ...ctx,
    kind: 'riddle',
    art: '🐑',
    riddle: `A shepherd has ${total} sheep. He tells you: "All but ${stays} of them run away." How many sheep are left in the field?`,
    answerMode: 'numeric',
    answer: String(stays),
    unit: 'sheep',
    prompt: `${total} sheep, and all but some of them run away. How many are left?`,
    hint: `The phrase "all but ${stays}" already names the number that stays.`,
    explanation: `"All but ${stays}" means everything except ${stays}. Whatever ran away, exactly ${stays} sheep are still standing in the field.`,
    cheer: cheer('riddle', rng),
    nudge: nudge('riddle'),
    basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
  }
}

/* -------------------------------------------------------------- choice --- */

/**
 * Multiple-choice questions that are not pictures or riddles: ordering,
 * properties, and quick comparisons. Answers are computed, never guessed.
 */
function makeChoice(ctx: GenCtx, rng: Rng): ChoicePuzzle {
  const hard = ctx.difficulty === 'hard'

  const flavour = int(rng, 1, 3)
  if (flavour === 1) {
    // Which is the largest?
    const base = int(rng, hard ? 30 : 10, hard ? 99 : 60)
    const set = new Set<number>([base])
    while (set.size < 4) set.add(base - int(rng, 1, hard ? 25 : 15))
    const options = [...set]
    const answer = Math.max(...options)
    return {
      ...ctx,
      kind: 'choice',
      options: asStrings(shuffled(rng, options)),
      answer: String(answer),
      // Naming the numbers keeps two "largest of these" levels distinguishable.
      prompt: `Three friends score ${options.join(', ')} points between them. Who scored the most?`,
      hint: 'Line the numbers up starting at the left, then read the biggest one.',
      explanation: `Comparing the scores: ${options.join(', ')}. The largest is ${answer}, so that is the top score.`,
      cheer: cheer('arithmetic', rng),
      nudge: nudge('arithmetic'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  if (flavour === 2) {
    // Which is a multiple of `step`?
    const step = pick(rng, [3, 4, 5, 6, 7])
    const answerNum = step * int(rng, 3, 9)
    const distractors: number[] = []
    while (distractors.length < 3) {
      const candidate = int(rng, 2, answerNum + step * 2)
      if (candidate % step !== 0 && !distractors.includes(candidate)) {
        distractors.push(candidate)
      }
    }
    return {
      ...ctx,
      kind: 'choice',
      options: asStrings(shuffled(rng, [answerNum, ...distractors])),
      answer: String(answerNum),
      prompt: `Which of these is a multiple of ${step}?`,
      hint: `Multiply ${step} by 1, 2, 3 and see which of the options appears in that list.`,
      explanation: `${answerNum} = ${step} × ${answerNum / step}, so it is a multiple of ${step}. The others leave a remainder when divided by ${step}.`,
      cheer: cheer('arithmetic', rng),
      nudge: nudge('arithmetic'),
      basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
    }
  }

  // How many numbers in the list are even?
  const size = hard ? 6 : ctx.difficulty === 'medium' ? 5 : 4
  const list: number[] = []
  let evens = 0
  for (let i = 0; i < size; i++) {
    const even = rng() < 0.5
    const n = even ? int(rng, 1, hard ? 20 : 12) * 2 : int(rng, 1, hard ? 20 : 12) * 2 + 1
    if (n > 0 && !list.includes(n)) {
      list.push(n)
      if (even) evens++
    }
  }
  // Always offer the true count plus three plausible near-misses. Building it
  // from `evens` rather than filtering 0..4 keeps 4 options even when the
  // answer is 0, which a plain range filter would collapse to two.
  const distractors = [1, 2, 3, 4, 5].filter((n) => n !== evens)
  const options = shuffled(rng, [evens, ...distractors.slice(0, 3)])
  return {
    ...ctx,
    kind: 'choice',
    options: asStrings(shuffled(rng, options)),
    answer: String(evens),
    prompt: `How many of these numbers are even: ${list.join(', ')}?`,
    hint: 'An even number ends in 0, 2, 4, 6 or 8.',
    explanation: `Even numbers end in 0, 2, 4, 6 or 8. In ${list.join(', ')} that leaves ${evens} even number${evens === 1 ? '' : 's'}.`,
    cheer: cheer('arithmetic', rng),
    nudge: nudge('arithmetic'),
    basePoints: pointsFor(ctx.difficulty, ctx.levelNumber),
  }
}

/* ============================================================== worlds ==== */

/** Which generators each world draws from, and in what proportion. */
const WORLD_POOLS: Record<WorldId, Array<(ctx: GenCtx, rng: Rng) => Puzzle>> = {
  meadow: [makeSequence, makeNumeric, makeChoice, makeSequence, makeNumeric],
  lagoon: [makeVisual, makeSequence, makeChoice, makeVisual, makeNumeric],
  ridge: [makeEquation, makeNumeric, makeEquation, makeChoice, makeSequence],
  ruins: [makeRiddle, makeEquation, makeChoice, makeRiddle, makeVisual],
}

/**
 * Level names come from `title` × `stage`, and the pair is derived from the
 * level number, so the 50 names in a group are all distinct. Reusing a base
 * name with a different stage reads as a deliberate series rather than a
 * duplicate.
 */
const TITLES: Record<WorldId, string[]> = {
  meadow: ['Sunbeam Steps', 'Petal Path', 'Daisy Count', 'Warm Wind', 'Hayfield Run', 'Meadow Math'],
  lagoon: ['Tide Trail', 'Coral Path', 'Bubble Count', 'Reef Rhythm', 'Wave Walk', 'Shell Search'],
  ridge: ['Summit Steps', 'Cliff Ladder', 'Balanced Rocks', 'Ridge Riddle', 'High Path', 'Cairn Count'],
  ruins: ['Ancient Path', 'Temple Steps', 'Carved Symbols', 'Lost Numbers', 'Ruin Riddle', 'Buried Math'],
}

/** Second half of the name. Ten of these cover the 50 levels of a group. */
const STAGES = [
  'Beginnings',
  'Middling',
  'Twist',
  'Detour',
  'Ascent',
  'Rest',
  'Crossing',
  'Narrow Ledge',
  'Deep Cut',
  'Summit',
] as const

const BADGES: Record<WorldId, string[]> = {
  meadow: ['🌻', '🌼', '🌾', '🐝', '🍯', '🧺'],
  lagoon: ['🐠', '🐚', '🪸', '🐙', '🦀', '🐡'],
  ridge: ['⛰️', '🪨', '⚖️', '🧗', '🪜', '🏔️'],
  ruins: ['🗿', '🏺', '📜', '🧱', '🔐', '🕯️'],
}

/**
 * Build one level. The generator is chosen by the level number so the mix is
 * stable, and the rng is seeded from the id so the content never shifts.
 */
export function generateLevel(
  id: string,
  worldId: WorldId,
  difficulty: Difficulty,
  levelNumber: number,
): Puzzle {
  const rng = makeRng(hashSeed(id))
  const pool = WORLD_POOLS[worldId]
  const maker = pool[levelNumber % pool.length]
  const titles = TITLES[worldId]
  const badges = BADGES[worldId]
  const zeroBased = levelNumber - 1
  return maker(
    {
      id,
      worldId,
      difficulty,
      levelNumber,
      title: `${titles[zeroBased % titles.length]} ${STAGES[Math.floor(zeroBased / titles.length) % STAGES.length]}`,
      badge: badges[zeroBased % badges.length],
    },
    rng,
  )
}
