import { motion } from 'framer-motion'

/* ============================================================== logo ==== */

/**
 * The NumberQuest mark: a smiling number-nine with a sparkle. Pure CSS/SVG so it
 * scales crisply and adds no network request.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="NumberQuest"
    >
      <defs>
        <linearGradient id="nq-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B6BFF" />
          <stop offset="0.55" stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="nq-nine" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="1" stopColor="#FFB020" />
        </linearGradient>
      </defs>

      {/* Plate */}
      <rect x="4" y="4" width="112" height="112" rx="32" fill="url(#nq-plate)" />
      <rect
        x="4"
        y="4"
        width="112"
        height="112"
        rx="32"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.28"
        strokeWidth="3"
      />

      {/* Spark */}
      <path
        d="M30 34 l2.4 5 5 2.4 -5 2.4 -2.4 5 -2.4 -5 -5 -2.4 5 -2.4 Z"
        fill="#FFF1C2"
        opacity="0.95"
      />

      {/* 9 */}
      <text
        x="60"
        y="82"
        textAnchor="middle"
        fontFamily="Baloo 2, system-ui, sans-serif"
        fontWeight="800"
        fontSize="72"
        fill="url(#nq-nine)"
      >
        9
      </text>

      {/* Graduation cap over the 9 */}
      <path d="M60 34 L82 43.5 L60 53 L38 43.5 Z" fill="#fff" />
      <path
        d="M44 47 L60 55.5 L76 47 L76 53.5 L60 62 L44 53.5 Z"
        fill="#fff"
        opacity="0.9"
      />
      <path
        d="M80.5 44.5 L85 51 L84 58.5"
        stroke="#16C79A"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/* ====================================================== floating shapes ==== */

/** The little decorative bubbles that drift behind the home screen title. */
export function FloatingShapes() {
  const items = [
    { emoji: '➕', size: 'text-2xl', top: '12%', left: '7%', delay: 0, dur: 5.5 },
    { emoji: '🔢', size: 'text-3xl', top: '22%', left: '88%', delay: 0.7, dur: 6.2 },
    { emoji: '⭐', size: 'text-xl', top: '58%', left: '4%', delay: 1.3, dur: 4.8 },
    { emoji: '🎯', size: 'text-2xl', top: '72%', left: '92%', delay: 0.4, dur: 5.9 },
    { emoji: '🧩', size: 'text-xl', top: '40%', left: '16%', delay: 1.8, dur: 6.6 },
    { emoji: '💡', size: 'text-2xl', top: '8%', left: '62%', delay: 2.1, dur: 5.2 },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((item) => (
        <motion.span
          key={item.emoji + item.top}
          className={`absolute ${item.size} opacity-45 select-none`}
          style={{ top: item.top, left: item.left }}
          animate={{ y: [0, -16, 0], rotate: [-5, 5, -5] }}
          transition={{
            duration: item.dur,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {item.emoji}
        </motion.span>
      ))}
    </div>
  )
}

/* ============================================================ world art ==== */

/**
 * A little scene for each world, drawn with layered CSS gradients and emoji.
 * Cheap enough to render four of them at once on the map.
 */
export function WorldArt({
  worldId,
  className = '',
}: {
  worldId: string
  className?: string
}) {
  const scenes: Record<string, string> = {
    meadow: '🌻🌼🐝',
    lagoon: '🐠🐡🪸',
    ridge: '🏔️🧱⛰️',
    ruins: '🗿🔐📜',
  }

  return (
    <div
      className={`grid place-items-center rounded-3xl bg-white/35 text-4xl backdrop-blur-[2px] sm:text-5xl ${className}`}
      aria-hidden="true"
    >
      <span className="tracking-tight drop-shadow-sm">{scenes[worldId] ?? '✨'}</span>
    </div>
  )
}

/* ============================================================= mascot ==== */

/** The little guide who reacts to correct answers. */
export function Mascot({ mood = 'happy' }: { mood?: 'happy' | 'think' | 'cheer' }) {
  const face = { happy: '😊', think: '🤔', cheer: '🤩' }[mood]
  return (
    <motion.span
      className="inline-block text-4xl sm:text-5xl"
      animate={mood === 'cheer' ? { y: [0, -8, 0], rotate: [-6, 6, -6] } : { y: [0, -4, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      {face}
    </motion.span>
  )
}
