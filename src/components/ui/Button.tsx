import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { play } from '../../game/sound'

/* ============================================================== types ==== */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  /** Skip the click sound (used for rapid-fire keypad taps if needed). */
  silent?: boolean
  children?: ReactNode
}

/* ============================================================ styling ==== */

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white border-brand-700 shadow-pop hover:bg-brand-400 active:shadow-none',
  success:
    'bg-mint text-white border-mint/70 shadow-pop hover:brightness-105 active:shadow-none',
  secondary:
    'bg-white text-brand-700 border-brand-200 shadow-pop hover:bg-brand-50 active:shadow-none',
  ghost:
    'bg-transparent text-ink-soft border-transparent hover:bg-white/70 active:shadow-none',
  danger: 'bg-coral-soft text-coral border-coral/40 hover:bg-coral/15 active:shadow-none',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-11 px-4 text-sm gap-1.5',
  md: 'min-h-12 px-5 text-base gap-2',
  lg: 'min-h-14 px-7 text-lg gap-2.5 sm:min-h-16 sm:text-xl',
}

/**
 * The one button in the app. Chunky, rounded, and big enough to hit reliably
 * with a thumb; `active:shadow-none` + translate gives the tactile "sink".
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  silent = false,
  className = '',
  children,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      onClick={(event) => {
        if (!silent) play('tap')
        onClick?.(event)
      }}
      className={[
        'inline-flex items-center justify-center rounded-2xl border-2 font-bold',
        'transition-colors duration-150 select-none',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </motion.button>
  )
}
