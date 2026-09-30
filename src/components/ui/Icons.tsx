/* ============================================================= icons ==== */
/**
 * Every glyph in the game, in one place.
 *
 * All of them are `aria-hidden` (any meaning is carried by the label on the
 * control that wraps them) and inherit `currentColor`, so callers control size
 * and colour purely with CSS — e.g. `<StarIcon className="text-sunny" />`.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function PlayIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.72-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  )
}

export function BackIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      {...stroke}
      strokeWidth={2.6}
      aria-hidden="true"
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  )
}

export function HomeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.4} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

export function MapIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
      <path d="M9 4v13M15 7v13" />
    </svg>
  )
}

export function BulbIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.1} aria-hidden="true">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.1 1 1.7h5.2c.1-.6.4-1.2 1-1.7A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

export function SoundOnIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.1} aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  )
}

export function SoundOffIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.1} aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
      <path d="m16.5 9.5 5 5m0-5-5 5" />
    </svg>
  )
}

export function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.2} aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={3} aria-hidden="true">
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  )
}

export function RefreshIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.3} aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </svg>
  )
}

export function CloseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.6} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function NextIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function StarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9 2.9-6Z" />
    </svg>
  )
}

export function StarsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} strokeWidth={2.1} aria-hidden="true">
      <path d="m12 3 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 13.8 7.8 16l.8-4.7L5.2 8l4.7-.7L12 3Z" />
      <path d="M18.5 15.5 19.4 18l2.6.4-1.9 1.8.5 2.5-2.1-1.2-2.1 1.2.5-2.5-1.9-1.8 2.6-.4.9-2.5Z" />
    </svg>
  )
}
