import type { Puzzle } from '../data/types'
import { MAX_STARS } from '../data/puzzles'

/* ============================================================= scoring ==== */

export const FIRST_TRY_BONUS = 50
export const NO_HINT_BONUS = 40
export const PER_MISTAKE_COST = 15
export const MIN_POINTS = 40

export interface PlaySummary {
  attempts: number
  hintsUsed: number
  stars: number
  points: number
}

/** 3 stars = first try, no hint. 2 = one slip. 1 = needed real help. */
export function starsFor(attempts: number, hintsUsed: number): number {
  if (attempts <= 1 && hintsUsed === 0) return 3
  if (attempts <= 2 && hintsUsed <= 1) return 2
  return 1
}

export function scoreRun(puzzle: Puzzle, attempts: number, hintsUsed: number): PlaySummary {
  const stars = starsFor(attempts, hintsUsed)
  const earned =
    puzzle.basePoints +
    (attempts <= 1 ? FIRST_TRY_BONUS : 0) +
    (hintsUsed === 0 ? NO_HINT_BONUS : 0) -
    (attempts - 1) * PER_MISTAKE_COST

  return {
    attempts,
    hintsUsed,
    stars,
    points: Math.max(MIN_POINTS, earned),
  }
}

/** 0-100, used for the ring on the results screen. */
export function starPercent(stars: number): number {
  return (stars / 3) * 100
}

export function completionPercent(solvedCount: number, levelCount: number): number {
  if (levelCount === 0) return 0
  return Math.min(100, (solvedCount / levelCount) * 100)
}

export { MAX_STARS }
