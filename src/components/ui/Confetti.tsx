import { AnimatePresence, motion } from 'framer-motion'

/* ============================================================ confetti ==== */

const COLORS = ['#7C5CFF', '#FFB020', '#16C79A', '#FF5D73', '#2FB0F5', '#A855F7']

interface Piece {
  id: number
  x: number
  delay: number
  duration: number
  rotation: number
  color: string
  /** Disc, square, or triangle (clipped). */
  shape: 0 | 1 | 2
  size: number
  drift: number
}

/**
 * Pieces are generated once at module load with a small deterministic PRNG.
 * Randomising per render would reshuffle the burst on every re-render, and
 * `Math.random` in render is impure — this keeps the burst stable and pure.
 */
const PIECES: Piece[] = (() => {
  let seed = 0x2f6e2b1
  const rand = () => {
    // mulberry32 — small, fast, good enough for decoration
    seed = (seed + 0x6d2b79f5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return Array.from({ length: 30 }, (_, id) => ({
    id,
    x: 6 + rand() * 88,
    delay: rand() * 0.3,
    duration: 1.5 + rand() * 1.1,
    rotation: 360 + rand() * 720,
    color: COLORS[Math.floor(rand() * COLORS.length)],
    shape: Math.floor(rand() * 3) as 0 | 1 | 2,
    size: 7 + rand() * 8,
    drift: -55 + rand() * 110,
  }))
})()

/**
 * A one-shot confetti burst built from CSS transforms only, so it costs almost
 * nothing on a low-end phone. `MotionConfig reducedMotion` in App removes the
 * animation entirely for players who ask for less motion.
 */
export function Confetti({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="confetti"
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 1.8 }}
          aria-hidden="true"
        >
          {PIECES.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-0 block"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.shape === 2 ? 0 : p.size,
                paddingBottom: p.shape === 2 ? p.size : undefined,
                background: p.color,
                borderRadius: p.shape === 0 ? '9999px' : p.shape === 1 ? '2px' : undefined,
                clipPath: p.shape === 2 ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
              }}
              initial={{ y: -40, opacity: 0, rotate: 0, x: 0 }}
              animate={{ y: '105vh', opacity: [0, 1, 1, 0], rotate: p.rotation, x: p.drift }}
              transition={{ duration: p.duration, delay: p.delay, ease: [0.25, 0.6, 0.5, 1] }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/* ============================================================= sparks ==== */

/** A quick expanding ring behind a card when an answer lands. */
export function SuccessPulse({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="pulse"
          className="pointer-events-none absolute inset-0 z-10"
          initial={{ opacity: 0.9, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          aria-hidden="true"
        >
          <div className="h-full w-full rounded-[inherit] ring-8 ring-mint/60" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
