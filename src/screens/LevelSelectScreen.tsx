import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { MapIcon, NextIcon, StarIcon } from '../components/ui/Icons'
import { Card, ProgressBar, Screen, SoundButton, StarRow, TopBar } from '../components/ui'
import { LEVEL_ORDER, puzzlesInWorld } from '../data/puzzles'
import { getWorld, WORLDS } from '../data/worlds'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

/* ======================================================= level select ==== */

export function LevelSelectScreen() {
  const navigate = useNavigate()
  const params = useParams<{ worldId?: string }>()
  const { worldProgress, levelRecord, totalStars, soundOn, toggleSound } = useProgress()

  const world = getWorld(params.worldId)

  /* No world in the URL: show every level, grouped, with a world filter. */
  if (!world) {
    return (
      <Screen wash>
        <TopBar
          onBack={() => navigate('/')}
          title="All levels"
          subtitle={`${totalStars} stars collected`}
          right={<SoundButton on={soundOn} onToggle={toggleSound} />}
        />
        <main className="safe-x safe-b mx-auto w-full max-w-2xl flex-1 space-y-6 py-4">
          {WORLDS.map((w) => {
            const progress = worldProgress(w.id)
            return (              <section key={w.id} aria-labelledby={`h-${w.id}`}>
                <h2
                  id={`h-${w.id}`}
                  className="mb-2 flex items-center gap-2 text-base font-extrabold text-ink"
                >
                  <span aria-hidden="true">{progress.unlocked ? w.emoji : '🔒'}</span>
                  {w.name}
                  <span className="ml-auto text-xs font-bold text-ink-faint">
                    {progress.totalStars}/{progress.maxStars} ★
                  </span>
                </h2>
                <LevelList
                  worldId={w.id}
                  locked={!progress.unlocked}
                  lockedMessage={`Collect ${w.starsToUnlock} stars to open this world`}
                  onOpen={(id) => navigate(`/play/${id}`)}
                  recordOf={levelRecord}
                />
              </section>
            )
          })}
        </main>
      </Screen>
    )
  }

  /* A specific world. */
  const progress = worldProgress(world.id)

  return (
    <Screen wash>
      <TopBar
        onBack={() => navigate('/map')}
        title={world.name}
        subtitle={world.tagline}
        right={<SoundButton on={soundOn} onToggle={toggleSound} />}
      />

      <main className="safe-x safe-b mx-auto w-full max-w-2xl flex-1 py-4 sm:py-6">
        {/* World banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mb-5 overflow-hidden rounded-4xl border-2 border-white/60 bg-gradient-to-br p-5 shadow-card ${world.gradient}`}
        >
          <div className="flex items-center gap-4">
            <span className="text-5xl drop-shadow" aria-hidden="true">
              {world.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white/90">
                {progress.solved} of {progress.total} puzzles solved
              </p>
              <p className="text-2xl font-extrabold text-white drop-shadow-sm">
                <span className="text-sunny">
                  <StarIcon />
                </span>{' '}
                {progress.totalStars} / {progress.maxStars}
              </p>
            </div>
          </div>
          <ProgressBar
            value={progress.percent}
            label={`${world.name} progress: ${Math.round(progress.percent)} percent`}
            className="mt-3 bg-white/55"
            tone={progress.percent === 100 ? 'mint' : 'brand'}
          />
        </motion.div>

        {progress.unlocked ? (
          <LevelList
            worldId={world.id}
            onOpen={(id) => navigate(`/play/${id}`)}
            recordOf={levelRecord}
          />
        ) : (
          <Card className="p-6 text-center">
            <p className="text-5xl" aria-hidden="true">
              🔒
            </p>
            <h2 className="mt-3 text-xl font-extrabold text-ink">{world.name} is locked</h2>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Collect {world.starsToUnlock} stars in total to open it. You have {totalStars}.
            </p>
            <ProgressBar
              value={(totalStars / world.starsToUnlock) * 100}
              label="Progress toward unlocking"
              className="mt-4"
              tone="sunny"
            />
            <Button
              className="mt-5"
              fullWidth
              icon={<MapIcon />}
              onClick={() => navigate('/map')}
            >
              Back to the map
            </Button>
          </Card>
        )}
      </main>
    </Screen>
  )
}

/* ============================================================== list ==== */

function LevelList({
  worldId,
  locked = false,
  lockedMessage = '',
  onOpen,
  recordOf,
}: {
  worldId: string
  locked?: boolean
  lockedMessage?: string
  onOpen: (puzzleId: string) => void
  recordOf: (id: string) => { stars: number; solved: boolean; bestPoints: number }
}) {
  const levels = puzzlesInWorld(worldId as never)

  if (locked) {
    return (
      <div className="rounded-4xl border-2 border-dashed border-brand-200 bg-white/50 p-5 text-center">
        <p className="text-3xl" aria-hidden="true">
          🔒
        </p>
        <p className="mt-2 text-sm font-bold text-ink-soft">{lockedMessage}</p>
      </div>
    )
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {levels.map((puzzle, i) => {
        const record = recordOf(puzzle.id)
        const order = LEVEL_ORDER.findIndex((p) => p.id === puzzle.id) + 1

        return (
          <motion.li
            key={puzzle.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 280, damping: 26 }}
          >
            <button
              type="button"
              onClick={() => {
                play('select')
                onOpen(puzzle.id)
              }}
              aria-label={`Level ${order}, ${puzzle.title}. ${
                record.solved ? `Solved with ${record.stars} of 3 stars.` : 'Not solved yet.'
              }`}
              className={[
                'card pressable flex w-full items-center gap-3 p-3 text-left sm:p-4',
                record.solved ? 'border-mint/50' : '',
              ].join(' ')}
            >
              {/* Number badge */}
              <span
                className={[
                  'grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 text-xl',
                  record.solved
                    ? 'border-emerald-500 bg-mint text-white'
                    : 'border-brand-200 bg-brand-50 text-brand-600',
                ].join(' ')}
                aria-hidden="true"
              >
                {record.solved ? '✓' : order}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base leading-tight font-extrabold text-ink">
                  {puzzle.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg" aria-hidden="true">
                    {puzzle.badge}
                  </span>
                  <StarRow value={record.stars} size="sm" />
                </div>
              </div>

              <span className="shrink-0 text-ink-faint" aria-hidden="true">
                <NextIcon />
              </span>
            </button>
          </motion.li>
        )
      })}
    </ul>
  )
}
