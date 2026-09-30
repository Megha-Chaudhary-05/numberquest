import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FloatingShapes, Logo, Mascot } from '../components/art'
import { Button } from '../components/ui/Button'
import { HomeIcon, MapIcon, PlayIcon, StarIcon, StarsIcon } from '../components/ui/Icons'
import { ProgressBar, Screen, SoundButton, StarRow } from '../components/ui'
import { LEVEL_ORDER, MAX_STARS, getPuzzle } from '../data/puzzles'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

/* ============================================================== home ==== */

export function HomeScreen() {
  const navigate = useNavigate()
  const {
    totalStars,
    totalPoints,
    solvedCount,
    levelCount,
    toggleSound,
    soundOn,
    save,
  } = useProgress()

  const resumeId = save.lastLevelId ?? LEVEL_ORDER[0]?.id
  const resumePuzzle = getPuzzle(resumeId) ?? LEVEL_ORDER[0]
  const hasProgress = solvedCount > 0
  const percent = (solvedCount / levelCount) * 100

  return (
    <Screen wash className="relative">
      <FloatingShapes />

      {/* Settings + sound, always reachable in the top-right. */}
      <div className="safe-t safe-x absolute inset-x-0 top-0 z-20 flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={() => {
            play('select')
            navigate('/settings')
          }}
          aria-label="Open settings"
          className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-white/70 bg-white/80 text-ink-soft shadow-card backdrop-blur transition active:scale-95"
        >
          <StarsIcon className="h-6 w-6" />
        </button>
        <SoundButton on={soundOn} onToggle={toggleSound} />
      </div>

      <main className="safe-px relative flex flex-1 flex-col items-center justify-center gap-7 py-16 sm:gap-9 sm:py-20">
        {/* Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="flex flex-col items-center gap-3"
        >
          <Logo className="h-24 w-24 drop-shadow-xl sm:h-32 sm:w-32" />
          <div className="text-center">
            <h1 className="text-4xl leading-none font-extrabold tracking-tight text-ink sm:text-6xl">
              Number<span className="text-brand-500">Quest</span>
            </h1>
            <p className="mt-2 text-base font-semibold text-ink-soft sm:text-lg">
              A maths puzzle adventure
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 240, damping: 22 }}
          className="card w-full max-w-md p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mascot mood="happy" />
              <div>
                <p className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                  {hasProgress ? 'Keep going!' : 'Welcome, traveller'}
                </p>
                <p className="text-sm font-extrabold text-ink">
                  {solvedCount} of {levelCount} puzzles solved
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1.5 text-xl font-extrabold text-ink">
                <span className="text-sunny" aria-hidden="true">
                  <StarIcon />
                </span>
                {totalStars}
                <span className="text-sm font-bold text-ink-faint">/{MAX_STARS}</span>
              </p>
              <p className="text-xs font-bold text-ink-faint">{totalPoints} points</p>
            </div>
          </div>

          {hasProgress ? (
            <ProgressBar
              value={percent}
              label={`Overall progress: ${Math.round(percent)} percent`}
              className="mt-3"
              tone="sunny"
            />
          ) : null}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 22 }}
          className="flex w-full max-w-md flex-col gap-3"
        >
          <Button
            size="lg"
            fullWidth
            icon={<PlayIcon />}
            onClick={() => {
              play('select')
              navigate(`/play/${resumePuzzle?.id ?? ''}`)
            }}
          >
            {hasProgress ? `Continue · ${resumePuzzle?.title}` : 'Start playing'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
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
            <Button
              variant="secondary"
              size="lg"
              icon={<HomeIcon />}
              onClick={() => {
                play('select')
                navigate('/levels')
              }}
            >
              All levels
            </Button>
          </div>
        </motion.div>

        {/* Hint about the star system */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-xs text-center text-xs leading-relaxed font-semibold text-ink-faint sm:text-sm"
        >
          Solve puzzles first try for 3 stars. Stuck? Every hint is there to help
          you learn something new.
        </motion.p>
      </main>

      {/* Star legend */}
      {hasProgress ? (
        <footer className="safe-b safe-px pb-4">
          <div className="mx-auto flex max-w-md items-center justify-center gap-2 text-xs font-bold text-ink-faint">
            <StarRow value={totalStars > 0 ? 3 : 0} size="sm" />
            <span>3 stars = solved first try, no hints</span>
          </div>
        </footer>
      ) : null}
    </Screen>
  )
}
