import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { BackIcon, SoundOffIcon, SoundOnIcon, StarIcon } from './Icons'

/* ============================================================== stars ==== */

/**
 * A row of three stars. Earned stars pop in and glow; unearned ones stay as
 * soft outlines so a locked rating still reads clearly.
 */
export function StarRow({
  value,
  size = 'md',
  animate = false,
  className = '',
}: {
  /** 0-3 */
  value: number
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}) {
  const px = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-11 w-11' }[size]

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`${value} out of 3 stars`}
    >
      {[0, 1, 2].map((i) => {
        const earned = i < value
        return (
          <motion.span
            key={i}
            initial={animate && earned ? { scale: 0.2, rotate: -30, opacity: 0 } : false}
            animate={animate && earned ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
            transition={{
              delay: animate ? 0.25 + i * 0.22 : 0,
              type: 'spring',
              stiffness: 380,
              damping: 14,
            }}
            className={[
              px,
              'block',
              earned
                ? 'text-sunny drop-shadow-[0_2px_6px_rgba(255,176,32,0.55)]'
                : 'text-brand-100',
            ].join(' ')}
          >
            <StarIcon />
          </motion.span>
        )
      })}
    </div>
  )
}

/* =========================================================== progress ==== */

export function ProgressBar({
  value,
  label,
  className = '',
  tone = 'brand',
}: {
  /** 0-100 */
  value: number
  label: string
  className?: string
  tone?: 'brand' | 'sunny' | 'mint'
}) {
  const pct = Math.max(0, Math.min(100, value))
  const fill = {
    brand: 'bg-gradient-to-r from-brand-400 to-brand-600',
    sunny: 'bg-gradient-to-r from-sunny to-coral',
    mint: 'bg-gradient-to-r from-mint to-sky',
  }[tone]

  return (
    <div
      className={`h-3.5 w-full overflow-hidden rounded-full bg-brand-100 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={`h-full rounded-full ${fill}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      />
    </div>
  )
}

/* ============================================================== card ==== */

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>
}

/* ============================================================= screen ==== */

/**
 * Page shell: a full-height column with safe-area padding, a sticky-feel
 * header slot, and a scrollable middle. Every route renders inside one.
 */
export function Screen({
  children,
  className = '',
  /** Gradient wash behind the content. */
  wash = false,
}: {
  children: ReactNode
  className?: string
  wash?: boolean
}) {
  return (
    <div
      className={[
        'relative flex min-h-dvh w-full flex-col overflow-x-hidden',
        wash ? 'sky-wash' : 'bg-paper',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

/* ============================================================ top bar ==== */

export function TopBar({
  onBack,
  title,
  subtitle,
  right,
}: {
  onBack?: () => void
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <header className="safe-t sticky top-0 z-30 bg-paper/85 backdrop-blur-md">
      <div className="safe-x flex items-center gap-3 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-line bg-white text-ink-soft shadow-pop transition active:translate-y-1 active:shadow-none"
          >
            <BackIcon />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold leading-tight text-ink sm:text-xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs font-semibold text-ink-faint sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  )
}

/* ============================================================= chip ==== */

/** A small pill used for counters, level numbers and tags. */
export function Chip({
  children,
  tone = 'brand',
  className = '',
}: {
  children: ReactNode
  tone?: 'brand' | 'sunny' | 'mint' | 'coral' | 'grape' | 'sky'
  className?: string
}) {
  const tones = {
    brand: 'bg-brand-100 text-brand-700',
    sunny: 'bg-sunny-soft text-amber-700',
    mint: 'bg-mint-soft text-emerald-700',
    coral: 'bg-coral-soft text-rose-600',
    grape: 'bg-grape-soft text-purple-700',
    sky: 'bg-sky-soft text-sky-700',
  }[tone]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tones} ${className}`}
    >
      {children}
    </span>
  )
}

/* ======================================================= sound toggle ==== */

/** The sound toggle used in every screen header. */
export function SoundButton({
  on,
  onToggle,
}: {
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? 'Mute sound effects' : 'Turn on sound effects'}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-line bg-white text-ink-soft shadow-pop transition active:translate-y-1 active:shadow-none"
    >
      {on ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  )
}
