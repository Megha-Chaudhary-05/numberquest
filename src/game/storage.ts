import type { WorldId } from '../data/types'

/* ============================================================ persistence ==== */

const STORAGE_KEY = 'numberquest.save.v1'

export interface LevelRecord {
  /** Best star rating ever earned (0 = unsolved). */
  stars: number
  /** Best point total ever earned. */
  bestPoints: number
  solved: boolean
  /** How many separate times the level was cleared. */
  clears: number
  /** Epoch ms of the most recent clear. */
  lastPlayed: number
}

export interface Settings {
  sound: boolean
  reduceMotion: boolean
}

export interface SaveData {
  version: 1
  totalStars: number
  totalPoints: number
  /** Star totals, recomputed from `levels` on load — kept in sync on write. */
  levels: Record<string, LevelRecord>
  settings: Settings
  lastLevelId: string | null
}

export const emptyLevel = (): LevelRecord => ({
  stars: 0,
  bestPoints: 0,
  solved: false,
  clears: 0,
  lastPlayed: 0,
})

export const defaultSave = (): SaveData => ({
  version: 1,
  totalStars: 0,
  totalPoints: 0,
  levels: {},
  settings: { sound: true, reduceMotion: false },
  lastLevelId: null,
})

/* ------------------------------------------------------------- storage ---- */

function hasStorage(): boolean {
  try {
    const probe = '__nq_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    // Private browsing / blocked storage — the game still works, just unsaved.
    return false
  }
}

const available = typeof window !== 'undefined' && hasStorage()

/** Read the save file, tolerating corruption or an older shape. */
export function loadSave(): SaveData {
  if (!available) return defaultSave()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSave()
    const parsed: unknown = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    return defaultSave()
  }
}

export function writeSave(data: SaveData): void {
  if (!available) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Quota exceeded or storage disabled mid-session: ignore, keep playing.
  }
}

export function clearSave(): void {
  if (!available) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Coerce anything JSON-ish into a valid SaveData. Exported so the save-format
 * migration can be tested directly against corrupted input.
 */
export function migrate(parsed: unknown): SaveData {
  const base = defaultSave()
  if (typeof parsed !== 'object' || parsed === null) return base
  const input = parsed as Partial<SaveData>

  const levels: Record<string, LevelRecord> = {}
  if (typeof input.levels === 'object' && input.levels !== null) {
    for (const [id, value] of Object.entries(input.levels)) {
      if (typeof value !== 'object' || value === null) continue
      const v = value as Partial<LevelRecord>
      levels[id] = {
        stars: clampInt(v.stars, 0, 3),
        bestPoints: Math.max(0, Number(v.bestPoints) || 0),
        solved: Boolean(v.solved),
        clears: Math.max(0, Number(v.clears) || 0),
        lastPlayed: Math.max(0, Number(v.lastPlayed) || 0),
      }
    }
  }

  const settings: Settings = {
    sound: input.settings?.sound !== false,
    reduceMotion: Boolean(input.settings?.reduceMotion),
  }

  return {
    version: 1,
    levels,
    settings,
    lastLevelId: typeof input.lastLevelId === 'string' ? input.lastLevelId : null,
    // Always recomputed from `levels` so totals can never drift.
    totalStars: Object.values(levels).reduce((s, l) => s + l.stars, 0),
    totalPoints: Object.values(levels).reduce((s, l) => s + l.bestPoints, 0),
  }
}

function clampInt(value: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

/* ------------------------------------------------------------- progress --- */

export interface WorldProgress {
  worldId: WorldId
  totalStars: number
  maxStars: number
  solved: number
  total: number
  unlocked: boolean
  /** 0-100, drives the progress bar on the map. */
  percent: number
}
