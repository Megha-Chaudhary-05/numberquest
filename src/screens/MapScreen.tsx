import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { WorldArt } from '../components/art'
import { Button } from '../components/ui/Button'
import { LockIcon, PlayIcon, StarIcon } from '../components/ui/Icons'
import { Card, Chip, ProgressBar, Screen, SoundButton, TopBar } from '../components/ui'
import { WORLDS } from '../data/worlds'
import { puzzlesInGroup } from '../data/puzzles'
import { DIFFICULTY_META } from '../data/types'
import { useProgress } from '../game/ProgressContext'
import { play } from '../game/sound'

/* =============================================================== map ==== */

export function MapScreen() {
  const navigate = useNavigate()
  const { worldProgress, groupProgress, totalStars, levelRecord, soundOn, toggleSound, difficulty } =
    useProgress()

  return (
    <Screen wash className="map-dots">
      <TopBar
        onBack={() => navigate('/')}
        title="World map"
        subtitle={`${totalStars} stars collected`}
        right={<SoundButton on={soundOn} onToggle={toggleSound} />}
      />

      <main className="safe-x safe-b mx-auto w-full max-w-2xl flex-1 space-y-4 py-4 sm:space-y-5 sm:py-6">
        {WORLDS.map((world, i) => {
          const progress = worldProgress(world.id)
          const locked = !progress.unlocked
          const cleared = progress.solved === progress.total

          // Resume inside the tier the player last browsed, so the map respects
          // their chosen difficulty instead of always jumping to Easy.
          const tierLevels = puzzlesInGroup(world.id, difficulty)
          const resume = tierLevels.find((p) => !levelRecord(p.id).solved) ?? tierLevels[0]
          const tier = groupProgress(world.id, difficulty)

          return (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 260, damping: 26 }}
            >
              <Card as="article" className={locked ? 'opacity-95' : ''}>
                <div
                  className={`relative bg-gradient-to-br p-4 sm:p-5 ${world.gradient} ${
                    locked ? 'grayscale-[0.6]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <WorldArt
                      worldId={world.id}
                      className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="flex items-center gap-2 text-lg leading-tight font-extrabold text-white drop-shadow-sm sm:text-2xl">
                        <span aria-hidden="true">{locked ? '🔒' : world.emoji}</span>
                        <span className="truncate">{world.name}</span>
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-white/90 sm:text-sm">
                        {world.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {locked ? (
                      <Chip className="bg-white/90 text-rose-600">
                        <LockIcon />
                        {Math.max(0, world.starsToUnlock - totalStars)} more stars to unlock
                      </Chip>
                    ) : (
                      <>
                        <Chip className="bg-white/90 text-brand-700">
                          {progress.solved}/{progress.total} solved
                        </Chip>
                        <Chip className="bg-white/90 text-amber-700">
                          <span className="text-sunny">
                            <StarIcon />
                          </span>
                          {progress.totalStars}/{progress.maxStars}
                        </Chip>
                        {cleared ? (
                          <Chip className="bg-white/90 text-emerald-700">✓ Cleared!</Chip>
                        ) : null}
                      </>
                    )}
                  </div>

                  <ProgressBar
                    value={progress.percent}
                    label={`${world.name}: ${Math.round(progress.percent)} percent complete`}
                    className="mt-3 bg-white/55"
                    tone={cleared ? 'mint' : 'brand'}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  {locked ? (
                    <span className="text-xs font-bold text-ink-faint">
                      Collect {world.starsToUnlock} stars to open this world
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-ink-faint">
                        {progress.solved === 0
                          ? 'New adventure'
                          : `Next up: ${resume?.title ?? 'All clear'}`}
                      </span>
                      <span
                        className="text-xs font-bold text-ink-faint"
                        aria-label={`Browsing ${DIFFICULTY_META[difficulty].label} levels`}
                      >
                        <span aria-hidden="true">{DIFFICULTY_META[difficulty].emoji}</span>{' '}
                        {DIFFICULTY_META[difficulty].label} · {tier.solved}/{tier.total}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            play('select')
                            navigate(`/world/${world.id}`)
                          }}
                        >
                          {progress.solved === progress.total ? 'Replay' : 'Levels'}
                        </Button>
                        {resume ? (
                          <Button
                            size="sm"
                            icon={<PlayIcon />}
                            onClick={() => {
                              play('select')
                              navigate(`/play/${resume.id}`)
                            }}
                          >
                            {progress.solved > 0 ? 'Resume' : 'Start'}
                          </Button>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}

        <p className="pt-2 text-center text-xs leading-relaxed font-semibold text-ink-faint">
          Each world holds 50 easy, 50 medium and 50 hard levels. Worlds open as you collect
          stars, and every tier is playable as soon as its world does — nothing is ever lost.
        </p>
      </main>
    </Screen>
  )
}
