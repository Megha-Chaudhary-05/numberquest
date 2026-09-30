import { motion } from 'framer-motion'
import type { SequencePuzzle } from '../../data/types'
import { OptionGrid } from '../ui/OptionGrid'
import type { PuzzleViewProps } from './types'

/**
 * A run of terms with a "?" at the end, then the player's choice below.
 * Used for both numeric and emoji ("glyphs") sequences.
 */
export function SequenceView({ puzzle, ...rest }: PuzzleViewProps) {
  const { value, onChange, selected, onSelect, phase, correctIndex, disabled } = rest
  const p = puzzle as SequencePuzzle
  const chosenIndex = p.options.indexOf(value)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <AnimateItem delay={0} glyph={p.glyphs}>
          {p.items.map((item, i) => (
            <Term key={`${item}-${i}`} glyph={p.glyphs}>
              {item}
            </Term>
          ))}
        </AnimateItem>

        <AnimateItem delay={0.1} glyph={p.glyphs}>
          <Term glyph={p.glyphs} question>
            ?
          </Term>
        </AnimateItem>
      </div>

      <OptionGrid
        options={p.options}
        selected={selected ?? (chosenIndex >= 0 ? chosenIndex : null)}
        state={phase}
        correctIndex={correctIndex}
        onSelect={(i) => {
          onChange(p.options[i])
          onSelect?.(i)
        }}
        disabled={disabled}
        ariaLabel="Which term comes next?"
      />
    </div>
  )
}

function AnimateItem({
  children,
  delay,
  glyph,
}: {
  children: React.ReactNode
  delay: number
  glyph?: boolean
}) {
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 320, damping: 24 }}
    >
      {children}
      {glyph ? <span className="sr-only">then</span> : null}
    </motion.div>
  )
}

function Term({
  children,
  glyph,
  question = false,
}: {
  children: React.ReactNode
  glyph?: boolean
  question?: boolean
}) {
  return (
    <span
      className={[
        'grid aspect-square min-w-14 place-items-center rounded-2xl border-2 px-2 font-extrabold tabular-nums sm:min-w-16',
        glyph ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl',
        question
          ? 'border-dashed border-brand-400 bg-brand-50 text-brand-400'
          : 'border-line bg-white text-ink shadow-pop',
      ].join(' ')}
      aria-label={question ? 'missing term' : undefined}
    >
      {children}
    </span>
  )
}
