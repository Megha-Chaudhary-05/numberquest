import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { play } from '../../game/sound'
import { CheckIcon } from './Icons'

/* ======================================================== option grid ==== */

const TONES = [
  'from-brand-100 to-brand-50 border-brand-200 text-brand-700',
  'from-sky-soft to-white border-sky/30 text-sky-700',
  'from-mint-soft to-white border-mint/30 text-emerald-700',
  'from-sunny-soft to-white border-sunny/40 text-amber-700',
  'from-grape-soft to-white border-grape/30 text-purple-700',
  'from-coral-soft to-white border-coral/30 text-rose-600',
]

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong'

interface OptionGridProps {
  options: string[]
  /** The index the player has committed to, if any. */
  selected: number | null
  /** Set once the round is graded — reveals the right and wrong picks. */
  state: 'idle' | 'graded'
  correctIndex: number
  onSelect: (index: number) => void
  disabled?: boolean
  /** `chips` for single characters, `cards` for long option text. */
  layout?: 'chips' | 'cards'
  /** Renders each option as a big glyph (emoji puzzles). */
  glyph?: boolean
  ariaLabel?: string
}

/**
 * The shared option picker for choice, sequence, visual and riddle puzzles.
 * Tapping a card grades immediately — extra taps on a wrong answer are allowed
 * while `state` is still `idle`, which keeps the tone forgiving.
 */
export function OptionGrid({
  options,
  selected,
  state,
  correctIndex,
  onSelect,
  disabled = false,
  layout = 'chips',
  glyph = false,
  ariaLabel = 'Answer options',
}: OptionGridProps) {
  // A-D / 1-4 shortcuts, matching the letter shown on each card.
  useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const key = e.key.toUpperCase()
      const byLetter = /^[A-F]$/.test(key) ? key.charCodeAt(0) - 65 : -1
      const byDigit = /^[1-6]$/.test(key) ? Number(key) - 1 : -1
      const index = byLetter >= 0 ? byLetter : byDigit
      if (index >= 0 && index < options.length) {
        e.preventDefault()
        onSelect(index)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, onSelect, options.length])

  const letters = 'ABCDEF'

  return (
    <div
      className={
        layout === 'chips'
          ? 'grid grid-cols-2 gap-3 sm:grid-cols-4'
          : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2'
      }
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option, i) => {
        const isCorrect = i === correctIndex
        const isSelected = i === selected
        const showAsCorrect = state === 'graded' && isCorrect
        const showAsWrong = state === 'graded' && isSelected && !isCorrect

        const tone = showAsCorrect
          ? 'from-mint to-emerald-400 border-emerald-600 text-white'
          : showAsWrong
            ? 'from-coral to-rose-400 border-rose-600 text-white'
            : TONES[i % TONES.length]

        return (
          <motion.button
            key={`${option}-${i}`}
            type="button"
            disabled={disabled || state === 'graded'}
            onClick={() => {
              play('select')
              onSelect(i)
            }}
            whileTap={disabled || state === 'graded' ? undefined : { scale: 0.94, y: 2 }}
            initial={false}
            animate={
              showAsCorrect
                ? { scale: [1, 1.08, 1] }
                : showAsWrong
                  ? { x: [0, -7, 7, -4, 4, 0] }
                  : { scale: 1 }
            }
            // Springs only accept two keyframes, so the pop and the shake need
            // a tween; the idle spring is what makes the grid feel springy.
            transition={
              showAsCorrect
                ? { duration: 0.45, ease: 'easeOut' }
                : showAsWrong
                  ? { duration: 0.4, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 420, damping: 16 }
            }
            aria-pressed={isSelected}
            className={[
              'relative flex select-none items-center justify-center gap-2 rounded-3xl border-2',
              'bg-gradient-to-b font-extrabold shadow-pop',
              'transition-colors duration-200',
              'disabled:pointer-events-none',
              layout === 'chips'
                ? 'min-h-20 px-3 py-3 text-2xl sm:text-3xl'
                : 'min-h-16 px-4 py-3 text-left text-base sm:text-lg',
              glyph ? 'text-4xl sm:text-5xl' : '',
              tone,
              showAsCorrect ? 'shadow-none' : '',
            ].join(' ')}
          >
            {layout === 'cards' ? (
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/70 text-sm"
                aria-hidden="true"
              >
                {letters[i]}
              </span>
            ) : null}
            <span className="truncate">{option}</span>

            {showAsCorrect ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white text-emerald-600 shadow-pop">
                <CheckIcon />
              </span>
            ) : null}
          </motion.button>
        )
      })}
    </div>
  )
}
