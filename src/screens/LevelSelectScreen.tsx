import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { MapIcon, NextIcon, StarIcon } from '../components/ui/Icons'
import { Card, ProgressBar, Screen, SoundButton, StarRow, TopBar } from '../components/ui'
import { LEVEL_ORDER, puzzlesInGroup } from '../data/puzzles'
import { getWorld, WORLDS } from '../data/worlds'
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty, type WorldId } from '../data/types'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

/* ======================================================= level select ==== */

export function LevelSelectScreen() {
  const navigate = useNavigate()
  const params = useParams<{ worldId?: string }>()
  const {
    worldProgress,
    groupProgress,
    levelRecord,
    totalStars,
    soundOn,
    toggleSound,
    difficulty,
    setDifficulty,
  } = useProgress()

  const world = getWorld(params.worldId)

  /* No world in the URL: every level, split by tier, with a world filter. */
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
            return (
              <section key={w.id} aria-labelledby={`h-${w.id}`}>
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
                <DifficultyPicker value={difficulty} onChange={setDifficulty} />
                {DIFFICULTIES.map((d) => (
                  <DifficultyBlock
                    key={d}
                    worldId={w.id}
                    difficulty={d}
                    locked={!progress.unlocked}
                    lockedMessage={`Collect ${w.starsToUnlock} stars to open this world`}
                    onOpen={(id) => navigate(`/play/${id}`)}
                    recordOf={levelRecord}
                  />
                ))}
              </section>
            )
          })}
        </main>
      </Screen>
    )
  }

  /* A specific world. */
  const progress = worldProgress(world.id)
  const group = groupProgress(world.id, difficulty)

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
          <>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />

            {/* Per-tier summary for the selected difficulty. */}
            <p className="mb-3 mt-4 flex items-center gap-2 text-sm font-bold text-ink-soft">
              <span aria-hidden="true">{DIFFICULTY_META[difficulty].emoji}</span>
              {DIFFICULTY_META[difficulty].label} — {group.solved} of {group.total} solved
              <span className="ml-auto text-xs font-extrabold text-ink-faint">
                {group.totalStars}/{group.maxStars} ★
              </span>
            </p>
            <p className="mb-4 text-sm font-semibold text-ink-faint">
              {DIFFICULTY_META[difficulty].blurb}
            </p>

            <LevelList
              worldId={world.id}
              difficulty={difficulty}
              onOpen={(id) => navigate(`/play/${id}`)}
              recordOf={levelRecord}
            />
          </>
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

/* ===================================================== difficulty tabs ==== */

/**
 * Tier switcher. It is a filter, not a lock: every tier of an open world is
 * playable straight away, so no option is ever disabled.
 */
function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty
  onChange: (d: Difficulty) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Difficulty"
      className="flex gap-2 rounded-3xl border-2 border-line bg-white/70 p-1.5"
    >
      {DIFFICULTIES.map((d) => {
        const meta = DIFFICULTY_META[d]
        const active = d === value
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              play('select')
              onChange(d)
            }}
            className={[
              'flex-1 rounded-2xl px-2 py-2.5 text-sm font-extrabold transition',
              active
                ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop'
                : 'text-ink-soft hover:bg-brand-50',
            ].join(' ')}
          >
            <span aria-hidden="true" className="mr-1">
              {meta.emoji}
            </span>
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

/* ========================================================== difficulty ==== */

/** One tier of one world, as a labelled group with its own heading. */
function DifficultyBlock({
  worldId,
  difficulty,
  locked,
  lockedMessage,
  onOpen,
  recordOf,
}: {
  worldId: WorldId
  difficulty: Difficulty
  locked?: boolean
  lockedMessage?: string
  onOpen: (puzzleId: string) => void
  recordOf: (id: string) => { stars: number; solved: boolean; bestPoints: number }
}) {
  const meta = DIFFICULTY_META[difficulty]
  const levels = puzzlesInGroup(worldId, difficulty)
  const solved = levels.filter((p) => recordOf(p.id).solved).length

  return (
    <section className="mt-4 first:mt-2" aria-label={`${meta.label} levels`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
        <span aria-hidden="true">{meta.emoji}</span>
        {meta.label}
        <span className="ml-auto text-xs font-bold text-ink-faint">
          {locked ? '🔒' : `${solved}/${levels.length}`}
        </span>
      </h3>
      <LevelList
        worldId={worldId}
        difficulty={difficulty}
        locked={locked}
        lockedMessage={lockedMessage}
        onOpen={onOpen}
        recordOf={recordOf}
      />
    </section>
  )
}

/* ============================================================== list ==== */

function LevelList({
  worldId,
  difficulty,
  locked = false,
  lockedMessage = '',
  onOpen,
  recordOf,
}: {
  worldId: WorldId
  difficulty: Difficulty
  locked?: boolean
  lockedMessage?: string
  onOpen: (puzzleId: string) => void
  recordOf: (id: string) => { stars: number; solved: boolean; bestPoints: number }
}) {
  const levels = puzzlesInGroup(worldId, difficulty)

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

  // 50 levels per group: chunk into rows of 5 so the list stays scannable and
  // the DOM stays light enough for low-end phones.
  const rows: (typeof levels)[] = []
  for (let i = 0; i < levels.length; i += 5) rows.push(levels.slice(i, i + 5))

  return (
    <div className="space-y-2">
      {rows.map((row, rowIndex) => (
        <motion.ul
          key={`${difficulty}-${rowIndex}`}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(rowIndex, 6) * 0.04 }}
        >
          {row.map((puzzle) => {
            const record = recordOf(puzzle.id)
            const order = LEVEL_ORDER.findIndex((p) => p.id === puzzle.id) + 1

            return (
              <li key={puzzle.id}>
                <button
                  type="button"
                  onClick={() => {
                    play('select')
                    onOpen(puzzle.id)
                  }}
                  aria-label={`${DIFFICULTY_META[difficulty].label} level ${puzzle.levelNumber}, ${
                    puzzle.title
                  }. ${record.solved ? `Solved with ${record.stars} of 3 stars.` : 'Not solved yet.'}`}
                  className={[
                    'card pressable flex w-full items-center gap-2.5 p-2.5 text-left',
                    record.solved ? 'border-mint/50' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 text-base',
                      record.solved
                        ? 'border-emerald-500 bg-mint text-white'
                        : 'border-brand-200 bg-brand-50 text-brand-600',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {record.solved ? '✓' : puzzle.levelNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-tight font-extrabold text-ink">
                      {puzzle.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-base" aria-hidden="true">
                        {puzzle.badge}
                      </span>
                      <StarRow value={record.stars} size="sm" />
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-ink-faint sm:block" aria-hidden="true">
                    <NextIcon />
                  </span>
                </button>
                <span className="sr-only">Global position {order}</span>
              </li>
            )
          })}
        </motion.ul>
      ))}
    </div>
  )
}
