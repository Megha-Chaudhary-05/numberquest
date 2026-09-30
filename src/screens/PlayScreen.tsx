import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mascot } from '../components/art'
import { renderPuzzleView } from '../components/puzzle'
import { Button } from '../components/ui/Button'
import { MapIcon } from '../components/ui/Icons'
import { Card, Chip, Screen, SoundButton, TopBar } from '../components/ui'
import { Confetti, SuccessPulse } from '../components/ui/Confetti'
import { FeedbackPanel, HintPanel } from '../components/ui/FeedbackPanel'
import {
  getPuzzle,
  LEVEL_ORDER,
  LEVELS_PER_GROUP,
  nextPuzzle,
  puzzlesInGroup,
} from '../data/puzzles'
import { getWorld } from '../data/worlds'
import { DIFFICULTY_META, type Puzzle } from '../data/types'
import { correctOptionIndex, hasAnswer, isCorrect, needsSubmit, optionList } from '../game/grading'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

type Phase = 'idle' | 'graded'

/* =============================================================== play ==== */

export function PlayScreen() {
  const navigate = useNavigate()
  const { puzzleId } = useParams<{ puzzleId: string }>()
  const { setLastLevel } = useProgress()
  const puzzle = getPuzzle(puzzleId)

  // Remember where the player is, so Home can offer "Continue".
  useEffect(() => {
    if (puzzleId) setLastLevel(puzzleId)
  }, [puzzleId, setLastLevel])

  if (!puzzle) {
    return (
      <Screen>
        <TopBar onBack={() => navigate('/map')} title="Level not found" />
        <main className="safe-x flex flex-1 flex-col items-center justify-center gap-4 pb-16 text-center">
          <p className="text-5xl" aria-hidden="true">
            🧭
          </p>
          <p className="text-lg font-extrabold text-ink">We could not find that puzzle.</p>
          <Button icon={<MapIcon />} onClick={() => navigate('/map')}>
            Back to the world map
          </Button>
        </main>
      </Screen>
    )
  }

  // `key` remounts the round whenever the level changes, which resets all the
  // per-attempt state without a reset-on-prop-change effect.
  return <PlayRound key={puzzle.id} puzzle={puzzle} />
}

/* =============================================================== round ==== */

/** One attempt at one puzzle. Owns every piece of round state. */
function PlayRound({ puzzle }: { puzzle: Puzzle }) {
  const navigate = useNavigate()
  const { completeLevel, soundOn, toggleSound } = useProgress()

  const [value, setValue] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintShown, setHintShown] = useState(false)
  const [solved, setSolved] = useState(false)
  const [wasCorrect, setWasCorrect] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const feedbackRef = useRef<HTMLDivElement>(null)

  const world = getWorld(puzzle.worldId)
  const correctIndex = correctOptionIndex(puzzle)
  const submitStyle = needsSubmit(puzzle)
  // Global play order, used for the "Puzzle N of 600" readout.
  const levelNumber = LEVEL_ORDER.findIndex((p) => p.id === puzzle.id) + 1

  // Skipping stays inside the tier being played, so a child working through hard
  // levels is never dropped into easy. At the end of a tier it falls back to the
  // next level in the global order, so the button never dead-ends.
  const next = useMemo(() => {
    const sameTier = puzzlesInGroup(puzzle.worldId, puzzle.difficulty)
    const i = sameTier.findIndex((p) => p.id === puzzle.id)
    if (i >= 0 && i < sameTier.length - 1) return sameTier[i + 1]
    return nextPuzzle(puzzle.id)
  }, [puzzle.id, puzzle.worldId, puzzle.difficulty])

  /* ------------------------------------------------------------- grade --- */

  /**
   * `override` lets a tap-on-option grade the option that was just chosen.
   * Without it the timer would run a closure from before `onChange` landed and
   * grade the *previous* value — so the first tap on a choice would do nothing.
   */
  const grade = useCallback(
    (override?: string) => {
      // Guard against a click event arriving here as `override`: a Button that
      // forwards onClick hands us its MouseEvent, which is not an answer.
      const answer = typeof override === 'string' ? override : value
      if (solved || !hasAnswer(puzzle, answer)) return
      const correct = isCorrect(puzzle, answer)

      setPhase('graded')
      setWasCorrect(correct)
      setAttempts((n) => n + 1)

      if (correct) {
        setSolved(true)
        setCelebrate(true)
        play('correct')
        // Give the celebration a beat to land, then hand off to the results.
        window.setTimeout(() => {
          completeLevel(puzzle.id, attempts + 1, hintsUsed)
          navigate(`/result/${puzzle.id}`, { replace: true })
        }, 1600)
      } else {
        play('wrong')
      }
    },
    [attempts, completeLevel, hintsUsed, navigate, puzzle, solved, value],
  )

  /** Choice-style kinds commit the moment an option is tapped. */
  const choose = useCallback(
    (index: number) => {
      if (solved || phase === 'graded') return
      const option = optionList(puzzle)?.[index]
      setSelected(index)
      // Brief pause so the pressed state paints before the reveal.
      window.setTimeout(() => grade(option), 240)
    },
    [grade, phase, puzzle, solved],
  )

  const onChange = useCallback(
    (nextValue: string) => {
      setValue(nextValue)
      // Editing the answer starts a fresh attempt immediately.
      if (phase === 'graded' && !solved) {
        setPhase('idle')
        setSelected(null)
        setWasCorrect(false)
      }
    },
    [phase, solved],
  )

  const retry = useCallback(() => {
    setValue('')
    setSelected(null)
    setPhase('idle')
    setWasCorrect(false)
  }, [])

  const revealHint = useCallback(() => {
    if (hintShown) return
    setHintShown(true)
    setHintsUsed((n) => n + 1)
    play('select')
  }, [hintShown])

  // Bring the feedback panel into view once it appears.
  useEffect(() => {
    if (phase !== 'graded') return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [phase])

  /* ------------------------------------------------------------- render --- */

  return (
    <Screen wash>
      <Confetti active={celebrate} />

      <TopBar
        onBack={() => navigate(`/world/${puzzle.worldId}`)}
        title={puzzle.title}
        subtitle={
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">{world?.emoji}</span>
            {world?.name}
          </span>
        }
        right={<SoundButton on={soundOn} onToggle={toggleSound} />}
      />

      <main className="safe-x safe-b mx-auto w-full max-w-2xl flex-1 space-y-4 pb-6 sm:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="grape">
              <span className="text-lg" aria-hidden="true">
                {puzzle.badge}
              </span>
              Level {puzzle.levelNumber} of {LEVELS_PER_GROUP}
            </Chip>
            {/* With 600 levels, the tier badge is what keeps a level identifiable. */}
            <Chip tone={DIFFICULTY_META[puzzle.difficulty].tone === 'coral' ? 'coral' : 'mint'}>
              <span aria-hidden="true">{DIFFICULTY_META[puzzle.difficulty].emoji}</span>
              {DIFFICULTY_META[puzzle.difficulty].label}
            </Chip>
          </div>
          {attempts > 0 && !solved ? <Chip tone="sky">Attempt {attempts + 1}</Chip> : null}
        </div>
        <p className="sr-only">
          Puzzle {levelNumber} of {LEVEL_ORDER.length} in the whole game.
        </p>

        {/* Prompt */}
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <SuccessPulse active={phase === 'graded' && wasCorrect} />
          <p className="text-lg leading-snug font-extrabold text-ink sm:text-2xl">
            {puzzle.prompt}
          </p>
          {'example' in puzzle ? (
            <p className="mt-2 text-sm font-bold text-brand-500">{puzzle.example}</p>
          ) : null}
        </Card>

        {/* Answer surface */}
        <Card className="p-4 sm:p-5">
          {renderPuzzleView(puzzle.kind, {
            puzzle,
            value,
            onChange,
            onSubmit: grade,
            selected,
            onSelect: choose,
            phase,
            correctIndex,
            disabled: solved,
          })}

          {submitStyle ? (
            <Button
              className="mt-5"
              size="lg"
              fullWidth
              disabled={solved || !hasAnswer(puzzle, value)}
              onClick={() => grade()}
            >
              Check my answer
            </Button>
          ) : null}
        </Card>

        {/* Hint */}
        {!solved ? (
          <div className="text-center">
            <HintPanel hint={puzzle.hint} revealed={hintShown} onReveal={revealHint} />
          </div>
        ) : null}

        {/* Feedback */}
        <div ref={feedbackRef}>
          <AnimatePresence mode="wait">
            {solved ? (
              <motion.div
                key="solved"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-4xl border-2 border-mint/45 bg-mint-soft p-5"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <Mascot mood="cheer" />
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">{puzzle.cheer}</h2>
                    <p className="text-sm font-semibold text-ink-soft">
                      Taking you to your results…
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : phase === 'graded' ? (
              <FeedbackPanel
                key="nudge"
                open
                tone="wrong"
                headline={puzzle.nudge}
                body={
                  attempts >= 2
                    ? 'Take a breath and try a different way of thinking about it.'
                    : 'Have another go — a wrong answer only costs a few points.'
                }
                onRetry={retry}
              />
            ) : null}
          </AnimatePresence>
        </div>

        {/* Never trap a player on one level. */}
        {!solved ? (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/world/${puzzle.worldId}`)}
            >
              Leave level
            </Button>
            {next ? (
              <Button size="sm" variant="ghost" onClick={() => navigate(`/play/${next.id}`)}>
                Skip to “{next.title}”
              </Button>
            ) : null}
          </div>
        ) : null}
      </main>
    </Screen>
  )
}
