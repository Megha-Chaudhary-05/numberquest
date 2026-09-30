import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { RefreshIcon, SoundOnIcon, StarsIcon } from '../components/ui/Icons'
import { Card, Chip, ProgressBar, Screen, TopBar } from '../components/ui'
import { MAX_STARS } from '../data/puzzles'
import { WORLDS } from '../data/worlds'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

/* =========================================================== settings ==== */

export function SettingsScreen() {
  const navigate = useNavigate()
  const {
    soundOn,
    reduceMotion,
    toggleSound,
    setReduceMotion,
    resetProgress,
    totalStars,
    totalPoints,
    solvedCount,
    levelCount,
    worldProgress,
  } = useProgress()

  const [confirming, setConfirming] = useState(false)

  return (
    <Screen wash>
      <TopBar onBack={() => navigate('/')} title="Settings" subtitle="Sound, motion and progress" />

      <main className="safe-x safe-b mx-auto w-full max-w-2xl flex-1 space-y-4 py-4 sm:space-y-5 sm:py-6">
        {/* Sound */}
        <Card className="p-4 sm:p-5">
          <ToggleRow
            icon={<SoundOnIcon />}
            title="Sound effects"
            description="Cheerful chimes when you solve a puzzle."
            on={soundOn}
            onToggle={toggleSound}
          />
        </Card>

        {/* Motion */}
        <Card className="p-4 sm:p-5">
          <ToggleRow
            icon={<StarsIcon />}
            title="Reduce motion"
            description="Turn off floating shapes and confetti. Also follows your device setting."
            on={reduceMotion}
            onToggle={() => setReduceMotion(!reduceMotion)}
          />
        </Card>

        {/* Progress summary */}
        <Card className="p-4 sm:p-5">
          <h2 className="text-base font-extrabold text-ink">Your progress</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink-soft">
            Stored on this device only — no account, no server.
          </p>

          <div className="mt-4 space-y-3">
            {WORLDS.map((world) => {
              const progress = worldProgress(world.id)
              return (
                <div key={world.id}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="text-ink-soft">
                      <span className="mr-1" aria-hidden="true">
                        {progress.unlocked ? world.emoji : '🔒'}
                      </span>
                      {world.name}
                    </span>
                    <span className="text-ink-faint tabular-nums">
                      {progress.totalStars}/{progress.maxStars} ★
                    </span>
                  </div>
                  <ProgressBar
                    value={progress.percent}
                    label={`${world.name} progress`}
                    tone={progress.percent === 100 ? 'mint' : 'brand'}
                  />
                </div>
              )
            })}
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 border-t-2 border-line pt-4 text-center">
            <div>
              <dt className="text-[11px] font-bold text-ink-faint">Stars</dt>
              <dd className="text-xl font-extrabold text-ink tabular-nums">
                {totalStars}
                <span className="text-xs text-ink-faint">/{MAX_STARS}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold text-ink-faint">Points</dt>
              <dd className="text-xl font-extrabold text-ink tabular-nums">{totalPoints}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold text-ink-faint">Solved</dt>
              <dd className="text-xl font-extrabold text-ink tabular-nums">
                {solvedCount}
                <span className="text-xs text-ink-faint">/{levelCount}</span>
              </dd>
            </div>
          </dl>
        </Card>

        {/* Danger zone */}
        <Card className="border-coral/30 p-4 sm:p-5">
          <h2 className="text-base font-extrabold text-ink">Start over</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink-soft">
            Clears every star, score and level record on this device.
          </p>
          {confirming ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  play('back')
                  resetProgress()
                  setConfirming(false)
                }}
              >
                Yes, erase everything
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setConfirming(false)}>
                Keep my progress
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              className="mt-3"
              icon={<RefreshIcon />}
              onClick={() => setConfirming(true)}
            >
              Reset progress
            </Button>
          )}
        </Card>

        <div className="flex justify-center gap-2 pt-1">
          <Chip tone="grape">NumberQuest v1.0</Chip>
          <Chip tone="sky">Made for ages 11–20</Chip>
        </div>
      </main>
    </Screen>
  )
}

/* ============================================================ toggle ==== */

function ToggleRow({
  icon,
  title,
  description,
  on,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  description: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
          on ? 'bg-brand-100 text-brand-600' : 'bg-brand-50 text-ink-faint'
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base leading-tight font-extrabold text-ink">{title}</p>
        <p className="text-xs font-semibold text-ink-soft sm:text-sm">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onToggle}
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors duration-200 ${
          on ? 'border-brand-600 bg-brand-500' : 'border-line bg-brand-100'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${
            on ? 'left-6.5' : 'left-0.5'
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
