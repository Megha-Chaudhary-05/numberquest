/* ============================================================== types ==== */
/**
 * Puzzle data contracts.
 *
 * Everything in this file (and in `worlds.ts` / `puzzles.ts`) is pure data with
 * zero React imports. UI components receive a `Puzzle` and know how to render
 * it; grading lives in `src/game/grading.ts`. That separation is what makes it
 * possible to add levels without touching a single component.
 */

export type WorldId = 'meadow' | 'lagoon' | 'ridge' | 'ruins'

/** Shared fields every puzzle must provide. */
export interface PuzzleBase {
  /** Stable id — also the route segment: /play/:id */
  id: string
  worldId: WorldId
  /** Short, friendly level name shown in the level list. */
  title: string
  /** Emoji used on the level node and the results screen. */
  badge: string
  /** The question shown at the top of the play screen. */
  prompt: string
  /** A nudge that reveals itself behind a "Hint" button. */
  hint: string
  /** Shown after solving: teaches the *why*, not just the answer. */
  explanation: string
  /** Celebratory line on a correct answer. */
  cheer: string
  /** Gentle, non-punishing line after a wrong attempt. */
  nudge: string
  /** Points awarded for clearing the level, before bonuses. */
  basePoints: number
}

/** A row of items where the player must supply the next one. */
export interface SequencePuzzle extends PuzzleBase {
  kind: 'sequence'
  /** The shown terms, e.g. ['2', '4', '6', '8']. */
  items: string[]
  /** Buttons offered as possible next terms. */
  options: string[]
  answer: string
  /** Renders the terms as large emoji rather than numbers. */
  glyphs?: boolean
}

/** Pick one of several cards. */
export interface ChoicePuzzle extends PuzzleBase {
  kind: 'choice'
  options: string[]
  answer: string
}

/**
 * Type the answer on a numeric keypad.
 * `parts` renders an inline expression; a `null` entry is an empty slot.
 */
export interface NumericPuzzle extends PuzzleBase {
  kind: 'numeric'
  parts: Array<string | null>
  answer: number
  /** Accepted distance from `answer` — used for rounding-style questions. */
  tolerance?: number
  /** Appended after the entry, e.g. 'apples'. */
  unit?: string
}

/** Drag-free equation builder: fill the slots from a token bank. */
export interface EquationPuzzle extends PuzzleBase {
  kind: 'equation'
  /** One entry per slot. The `=` slots are fixed and need no token. */
  slots: Array<'num' | 'op' | '='>
  /** The tokens the player can spend. Duplicates are allowed. */
  tokens: string[]
  /** Shown under the prompt as a worked example. */
  example: string
}

/** A picture puzzle: count a grid, or spot the next tile in a shape pattern. */
export interface VisualPuzzle extends PuzzleBase {
  kind: 'visual'
  mode: 'count' | 'next'
  /** Rows of emoji. A `null` cell renders as the "?" slot. */
  rows: Array<Array<string | null>>
  answerMode: 'numeric' | 'choice'
  options?: string[]
  answer: string
  unit?: string
}

/** A text riddle, answered with either the keypad or option cards. */
export interface RiddlePuzzle extends PuzzleBase {
  kind: 'riddle'
  /** Big decorative emoji for the riddle card. */
  art: string
  riddle: string
  answerMode: 'numeric' | 'choice'
  options?: string[]
  answer: string
  unit?: string
}

export type Puzzle =
  | SequencePuzzle
  | ChoicePuzzle
  | NumericPuzzle
  | EquationPuzzle
  | VisualPuzzle
  | RiddlePuzzle

/* ============================================================= worlds ==== */

export interface World {
  id: WorldId
  name: string
  tagline: string
  emoji: string
  /** Tailwind gradient classes for the world card + level-select header. */
  gradient: string
  /** Solid accent used for buttons and the map path. */
  accent: string
  /** Total stars needed to open the *next* world. */
  starsToUnlock: number
}

export const WORLD_IDS: WorldId[] = ['meadow', 'lagoon', 'ridge', 'ruins']
