import { createElement, type ReactElement } from 'react'
import { ChoiceView } from './ChoiceView'
import { EquationView } from './EquationView'
import { NumericView } from './NumericView'
import { RiddleView } from './RiddleView'
import { SequenceView } from './SequenceView'
import { VisualView } from './VisualView'
import type { PuzzleViewProps } from './types'

/**
 * Maps a puzzle's `kind` to the component that renders it.
 *
 * To add a new kind: write the view, add it to the `Puzzle` union in
 * `data/types.ts`, then add one entry here. `PlayScreen` needs no changes.
 */
export const PUZZLE_VIEWS = {
  sequence: SequenceView,
  choice: ChoiceView,
  numeric: NumericView,
  equation: EquationView,
  visual: VisualView,
  riddle: RiddleView,
} as const

export type PuzzleKind = keyof typeof PUZZLE_VIEWS

/** Render a puzzle's input surface. Unknown kinds fall back to the keypad. */
export function renderPuzzleView(
  kind: string,
  props: PuzzleViewProps,
): ReactElement {
  const View = PUZZLE_VIEWS[kind as PuzzleKind] ?? NumericView
  return createElement(View, props)
}

export type { PuzzleViewProps }
