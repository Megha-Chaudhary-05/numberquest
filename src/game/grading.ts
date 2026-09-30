import type { EquationPuzzle, Puzzle } from '../data/types'

/* ============================================================= grading ==== */
/**
 * Grading is deliberately tolerant and kind: a wrong answer costs a little
 * score, never progress, and there are no lives to lose.
 */

/** Normalise user input for comparison: trim, collapse spaces, unify minus. */
export function normalise(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[−–—]/g, '-')
    .toUpperCase()
}

/** True when `input` is (numerically) the puzzle's answer. */
export function isCorrect(puzzle: Puzzle, input: string): boolean {
  const value = normalise(input)
  if (!value) return false

  switch (puzzle.kind) {
    case 'sequence':
    case 'choice':
      return value === normalise(puzzle.answer)

    case 'numeric':
    case 'riddle': {
      const given = Number(value.replace(/[^\d.-]/g, ''))
      if (!Number.isFinite(given)) return false
      const tolerance = puzzle.kind === 'numeric' ? (puzzle.tolerance ?? 0) : 0
      return Math.abs(given - Number(puzzle.answer)) <= tolerance
    }

    case 'visual': {
      if (puzzle.answerMode === 'choice') return value === normalise(puzzle.answer)
      const given = Number(value)
      return Number.isFinite(given) && given === Number(puzzle.answer)
    }

    case 'equation':
      return isEquationSolved(puzzle, value.split(' '))
  }
}

/** True when the player has entered enough to be worth grading. */
export function hasAnswer(puzzle: Puzzle, input: string): boolean {
  if (puzzle.kind === 'equation') return input.trim().length > 0
  return normalise(input).length > 0
}

/* =========================================================== selectors ==== */

/** The option list for choice-style kinds; undefined for the others. */
export function optionList(puzzle: Puzzle): string[] | undefined {
  switch (puzzle.kind) {
    case 'sequence':
    case 'choice':
    case 'visual':
    case 'riddle':
      return puzzle.options
    case 'numeric':
    case 'equation':
      return undefined
  }
}

/** Index of the correct option, or -1 when the kind has no options. */
export function correctOptionIndex(puzzle: Puzzle): number {
  const options = optionList(puzzle)
  if (!options || puzzle.kind === 'numeric' || puzzle.kind === 'equation') return -1
  return options.indexOf(puzzle.answer)
}

/**
 * True for the kinds where tapping an option commits the answer immediately.
 * The rest are graded by the keypad's "ok" key or the Check button.
 */
export function gradesOnSelect(puzzle: Puzzle): boolean {
  switch (puzzle.kind) {
    case 'sequence':
    case 'choice':
      return true
    case 'visual':
      return puzzle.answerMode === 'choice'
    case 'riddle':
      return puzzle.answerMode === 'choice'
    case 'numeric':
    case 'equation':
      return false
  }
}

/** True for the kinds that need an explicit Check / ok press. */
export function needsSubmit(puzzle: Puzzle): boolean {
  return !gradesOnSelect(puzzle)
}

/* =========================================================== equations ==== */

/**
 * Validate a built equation of the shape `a op b = c`.
 *
 * `parts` is the list of tokens the player placed, in the order of the
 * *fillable* slots — the `=` is rendered as fixed furniture, so it is never in
 * this list. Every token is checked against its slot type, then the maths is
 * verified, so a number can never fill the operator slot or vice versa.
 */
export function isEquationSolved(puzzle: EquationPuzzle, parts: string[]): boolean {
  const slots = puzzle.slots.filter((slot) => slot !== '=')
  if (parts.length !== slots.length) return false
  if (parts.some((p) => !p)) return false

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const token = normalise(parts[i])
    if (slot === 'num' && !/^\d+$/.test(token)) return false
    if (slot === 'op' && !/^[-+]$/.test(token)) return false
  }

  // `slots` holds only the fillable positions, already validated above, so the
  // operand order comes from the puzzle rather than a hard-coded shape. For the
  // shipped shape (`num op num = num`) that reads as a, op, b, c.
  const [a, op, b, c] = slots.map((_slot, i) => normalise(parts[i]))

  const left = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b)
  return left === Number(c)
}

/**
 * Render a token list as `9 − 4 = 5`, using a proper minus sign.
 * `=` entries are passed through untouched.
 */
export function formatEquation(parts: string[]): string {
  return parts.filter((p) => p).map((p) => (p === '-' ? '−' : p)).join(' ')
}

/* ========================================================== explanations ==== */

/** A short "the answer was X" line for the results screen. */
export function answerLabel(puzzle: Puzzle): string {
  switch (puzzle.kind) {
    case 'numeric':
      return puzzle.unit ? `${puzzle.answer} ${puzzle.unit}` : String(puzzle.answer)
    case 'riddle':
    case 'visual':
      return puzzle.unit ? `${puzzle.answer} ${puzzle.unit}` : puzzle.answer
    case 'equation':
      return puzzle.example
    default:
      return puzzle.answer
  }
}
