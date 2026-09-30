import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Mascot, WorldArt } from '../components/art'
import { Button } from '../components/ui/Button'
import { HomeIcon, MapIcon, NextIcon, RefreshIcon } from '../components/ui/Icons'
import { Card, Chip, ProgressBar, Screen, StarRow, TopBar } from '../components/ui'
import { Confetti } from '../components/ui/Confetti'
import { getPuzzle, nextPuzzle, puzzlesInGroup } from '../data/puzzles'
import { getWorld } from '../data/worlds'
import { answerLabel } from '../game/grading'
import { starsFor } from '../game/scoring'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

/* ============================================================ results ==== */

export function ResultScreen() {
  const navigate = useNavigate()
  const { puzzleId } = useParams<{ puzzleId: string }>()
  const { session, levelRecord, worldProgress, totalStars, totalPoints, solvedCount, levelCount } =
    useProgress()

  const puzzle = getPuzzle(puzzleId)
  const world = getWorld(puzzle?.worldId)
  /** Only trust the in-memory session if it belongs to *this* level. */
  const run = session && session.puzzleId === puzzleId ? session : null

  /**
   * A page refresh on /result/:id has no in-memory session, so fall back to
   * the level's stored best run. The screen then still tells the truth.
   */
  const summary = useMemo(() => {
    if (run) return run.summary
    if (!puzzle) return null
    const record = levelRecord(puzzle.id)
    return {
      attempts: 1,
      hintsUsed: 0,
      stars: record.stars || starsFor(1, 0),
      points: record.bestPoints || puzzle.basePoints,
    }
  }, [levelRecord, puzzle, run])

  if (!puzzle || !summary) {
    return (
      <Screen wash>
        <TopBar onBack={() => navigate('/')} title="Results" />
        <main className="safe-x flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-5xl" aria-hidden="true">
            🧭
          </p>
          <p className="text-lg font-extrabold text-ink">That result is not available.</p>
          <Button onClick={() => navigate('/map')} icon={<MapIcon />}>
            Back to the world map
          </Button>
        </main>
      </Screen>
    )
  }

  // Next level in the *same tier* when one exists, so finishing "Easy 3" leads
  // to "Easy 4" rather than jumping to Medium 1. At the end of a tier it falls
  // back to the global order, so the last level of a tier still has somewhere
  // to go.
  const sameTier = puzzlesInGroup(puzzle.worldId, puzzle.difficulty)
  const tierIndex = sameTier.findIndex((p) => p.id === puzzle.id)
  const next =
    tierIndex >= 0 && tierIndex < sameTier.length - 1
      ? sameTier[tierIndex + 1]
      : nextPuzzle(puzzle.id)
  const progress = worldProgress(puzzle.worldId)
  const worldJustCleared = progress.solved === progress.total
  const overallPercent = (solvedCount / levelCount) * 100
  const firstClear = run?.firstClear ?? false
  const newBest = run?.newBest ?? false

  return (
    <Screen wash>
      <Confetti active />

      <TopBar
        onBack={() => navigate('/map')}
        title="Level complete"
        subtitle={puzzle.title}
        right={
          <span className="text-3xl" aria-hidden="true">
            {puzzle.badge}
          </span>
        }
      />

      <main className="safe-x safe-b mx-auto w-full max-w-2xl flex-1 space-y-4 pb-6 sm:space-y-5">
        {/* Star headline */}
        <Card className="relative overflow-hidden p-6 text-center sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(120% 70% at 50% 0%, #FFF1C2 0%, transparent 60%)',
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="flex justify-center"
            >
              <Mascot mood={summary.stars === 3 ? 'cheer' : 'happy'} />
            </motion.div>

            <h1 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
              {summary.stars === 3
                ? 'Flawless run!'
                : summary.stars === 2
                  ? 'Nicely done!'
                  : 'Puzzle cleared!'}
            </h1>

            <div className="mt-4 flex justify-center">
              <StarRow value={summary.stars} size="lg" animate />
            </div>

            <p className="mt-4 text-3xl font-extrabold text-brand-600 tabular-nums sm:text-4xl">
              +{summary.points}
              <span className="ml-1.5 text-sm font-bold text-ink-faint">points</span>
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {firstClear ? <Chip tone="mint">First clear!</Chip> : null}
              {newBest ? <Chip tone="sunny">New personal best</Chip> : null}
              <Chip tone="sky">
                {summary.attempts === 1 ? 'Solved first try' : `${summary.attempts} attempts`}
              </Chip>
              {summary.hintsUsed > 0 ? (
                <Chip tone="grape">
                  {summary.hintsUsed} hint{summary.hintsUsed > 1 ? 's' : ''} used
                </Chip>
              ) : (
                <Chip tone="grape">No hints needed</Chip>
              )}
            </div>
          </div>
        </Card>

        {/*
         * Actions sit directly under the stars, above the explanation, so a
         * player who just cleared a level can move on without scrolling past
         * the write-up first.
         */}
        <div className="space-y-2.5">
          {next ? (
            <Button
              size="lg"
              fullWidth
              iconRight={<NextIcon />}
              onClick={() => {
                play('select')
                navigate(`/play/${next.id}`)
              }}
            >
              Next · {next.title}
            </Button>
          ) : (
            <div className="card p-5 text-center">
              <p className="text-4xl" aria-hidden="true">
                🏆
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">Every puzzle cleared!</h2>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                You finished all {levelCount} puzzles. Go back and beat your star records.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              icon={<RefreshIcon />}
              onClick={() => {
                play('select')
                navigate(`/play/${puzzle.id}`)
              }}
            >
              Replay
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<MapIcon />}
              onClick={() => {
                play('select')
                navigate('/map')
              }}
            >
              World map
            </Button>
          </div>

          <Button
            variant="ghost"
            fullWidth
            icon={<HomeIcon />}
            onClick={() => {
              play('back')
              navigate('/')
            }}
          >
            Back home
          </Button>
        </div>

        {/* The answer + why */}
        <Card className="p-5">
          <p className="text-xs font-extrabold tracking-wide text-brand-500 uppercase">
            The answer
          </p>
          <p className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            {answerLabel(puzzle)}
          </p>
          <div className="mt-4 rounded-3xl border-2 border-line bg-brand-50/60 p-4">
            <p className="text-xs font-extrabold tracking-wide text-brand-500 uppercase">
              Why it works
            </p>
            <p className="mt-1.5 text-sm leading-relaxed font-semibold text-ink-soft sm:text-base">
              {puzzle.explanation}
            </p>
          </div>
        </Card>

        {/* World progress */}
        {world ? (
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <WorldArt worldId={world.id} className="h-14 w-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-extrabold text-ink">{world.name}</p>
                <p className="text-xs font-bold text-ink-faint">
                  {progress.solved}/{progress.total} solved · {progress.totalStars}/
                  {progress.maxStars} stars
                </p>
              </div>
              {worldJustCleared ? <Chip tone="mint">World clear!</Chip> : null}
            </div>
            <ProgressBar
              value={progress.percent}
              label={`${world.name}: ${Math.round(progress.percent)} percent complete`}
              className="mt-3"
              tone={worldJustCleared ? 'mint' : 'brand'}
            />
          </Card>
        ) : null}

        {/* Career totals */}
        <Card className="flex items-center justify-around gap-2 p-4">
          <Stat label="Total stars" value={`${totalStars}`} />
          <span className="h-10 w-px bg-line" aria-hidden="true" />
          <Stat label="Total points" value={`${totalPoints}`} />
          <span className="h-10 w-px bg-line" aria-hidden="true" />
          <Stat label="Puzzles" value={`${solvedCount}/${levelCount}`} />
        </Card>

        <ProgressBar
          value={overallPercent}
          label={`Overall progress: ${Math.round(overallPercent)} percent`}
          tone="sunny"
        />
      </main>
    </Screen>
  )
}

/* ============================================================== stat ==== */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-extrabold text-ink tabular-nums sm:text-2xl">{value}</p>
      <p className="text-[11px] font-bold text-ink-faint">{label}</p>
    </div>
  )
}
