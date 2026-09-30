/**
 * Smoke tests for the pure game logic — no DOM required.
 *
 *   node --experimental-strip-types --no-warnings scripts/test-logic.ts
 *
 * This is the safety net that matters most: if a puzzle's `answer` ever stops
 * matching the maths, a child gets told they are wrong for being right.
 */
import assert from 'node:assert/strict'
import { PUZZLES, LEVEL_ORDER, MAX_STARS, puzzlesInWorld } from '../src/data/puzzles.ts'
import { WORLDS } from '../src/data/worlds.ts'
import { correctOptionIndex, gradesOnSelect, hasAnswer, isCorrect, isEquationSolved } from '../src/game/grading.ts'
import { scoreRun, starsFor } from '../src/game/scoring.ts'
import { defaultSave, emptyLevel, loadSave, migrate } from '../src/game/storage.ts'

let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok   ${name}`)
  } catch (error) {
    console.error(`  FAIL ${name}`)
    console.error(`       ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

const byId = new Map(PUZZLES.map((p) => [p.id, p]))
const get = (id: string) => {
  const p = byId.get(id)
  if (!p) throw new Error(`no puzzle ${id}`)
  return p
}

/* ============================================================ structure ==== */

test('exactly 10 puzzles, ids unique', () => {
  assert.equal(PUZZLES.length, 10)
  assert.equal(new Set(PUZZLES.map((p) => p.id)).size, 10)
})

test('MAX_STARS is levels x 3', () => {
  assert.equal(MAX_STARS, 30)
})

test('every world has at least one level', () => {
  for (const w of WORLDS) {
    assert.ok(puzzlesInWorld(w.id).length > 0, `${w.id} has no levels`)
  }
})

test('every puzzle belongs to a known world and has copy', () => {
  for (const p of PUZZLES) {
    assert.ok(WORLDS.some((w) => w.id === p.worldId), `${p.id}: unknown world`)
    for (const field of ['title', 'prompt', 'hint', 'explanation', 'cheer', 'nudge'] as const) {
      assert.ok(p[field]?.trim().length > 0, `${p.id}: empty ${field}`)
    }
    assert.ok(p.basePoints > 0, `${p.id}: no basePoints`)
  }
})

test('every answer appears in its own option list', () => {
  for (const p of PUZZLES) {
    const options = 'options' in p && p.options ? p.options : undefined
    if (!options) continue
    assert.ok(options.includes(p.answer), `${p.id}: answer not in options`)
    assert.equal(new Set(options).size, options.length, `${p.id}: duplicate options`)
  }
})

test('difficulty is non-decreasing within a world', () => {
  for (const w of WORLDS) {
    const points = puzzlesInWorld(w.id).map((p) => p.basePoints)
    for (let i = 1; i < points.length; i++) {
      assert.ok(points[i] >= points[i - 1], `${w.id}: level ${i} is easier than ${i - 1}`)
    }
  }
})

test('world unlock thresholds are strictly increasing and reachable', () => {
  for (let i = 1; i < WORLDS.length; i++) {
    assert.ok(
      WORLDS[i].starsToUnlock > WORLDS[i - 1].starsToUnlock,
      `${WORLDS[i].id} threshold not higher than ${WORLDS[i - 1].id}`,
    )
    assert.ok(WORLDS[i].starsToUnlock <= MAX_STARS, `${WORLDS[i].id} is unreachable`)
  }
  assert.equal(WORLDS[0].starsToUnlock, 0, 'first world must be open from the start')
})

/* ============================================================== answers ==== */

test('sequence: 2,4,6,8 -> 10', () => {
  const p = get('even-steps')
  assert.ok(isCorrect(p, '10'))
  for (const wrong of ['9', '11', '12', '8', '']) {
    assert.ok(!isCorrect(p, wrong), `${wrong} should be wrong`)
  }
})

test('sequence: 1,2,4,8 -> 16', () => {
  const p = get('double-trouble')
  assert.ok(isCorrect(p, '16'))
  assert.ok(!isCorrect(p, '10'))
})

test('numeric word problem: 24 - 9 + 15 = 30', () => {
  const p = get('apple-cart')
  assert.equal(24 - 9 + 15, p.answer)
  assert.ok(isCorrect(p, '30'))
  assert.ok(!isCorrect(p, '24'))
  assert.ok(!isCorrect(p, '15'))
})

test('visual next: repeating trio resolves to the star', () => {
  const p = get('wave-pattern')
  assert.deepEqual(p.rows[0], ['🔺', '🔵', '⭐', '🔺', '🔵', null])
  assert.equal(correctOptionIndex(p), p.options!.indexOf('⭐'))
  assert.ok(isCorrect(p, '⭐'))
  assert.ok(!isCorrect(p, '🔺'))
})

test('visual count: the grid really contains the stated number of fish', () => {
  const p = get('reef-count')
  const total = p.rows.flat().filter(Boolean).length
  assert.equal(total, Number(p.answer), 'declared answer does not match the picture')
  assert.ok(isCorrect(p, '15'))
})

test('visual doubling: the hidden row really is double the one above', () => {
  const p = get('coral-doubles')
  const counts = p.rows.map((r) => r.filter(Boolean).length)
  assert.deepEqual(counts, [1, 2, 4, 0], 'rows do not double')
  assert.equal(Number(p.answer), counts[2] * 2, 'answer is not the next double')
  assert.ok(isCorrect(p, '8'))
})

test('numeric blank: 7 + ? = 12 -> 5', () => {
  const p = get('missing-addend')
  assert.equal(7 + p.answer, 12, 'equation in the prompt is not satisfied')
  assert.ok(isCorrect(p, '5'))
  assert.ok(!isCorrect(p, '4'))
})

test('riddle: "all but nine" leaves 9 sheep', () => {
  const p = get('sheep-flock')
  assert.equal(p.answer, '9')
  assert.ok(isCorrect(p, '9'))
  assert.ok(!isCorrect(p, '17'), 'the trap answer must not be accepted')
  assert.ok(!isCorrect(p, '8'))
})

test('riddle choice: exactly one option has a doubled ones digit', () => {
  const p = get('locked-digits')
  // The riddle states the *ones* digit is double the *tens* digit.
  const matches = p.options!.filter((o) => {
    const n = Number(o)
    const tens = Math.floor(n / 10)
    const ones = n % 10
    return n >= 20 && n < 30 && ones === tens * 2
  })
  assert.deepEqual(matches, [p.answer], 'more than one option satisfies the riddle')
  assert.ok(isCorrect(p, '24'))
})

test('riddle choice: the wording and the answer agree', () => {
  const p = get('locked-digits')
  const saysOnes = /ones digit is (exactly )?double/.test(p.riddle)
  const saysTens = /tens digit is (exactly )?double/.test(p.riddle)
  assert.ok(
    saysOnes !== saysTens,
    'the riddle must name exactly one digit as the doubled one',
  )

  const n = Number(p.answer)
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const holds = saysOnes ? ones === tens * 2 : tens === ones * 2
  assert.ok(holds, `"${p.answer}" does not satisfy the riddle as worded`)
  assert.ok(p.explanation.includes(String(ones)), 'explanation should quote the ones digit')
  assert.ok(p.explanation.includes(String(tens)), 'explanation should quote the tens digit')
})

/* =========================================================== equations ==== */

// `isEquationSolved` takes only the tokens the player places. The `=` is fixed
// furniture in the UI, so it is never part of this list.
test('equation: every genuinely true arrangement is accepted', () => {
  const p = get('true-equation')
  // The bank is 9, 4, 5, -, + — so all four of these are real solutions.
  for (const good of [
    ['9', '-', '4', '5'],
    ['4', '+', '5', '9'],
    ['9', '-', '5', '4'],
    ['5', '+', '4', '9'],
  ]) {
    assert.ok(isEquationSolved(p, good), `${good.join(' ')} should be accepted`)
  }
})

test('equation: false arrangements are rejected', () => {
  const p = get('true-equation')
  for (const bad of [
    ['9', '-', '4', '9'], // 5 != 9
    ['9', '+', '4', '5'], // 13 != 5
    ['4', '-', '9', '5'], // -5 != 5
    ['5', '-', '4', '9'], // 1 != 9
    ['9', '+', '5', '4'], // 14 != 4
  ]) {
    assert.ok(!isEquationSolved(p, bad), `${bad.join(' ')} should be rejected`)
  }
})

test('equation: incomplete, oversized and mis-typed builds are rejected', () => {
  const p = get('true-equation')
  for (const bad of [
    ['9', '-', '4'], // too few
    ['9', '-', '4', '5', '9'], // too many
    [], // empty
    ['9', '-', '', '5'], // a gap
    ['9', '4', '4', '5'], // a number in the operator slot
    ['9', '-', '+', '5'], // an operator in a number slot
    ['9', '*', '4', '5'], // unsupported operator
    ['9', '-', '4', '5.5'], // not an integer
  ]) {
    assert.ok(!isEquationSolved(p, bad), `${JSON.stringify(bad)} should be rejected`)
  }
})

test('equation: the fixed = is never accepted as a placed token', () => {
  const p = get('true-equation')
  assert.ok(isEquationSolved(p, ['9', '-', '4', '5']), 'sanity: this one is true')
  assert.ok(!isEquationSolved(p, ['9', '-', '4', '=']), '= must not fill a number slot')
})

test('equation: a proper minus sign is accepted, not just ASCII hyphen', () => {
  const p = get('true-equation')
  assert.ok(isEquationSolved(p, ['9', '−', '4', '5']), 'U+2212 minus should be accepted')
  assert.ok(isEquationSolved(p, ['9', '–', '4', '5']), 'en dash should be accepted')
})

test('equation: a number cannot fill the operator slot or vice versa', () => {
  const p = get('true-equation')
  assert.ok(!isEquationSolved(p, ['9', '4', '4', '5']), 'number used as operator')
  assert.ok(!isEquationSolved(p, ['9', '-', '+', '5']), 'operator used as number')
})

/* ============================================================== scoring ==== */

test('stars: 3 needs a clean first try, 2 allows one slip or one hint', () => {
  assert.equal(starsFor(1, 0), 3, 'first try, no hint')
  assert.equal(starsFor(2, 0), 2, 'one slip')
  assert.equal(starsFor(2, 1), 2, 'one slip and one hint')
  assert.equal(starsFor(1, 1), 2, 'right first time but needed a nudge')
  assert.equal(starsFor(3, 0), 1, 'three attempts, no help')
  assert.equal(starsFor(1, 3), 1, 'lots of hints')
  assert.equal(starsFor(9, 9), 1, 'struggled, but still cleared it')
})

test('score: first try beats a sloppy win, and never drops below the floor', () => {
  const p = get('even-steps')
  const clean = scoreRun(p, 1, 0)
  const messy = scoreRun(p, 5, 2)
  assert.equal(clean.stars, 3)
  assert.ok(clean.points > messy.points)
  assert.ok(messy.points >= 40, 'score floor breached')
  assert.equal(clean.points, p.basePoints + 50 + 40)
})

/* ========================================================= interaction ==== */

test('tap-to-grade kinds are exactly the option-based ones', () => {
  for (const p of PUZZLES) {
    const shouldTap =
      p.kind === 'sequence' ||
      p.kind === 'choice' ||
      (p.kind === 'visual' && p.answerMode === 'choice') ||
      (p.kind === 'riddle' && p.answerMode === 'choice')
    assert.equal(gradesOnSelect(p), shouldTap, `${p.id}: wrong grading mode`)
  }
})

test('hasAnswer rejects an empty box and accepts a real one', () => {
  for (const p of PUZZLES) {
    assert.ok(!hasAnswer(p, ''), `${p.id}: empty counted as an answer`)
    assert.ok(!hasAnswer(p, '   '), `${p.id}: whitespace counted as an answer`)
  }
  assert.ok(hasAnswer(get('reef-count'), '15'))
  assert.ok(hasAnswer(get('true-equation'), '9 - 4 = 5'))
})

test('input is normalised before comparison', () => {
  const p = get('apple-cart')
  assert.ok(isCorrect(p, ' 30 '))
  assert.ok(isCorrect(p, '30 apples'), 'unit text should be tolerated')
  assert.ok(isCorrect(p, '3o'.replace('o', '0')), 'garbage is still wrong')
})

test('nonsense input never crashes a grader', () => {
  for (const p of PUZZLES) {
    for (const junk of ['abc', 'NaN', '-', '=', '..', '0', '99999', '🙂']) {
      assert.doesNotThrow(() => isCorrect(p, junk), `${p.id} threw on ${junk}`)
    }
  }
})

/* ============================================================ ordering ==== */

test('LEVEL_ORDER matches the puzzle array', () => {
  assert.equal(LEVEL_ORDER.length, PUZZLES.length)
  LEVEL_ORDER.forEach((p, i) => assert.equal(p.id, PUZZLES[i].id))
})

/* ========================================================== persistence ==== */

test('a fresh save is empty and sound-on', () => {
  const save = defaultSave()
  assert.equal(save.totalStars, 0)
  assert.equal(save.settings.sound, true)
  assert.deepEqual(save.levels, {})
})

test('migrate recomputes totals instead of trusting them', () => {
  const save = migrate({
    totalStars: 9999,
    totalPoints: 9999,
    levels: {
      a: { stars: 3, bestPoints: 100, solved: true, clears: 1, lastPlayed: 1 },
      b: { stars: 2, bestPoints: 50, solved: true, clears: 1, lastPlayed: 2 },
    },
  })
  assert.equal(save.totalStars, 5, 'totals must be derived from levels')
  assert.equal(save.totalPoints, 150)
})

test('migrate clamps out-of-range and junk values', () => {
  const save = migrate({
    levels: {
      a: { stars: 99, bestPoints: -5, solved: 'yes', clears: 'x' },
      b: null,
    },
  })
  assert.equal(save.levels.a.stars, 3, 'stars should clamp to 3')
  assert.equal(save.levels.a.bestPoints, 0, 'negative points should clamp to 0')
  assert.equal(save.levels.a.clears, 0)
  assert.equal(save.levels.b, undefined, 'null level entries should be dropped')
})

test('migrate survives garbage input', () => {
  for (const junk of [null, 42, 'nope', [], { levels: 'bad' }]) {
    assert.doesNotThrow(() => migrate(junk), `migrate threw on ${JSON.stringify(junk)}`)
  }
  assert.equal(loadSave().version, 1)
})

test('emptyLevel is a safe starting record', () => {
  const r = emptyLevel()
  assert.equal(r.stars, 0)
  assert.equal(r.solved, false)
})

/* ================================================================ report ==== */

console.log(`\n${passed} checks passed${process.exitCode ? ' (with failures)' : ''}\n`)
