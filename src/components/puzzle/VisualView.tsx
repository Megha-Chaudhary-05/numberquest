import { motion } from 'framer-motion'
import type { VisualPuzzle } from '../../data/types'
import { OptionGrid } from '../ui/OptionGrid'
import { AnswerSlot, NumberPad } from '../ui/NumberPad'
import type { PuzzleViewProps } from './types'

/**
 * Picture logic.
 *
 * `count` asks the player to total the grid with the keypad.
 * `next` asks which tile follows the shape pattern, chosen from cards.
 * A `null` cell always renders as the "?" slot.
 */
export function VisualView({ puzzle, ...rest }: PuzzleViewProps) {
  const p = puzzle as VisualPuzzle
  const { value, onChange, onSubmit, selected, onSelect, phase, correctIndex, disabled } = rest

  const answerIsCorrect = value === p.answer
  const slotState = phase === 'graded' ? (answerIsCorrect ? 'correct' : 'wrong') : 'idle'
  const chosenIndex = p.options?.indexOf(value) ?? -1

  return (
    <div className="space-y-6">
      {/* The board */}
      <div className="card overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          {p.rows.map((row, r) => (
            <motion.div
              key={r}
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: r * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
            >
              {row.map((cell, c) =>
                cell === null ? (
                  <span
                    key={c}
                    className="grid aspect-square min-w-12 place-items-center rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50 text-2xl font-extrabold text-brand-400 sm:min-w-14 sm:text-3xl"
                    aria-label="hidden"
                  >
                    ?
                  </span>
                ) : (
                  <span
                    key={c}
                    className="grid aspect-square min-w-12 place-items-center rounded-2xl border-2 border-line bg-white text-3xl shadow-pop sm:min-w-14 sm:text-4xl"
                  >
                    {cell}
                  </span>
                ),
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* The answer surface */}
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
          glyph
          ariaLabel="Which shape comes next?"
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
            ariaLabel="Type the count"
          />
        </div>
      )}
    </div>
  )
}
