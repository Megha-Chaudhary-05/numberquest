import type { NumericPuzzle } from '../../data/types'
import { AnswerSlot, NumberPad } from '../ui/NumberPad'
import type { PuzzleViewProps } from './types'

/**
 * Free numeric entry.
 *
 * `parts` lets the level show an inline expression around the answer slot —
 * e.g. `['7', '+', null, '=', '12']` renders as  7 + [ ? ] = 12. When the
 * level has no parts, the slot simply sits on its own.
 */
export function NumericView({ puzzle, ...rest }: PuzzleViewProps) {
  const { value, onChange, onSubmit, phase, disabled } = rest
  const p = puzzle as NumericPuzzle

  const hasExpression = p.parts.length > 1
  const slotState =
    phase === 'graded' ? (value === String(p.answer) ? 'correct' : 'wrong') : 'idle'

  return (
    <div className="space-y-5">
      {hasExpression ? (
        <div
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          role="math"
          aria-label={p.parts.filter(Boolean).join(' ')}
        >
          {p.parts.map((part, i) =>
            part === null ? (
              <AnswerSlot
                key={i}
                value={value}
                unit={p.unit}
                state={slotState}
                wide={hasExpression}
                label="Your answer"
              />
            ) : (
              <span
                key={i}
                className="px-1 text-3xl font-extrabold text-ink-soft tabular-nums sm:text-4xl"
              >
                {part}
              </span>
            ),
          )}
        </div>
      ) : (
        <div className="flex justify-center pt-1">
          <AnswerSlot
            value={value}
            unit={p.unit}
            state={slotState}
            label="Your answer"
          />
        </div>
      )}

      <NumberPad
        value={value}
        onChange={onChange}
        onSubmit={onSubmit ?? (() => {})}
        disabled={disabled}
        ariaLabel="Type your answer"
      />
    </div>
  )
}
