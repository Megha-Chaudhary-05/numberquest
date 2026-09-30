import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PUZZLES, getPuzzle, puzzlesInWorld } from '../data/puzzles'
import { WORLDS } from '../data/worlds'
import type { WorldId } from '../data/types'
import { scoreRun, type PlaySummary } from './scoring'
import * as sfx from './sound'
import {
  clearSave,
  defaultSave,
  emptyLevel,
  loadSave,
  writeSave,
  type LevelRecord,
  type SaveData,
  type WorldProgress,
} from './storage'

/* ============================================================= session ==== */

/** The outcome of the level just played, handed to the results screen. */
export interface SessionResult {
  puzzleId: string
  summary: PlaySummary
  /** True when this run beat their previous best, for the "New best!" badge. */
  newBest: boolean
  firstClear: boolean
}

interface ProgressValue {
  save: SaveData
  /** Completed session for the current results screen, if any. */
  session: SessionResult | null
  levelRecord: (puzzleId: string) => LevelRecord
  totalStars: number
  totalPoints: number
  solvedCount: number
  levelCount: number
  worldProgress: (worldId: WorldId) => WorldProgress
  isWorldUnlocked: (worldId: WorldId) => boolean
  /** Record a cleared level and build the result for the results screen. */
  completeLevel: (puzzleId: string, attempts: number, hintsUsed: number) => SessionResult
  /** Remember where the player stopped so Home can offer "Continue". */
  setLastLevel: (puzzleId: string) => void
  toggleSound: () => void
  setReduceMotion: (on: boolean) => void
  resetProgress: () => void
  soundOn: boolean
  reduceMotion: boolean
}

const ProgressContext = createContext<ProgressValue | null>(null)

/** Cumulative total stars required to open a world. The first needs none. */
const isUnlocked = (worldId: WorldId, totalStars: number): boolean => {
  const index = WORLDS.findIndex((w) => w.id === worldId)
  if (index <= 0) return true
  return totalStars >= (WORLDS[index].starsToUnlock ?? 0)
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [session, setSession] = useState<SessionResult | null>(null)

  // Push the persisted sound preference into the synth.
  useEffect(() => {
    sfx.setSoundEnabled(save.settings.sound)
  }, [save.settings.sound])

  // The first user gesture anywhere is what unlocks the AudioContext.
  useEffect(() => {
    const onGesture = () => sfx.unlockAudio()
    window.addEventListener('pointerdown', onGesture, { passive: true })
    window.addEventListener('keydown', onGesture)
    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [])

  const persist = useCallback((next: SaveData) => {
    setSave(next)
    writeSave(next)
  }, [])

  const levelRecord = useCallback(
    (puzzleId: string): LevelRecord => save.levels[puzzleId] ?? emptyLevel(),
    [save.levels],
  )

  /**
   * Recompute totals from `levels` so they can never drift out of sync.
   * The keys match `SaveData`, so the result can be spread straight into a save.
   */
  const totalsOf = useCallback(
    (levels: Record<string, LevelRecord>): Pick<SaveData, 'totalStars' | 'totalPoints'> => ({
      totalStars: Object.values(levels).reduce((s, l) => s + l.stars, 0),
      totalPoints: Object.values(levels).reduce((s, l) => s + l.bestPoints, 0),
    }),
    [],
  )

  const { totalStars, totalPoints } = useMemo(
    () => totalsOf(save.levels),
    [save.levels, totalsOf],
  )

  const solvedCount = useMemo(
    () => PUZZLES.filter((p) => save.levels[p.id]?.solved).length,
    [save.levels],
  )

  const worldStars = useCallback(
    (worldId: WorldId) =>
      puzzlesInWorld(worldId).reduce((sum, p) => sum + (save.levels[p.id]?.stars ?? 0), 0),
    [save.levels],
  )

  const worldProgress = useCallback(
    (worldId: WorldId): WorldProgress => {
      const levels = puzzlesInWorld(worldId)
      const stars = worldStars(worldId)
      const solved = levels.filter((p) => save.levels[p.id]?.solved).length
      return {
        worldId,
        totalStars: stars,
        maxStars: levels.length * 3,
        solved,
        total: levels.length,
        unlocked: isUnlocked(worldId, totalStars),
        percent: levels.length ? (solved / levels.length) * 100 : 0,
      }
    },
    [save.levels, totalStars, worldStars],
  )

  const isWorldUnlockedFn = useCallback(
    (worldId: WorldId) => isUnlocked(worldId, totalStars),
    [totalStars],
  )

  const completeLevel = useCallback(
    (puzzleId: string, attempts: number, hintsUsed: number): SessionResult => {
      const puzzle = getPuzzle(puzzleId)
      const summary = puzzle
        ? scoreRun(puzzle, attempts, hintsUsed)
        : { attempts, hintsUsed, stars: 1, points: 0 }

      const previous = save.levels[puzzleId] ?? emptyLevel()
      const record: LevelRecord = {
        stars: Math.max(previous.stars, summary.stars),
        bestPoints: Math.max(previous.bestPoints, summary.points),
        solved: true,
        clears: previous.clears + 1,
        lastPlayed: Date.now(),
      }

      const levels = { ...save.levels, [puzzleId]: record }
      const totals = totalsOf(levels)
      persist({ ...save, levels, lastLevelId: puzzleId, ...totals })

      const result: SessionResult = {
        puzzleId,
        summary,
        newBest: summary.points > previous.bestPoints,
        firstClear: !previous.solved,
      }
      setSession(result)
      return result
    },
    [persist, save, totalsOf],
  )

  const setLastLevel = useCallback(
    (puzzleId: string) => {
      if (save.lastLevelId === puzzleId) return
      persist({ ...save, lastLevelId: puzzleId })
    },
    [persist, save],
  )

  const toggleSound = useCallback(() => {
    const on = !save.settings.sound
    persist({ ...save, settings: { ...save.settings, sound: on } })
    sfx.setSoundEnabled(on)
    if (on) sfx.play('select')
  }, [persist, save])

  const setReduceMotion = useCallback(
    (on: boolean) => {
      persist({ ...save, settings: { ...save.settings, reduceMotion: on } })
    },
    [persist, save],
  )

  const resetProgress = useCallback(() => {
    const fresh = defaultSave()
    // A reset should not silently mute the player.
    fresh.settings = { ...fresh.settings, sound: save.settings.sound }
    clearSave()
    persist(fresh)
    setSession(null)
  }, [persist, save.settings.sound])

  const value = useMemo<ProgressValue>(
    () => ({
      save,
      session,
      levelRecord,
      totalStars,
      totalPoints,
      solvedCount,
      levelCount: PUZZLES.length,
      worldProgress,
      isWorldUnlocked: isWorldUnlockedFn,
      completeLevel,
      setLastLevel,
      toggleSound,
      setReduceMotion,
      resetProgress,
      soundOn: save.settings.sound,
      reduceMotion: save.settings.reduceMotion,
    }),
    [
      save,
      session,
      levelRecord,
      totalStars,
      totalPoints,
      solvedCount,
      worldProgress,
      isWorldUnlockedFn,
      completeLevel,
      setLastLevel,
      toggleSound,
      setReduceMotion,
      resetProgress,
    ],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>')
  return ctx
}
