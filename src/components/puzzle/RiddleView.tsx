import { motion } from 'framer-motion'
import type { RiddlePuzzle } from '../../data/types'
import { OptionGrid } from '../ui/OptionGrid'
import { AnswerSlot, NumberPad } from '../ui/NumberPad'
import type { PuzzleViewProps } from './types'

/**
 * A riddle presented on an "ancient tablet" card, answered with either the
 * keypad (numeric) or option cards (choice).
 */
export function RiddleView({ puzzle, ...rest }: PuzzleViewProps) {
  const p = puzzle as RiddlePuzzle
  const { value, onChange, onSubmit, selected, onSelect, phase, correctIndex, disabled } = rest

  const slotState = phase === 'graded' ? (value === p.answer ? 'correct' : 'wrong') : 'idle'
  const chosenIndex = p.options?.indexOf(value) ?? -1

  return (
    <div className="space-y-6">
      <motion.blockquote
        initial={{ opacity: 0, rotate: -1.5, y: 14 }}
        animate={{ opacity: 1, rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="relative overflow-hidden rounded-4xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-card sm:p-7"
      >
        {/* Decorative corner glyphs, hidden from screen readers. */}
        <span className="pointer-events-none absolute -top-2 -left-1 text-5xl opacity-15" aria-hidden="true">
          {p.art}
        </span>
        <span className="pointer-events-none absolute -right-1 -bottom-3 text-6xl opacity-15" aria-hidden="true">
          {p.art}
        </span>

        <span className="mb-3 block text-4xl sm:text-5xl" aria-hidden="true">
          {p.art}
        </span>
        <p className="relative text-lg leading-relaxed font-bold text-amber-950 sm:text-xl">
          {p.riddle}
        </p>
      </motion.blockquote>

      {p.answerMode === 'choice' ? (
        <OptionGrid
          options={p.options ?? []}
          selected={selected ?? (chosenIndex >= 0 ? chosenIndex : null)}
          state={phase}
          correctIndex={correctIndex}
          onSelect={(i) => {
            onChange(p.options?.[i] ?? '')
            onSelect?.(i)
          }}
          disabled={disabled}
          ariaLabel="Choose the answer to the riddle"
        />
      ) : (
        <div className="space-y-5">
          <div className="flex justify-center">
            <AnswerSlot value={value} unit={p.unit} state={slotState} label="Your answer" />
          </div>
          <NumberPad
            value={value}
            onChange={onChange}
            onSubmit={onSubmit ?? (() => {})}
            disabled={disabled}
            ariaLabel="Type the answer to the riddle"
          />
        </div>
      )}
    </div>
  )
}
