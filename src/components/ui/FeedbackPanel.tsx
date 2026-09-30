import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { BulbIcon, NextIcon, RefreshIcon } from './Icons'

/* ============================================================== panel ==== */

type Tone = 'correct' | 'wrong' | 'partial'

const TONES: Record<Tone, { box: string; chip: string; icon: string; label: string }> = {
  correct: {
    box: 'border-mint/45 bg-mint-soft',
    chip: 'bg-mint text-white',
    icon: 'text-emerald-600',
    label: 'bg-mint text-white',
  },
  partial: {
    box: 'border-sunny/50 bg-sunny-soft',
    chip: 'bg-sunny text-amber-950',
    icon: 'text-amber-600',
    label: 'bg-sunny text-amber-950',
  },
  wrong: {
    box: 'border-coral/40 bg-coral-soft',
    chip: 'bg-coral text-white',
    icon: 'text-rose-600',
    label: 'bg-coral text-white',
  },
}

/**
 * The panel that slides up after each attempt. On a wrong answer it shows the
 * gentle nudge and a "Try again" action; on a correct one it reveals the full
 * explanation plus the Next button.
 */
export function FeedbackPanel({
  open,
  tone,
  headline,
  body,
  /** The "why" — only shown once the level is cleared. */
  explanation,
  onRetry,
  onNext,
  nextLabel = 'Next puzzle',
  children,
}: {
  open: boolean
  tone: Tone
  headline: string
  body?: string
  explanation?: string
  onRetry?: () => void
  onNext?: () => void
  nextLabel?: string
  children?: ReactNode
}) {
  const t = TONES[tone]

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.section
          key="feedback"
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className={`rounded-4xl border-2 p-4 sm:p-5 ${t.box}`}
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${t.chip}`}
              aria-hidden="true"
            >
              {tone === 'correct' ? '🎉' : tone === 'partial' ? '💡' : '🤔'}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold leading-snug text-ink">{headline}</h2>
              {body ? (
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-soft">
                  {body}
                </p>
              ) : null}
            </div>
          </div>

          {explanation ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.3 }}
              className="mt-4 rounded-3xl border-2 border-white/70 bg-white/80 p-4"
            >
              <p className="mb-1.5 text-xs font-extrabold tracking-wide text-brand-500 uppercase">
                Why?
              </p>
              <p className="text-sm leading-relaxed font-medium text-ink-soft sm:text-base">
                {explanation}
              </p>
            </motion.div>
          ) : null}

          {children}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-700 bg-mint px-6 text-lg font-extrabold text-white shadow-pop transition active:translate-y-1 active:shadow-none"
              >
                {nextLabel}
                <NextIcon />
              </button>
            ) : null}
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-6 text-lg font-extrabold shadow-pop transition active:translate-y-1 active:shadow-none ${
                  tone === 'wrong'
                    ? 'border-brand-500 bg-white text-brand-600'
                    : t.label
                }`}
              >
                <RefreshIcon />
                Try again
              </button>
            ) : null}
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}

/* =============================================================== hint ==== */

/** The collapsible hint box on the play screen. */
export function HintPanel({
  hint,
  revealed,
  onReveal,
}: {
  hint: string
  revealed: boolean
  onReveal: () => void
}) {
  return (
    <AnimatePresence initial={false}>
      {revealed ? (
        <motion.div
          key="hint"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <p className="mt-3 rounded-2xl border-2 border-sunny/50 bg-sunny-soft px-4 py-3 text-sm leading-relaxed font-semibold text-amber-900">
            <span className="mr-1.5" aria-hidden="true">
              💡
            </span>
            {hint}
          </p>
        </motion.div>
      ) : (
        <motion.button
          key="hint-button"
          type="button"
          onClick={onReveal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-brand-200 bg-white px-4 text-sm font-bold text-brand-600 shadow-pop transition active:translate-y-1 active:shadow-none"
        >
          <BulbIcon />
          Show me a hint
        </motion.button>
      )}
    </AnimatePresence>
  )
}
