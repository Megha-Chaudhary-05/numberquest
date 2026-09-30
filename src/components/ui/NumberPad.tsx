import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { play } from '../../game/sound'

/* ========================================================== number pad ==== */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const

interface NumberPadProps {
  value: string
  onChange: (value: string) => void
  /** Fired by the "ok" key, the Enter key, or the Check button. */
  onSubmit: () => void
  disabled?: boolean
  checkLabel?: string
  maxLength?: number
  /** Announced to screen readers as the keypad's purpose. */
  ariaLabel?: string
}

/**
 * A chunky 3x4 keypad. It is the primary input on a phone, so every key is at
 * least 56px tall, has `type="button"` (no keyboard pop-up), and is mirrored by
 * the physical number keys for desktop and Bluetooth keyboards.
 */
export function NumberPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  checkLabel = 'Check',
  maxLength = 4,
  ariaLabel = 'Number keypad',
}: NumberPadProps) {
  // Physical keyboard support: digits, Backspace, Enter.
  useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        if (value.length < maxLength) {
          play('tap')
          onChange(value === '0' ? e.key : value + e.key)
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        if (value) {
          play('tap')
          onChange(value.slice(0, -1))
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (value) onSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disabled, maxLength, onChange, onSubmit, value])

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return
    play('tap')
    if (key === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === 'ok') {
      if (value) onSubmit()
      return
    }
    if (value.length >= maxLength) return
    onChange(value === '0' && key !== '0' ? key : value + key)
  }

  return (
    <div
      className="grid grid-cols-3 gap-2.5 sm:gap-3"
      role="group"
      aria-label={ariaLabel}
    >
      {KEYS.map((key) => {
        const isOk = key === 'ok'
        const isDel = key === 'del'
        const inactive = isOk && value.length === 0

        return (
          <motion.button
            key={key}
            type="button"
            disabled={disabled || inactive}
            onClick={() => press(key)}
            whileTap={disabled || inactive ? undefined : { scale: 0.9, y: 2 }}
            transition={{ type: 'spring', stiffness: 600, damping: 26 }}
            aria-label={isOk ? checkLabel : isDel ? 'Delete last digit' : key}
            className={[
              'grid h-14 select-none place-items-center rounded-2xl border-2 text-2xl font-extrabold',
              'transition-colors duration-100 sm:h-16 sm:text-3xl',
              'disabled:pointer-events-none disabled:opacity-40',
              isOk
                ? 'border-mint/60 bg-mint text-white shadow-pop'
                : isDel
                  ? 'border-coral/30 bg-coral-soft text-coral'
                  : 'border-line bg-white text-ink shadow-pop active:bg-brand-50',
            ].join(' ')}
          >
            {isOk ? (
              <span className="text-base font-extrabold sm:text-lg">{checkLabel}</span>
            ) : isDel ? (
              <span className="text-base font-extrabold sm:text-lg">⌫</span>
            ) : (
              key
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ========================================================= answer slot ==== */

/** Shows the current numeric entry, or a blinking placeholder when empty. */
export function AnswerSlot({
  value,
  unit,
  state = 'idle',
  label = 'Your answer',
  wide = false,
}: {
  value: string
  unit?: string
  state?: 'idle' | 'correct' | 'wrong'
  label?: string
  wide?: boolean
}) {
  const tone = {
    idle: 'border-brand-200 bg-brand-50 text-brand-700',
    correct: 'border-mint bg-mint-soft text-emerald-700',
    wrong: 'border-coral bg-coral-soft text-rose-600',
  }[state]

  return (
    <div
      className={[
        'flex items-baseline justify-center gap-2 rounded-3xl border-2 px-5 py-3',
        'font-extrabold tabular-nums transition-colors duration-200',
        wide ? 'min-w-40 text-5xl sm:text-6xl' : 'min-w-28 text-4xl sm:text-5xl',
        tone,
      ].join(' ')}
      aria-label={label}
      aria-live="polite"
    >
      {value ? (
        <>
          <span>{value}</span>
          {unit ? <span className="text-base font-bold sm:text-xl">{unit}</span> : null}
        </>
      ) : (
        <span className="text-brand-300">?</span>
      )}
    </div>
  )
}
