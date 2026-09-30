import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { EquationPuzzle } from '../../data/types'
import { formatEquation, isEquationSolved } from '../../game/grading'
import { play } from '../../game/sound'
import type { PuzzleViewProps } from './types'

/**
 * Equation builder.
 *
 * The player taps tokens from a bank to fill fixed slots (`a op b = c`).
 * Tapping a filled slot clears it. Grading is done by *evaluating* the
 * equation in `grading.ts`, not by string-matching the intended answer, so
 * every genuinely true arrangement is accepted.
 */
export function EquationView({ puzzle, ...rest }: PuzzleViewProps) {
  const p = puzzle as EquationPuzzle
  const { value, onChange, phase, disabled } = rest

  // `value` is the space-joined contents of the filled slots, in order.
  const placed = value ? value.split(' ').filter(Boolean) : []
  const parts = p.slots.map((slot, i) => {
    if (slot === '=') return '='
    // Slots come in order a, op, b, c? (slots: ['num','op','num','=','num'])
    // The user fills num, op, num, num in order of tapping — the 4th placed is c.
    // Map to positions 0,1,2,4 respectively.
    const index = p.slots
      .slice(0, i)
      .filter((s) => s !== '=')
      .length
    return placed[index] ?? ''
  })

  // The bank counts down as tokens are spent, so duplicates are tracked by id.
  const bank = p.tokens
    .map((token, i) => ({ token, i }))
    .filter(({ token }) => !placed.includes(token))

  // Enter / Escape shortcuts.
  useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placed.length) {
        e.preventDefault()
        onChange('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, onChange, placed.length])

  // `full` counts only the slots the player can fill: the `=` is fixed on
  // screen, so it is never part of what they place.
  const fillable = p.slots.filter((s) => s !== '=')
  const full = placed.length === fillable.length
  const solved = full && isEquationSolved(p, parts.filter(Boolean))
  const wrong = phase === 'graded' && !solved

  const place = (token: string) => {
    if (disabled || full) return
    play('select')
    onChange([...placed, token].join(' '))
  }

  const clearSlot = (index: number) => {
    if (disabled) return
    play('tap')
    if (p.slots[index] === '=') return
    const placedIndex = p.slots
      .slice(0, index)
      .filter((s) => s !== '=')
      .length
    const next = placed.slice()
    next.splice(placedIndex, 1)
    onChange(next.join(' '))
  }

  const clearAll = () => {
    if (disabled || !placed.length) return
    play('back')
    onChange('')
  }

  return (
    <div className="space-y-5">
      {/* -------------------------------------------------- the equation --- */}
      <div
        className={[
          'card relative flex flex-wrap items-center justify-center gap-2 p-4 sm:gap-3 sm:p-6',
          solved ? 'border-mint' : wrong ? 'border-coral' : '',
        ].join(' ')}
        role="math"
        aria-label={`Equation so far: ${formatEquation(parts) || 'empty'}`}
      >
        {p.slots.map((slot, i) => {
          const token = parts[i]
          const isEquals = slot === '='
          return (
            <span key={i} className="flex items-center gap-2 sm:gap-3">
              {isEquals ? (
                <span
                  className="grid aspect-square min-w-12 place-items-center rounded-2xl border-2 border-line bg-brand-50 text-3xl font-extrabold text-brand-500 sm:min-w-14 sm:text-4xl"
                  aria-hidden="true"
                >
                  =
                </span>
              ) : (
                <SlotButton
                  slot={slot}
                  token={token}
                  onClick={token ? () => clearSlot(i) : undefined}
                  disabled={disabled}
                  correct={solved}
                  wrong={wrong}
                  label={
                    token
                      ? `${token}, tap to clear`
                      : slot === 'num'
                        ? 'empty number slot'
                        : 'empty operator slot'
                  }
                />
              )}
            </span>
          )
        })}
      </div>

      {/* ----------------------------------------------------- the bank --- */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-extrabold tracking-wide text-ink-faint uppercase">
            Token bank
          </span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled || !placed.length}
            className="min-h-9 rounded-xl px-3 text-xs font-bold text-coral transition active:translate-y-0.5 disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {bank.map(({ token, i }) => (
            <motion.button
              key={i}
              type="button"
              disabled={disabled || full}
              onClick={() => place(token)}
              whileTap={disabled || full ? undefined : { scale: 0.9, y: 3 }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="grid aspect-square place-items-center rounded-2xl border-2 border-line bg-white text-2xl font-extrabold text-ink shadow-pop transition-colors hover:bg-brand-50 active:bg-brand-100 active:shadow-none disabled:pointer-events-none disabled:opacity-40 sm:text-3xl"
            >
              {token === '-' ? '−' : token}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Live preview so the player can test their own work. */}
      <p
        className="min-h-6 text-center text-sm font-bold text-ink-soft"
        aria-live="polite"
      >
        {full ? (
          <>
            {formatEquation(parts)}{' '}
            {phase === 'graded' ? (solved ? '✓' : '✗') : '— check the sides match'}
          </>
        ) : placed.length ? (
          'keep going…'
        ) : (
          'tap a token to start'
        )}
      </p>
    </div>
  )
}

/* ============================================================== slot ==== */

function SlotButton({
  slot: _slot,
  token,
  onClick,
  disabled,
  correct,
  wrong,
  label,
}: {
  /** 'num' | 'op' — kept for readability; both render the same placeholder. */
  slot: 'num' | 'op'
  token?: string
  onClick?: () => void
  disabled: boolean
  correct: boolean
  wrong: boolean
  label: string
}) {  const tone = correct
    ? 'border-mint bg-mint-soft text-emerald-700'
    : wrong
      ? 'border-coral bg-coral-soft text-rose-600'
      : token
        ? 'border-brand-400 bg-brand-50 text-brand-700'
        : 'border-dashed border-brand-300 bg-white text-brand-300'

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.button
        key={token ?? 'empty'}
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        whileTap={disabled || !onClick ? undefined : { scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        aria-label={label}
        className={[
          'grid aspect-square min-w-12 place-items-center rounded-2xl border-2 text-3xl font-extrabold sm:min-w-14 sm:text-4xl',
          'transition-colors duration-200',
          onClick ? 'shadow-pop active:translate-y-1 active:shadow-none' : 'cursor-default',
          'disabled:pointer-events-none',
          tone,
        ].join(' ')}
      >
        {token ? (token === '-' ? '−' : token) : '?'}
      </motion.button>
    </AnimatePresence>
  )
}
