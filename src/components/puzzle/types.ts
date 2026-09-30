import type { Puzzle } from '../../data/types'

/**
 * The contract every puzzle renderer fulfils.
 *
 * A renderer owns only the *input surface* for its kind. Grading, scoring,
 * hints and explanations all live in `PlayScreen`, so adding a kind means
 * adding one component and one registry entry — nothing else changes.
 */
export interface PuzzleViewProps {
  puzzle: Puzzle
  /** The player's current input, as a plain string. */
  value: string
  onChange: (value: string) => void
  /** Grade the current input. Required for kinds that grade on a button. */
  onSubmit?: () => void
  /** Which option the player picked — only used by choice-style kinds. */
  selected: number | null
  onSelect?: (index: number) => void
  /** 'idle' while playing, 'graded' once an attempt has been made. */
  phase: 'idle' | 'graded'
  /** Index of the correct option, for graded choice-style kinds. */
  correctIndex: number
  disabled: boolean
}
