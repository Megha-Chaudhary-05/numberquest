import type { ChoicePuzzle } from '../../data/types'
import { OptionGrid } from '../ui/OptionGrid'
import type { PuzzleViewProps } from './types'

/** A plain multiple-choice question rendered as full-width cards. */
export function ChoiceView({ puzzle, ...rest }: PuzzleViewProps) {
  const p = puzzle as ChoicePuzzle
  const { onChange, selected, onSelect, phase, correctIndex, disabled } = rest

  return (
    <OptionGrid
      options={p.options}
      selected={selected}
      state={phase}
      correctIndex={correctIndex}
      onSelect={(i) => {
        onChange(p.options[i])
        onSelect?.(i)
      }}
      disabled={disabled}
      layout="cards"
      ariaLabel="Choose one answer"
    />
  )
}
