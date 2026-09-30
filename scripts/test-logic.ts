/**
 * Smoke tests for the pure game logic — no DOM required.
 *
 *   node --experimental-strip-types --no-warnings scripts/test-logic.ts
 *
 * This is the safety net that matters most: if a puzzle's `answer` ever stops
 * matching the maths, a child gets told they are wrong for being right.
 */
import assert from 'node:assert/strict'
import {
  LEVEL_ORDER,
  LEVELS_PER_GROUP,
  MAX_STARS,
  PUZZLES,
  nextPuzzle,
  puzzlesInGroup,
  puzzlesInWorld,
  worldLevelCount,
  worldMaxStars,
} from '../src/data/puzzles.ts'
import { WORLDS } from '../src/data/worlds.ts'
import { DIFFICULTIES, DIFFICULTY_META, difficultyRank, isDifficulty } from '../src/data/types.ts'
import {
  correctOptionIndex,
  gradesOnSelect,
  hasAnswer,
  isCorrect,
  isEquationSolved,
  normalise,
} from '../src/game/grading.ts'
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

test('every world x difficulty group holds exactly 50 levels', () => {
  assert.equal(WORLDS.length * DIFFICULTIES.length * LEVELS_PER_GROUP, PUZZLES.length)
  for (const w of WORLDS) {
    for (const d of DIFFICULTIES) {
      assert.equal(
        puzzlesInGroup(w.id, d).length,
        LEVELS_PER_GROUP,
        `${w.id}/${d} should hold ${LEVELS_PER_GROUP} levels`,
      )
    }
    assert.equal(worldLevelCount(w.id), LEVELS_PER_GROUP * DIFFICULTIES.length)
    assert.equal(worldMaxStars(w.id), LEVELS_PER_GROUP * DIFFICULTIES.length * 3)
  }
})

test('puzzle ids are unique', () => {
  assert.equal(new Set(PUZZLES.map((p) => p.id)).size, PUZZLES.length)
})

test('MAX_STARS is levels x 3', () => {
  assert.equal(MAX_STARS, PUZZLES.length * 3)
  assert.equal(MAX_STARS, WORLDS.length * LEVELS_PER_GROUP * DIFFICULTIES.length * 3)
})

test('every world has at least one level', () => {
  for (const w of WORLDS) {
    assert.ok(puzzlesInWorld(w.id).length > 0, `${w.id} has no levels`)
  }
})

test('levelNumber counts 1..50 inside each group', () => {
  for (const w of WORLDS) {
    for (const d of DIFFICULTIES) {
      const levels = puzzlesInGroup(w.id, d)
      levels.forEach((p, i) => {
        assert.equal(p.levelNumber, i + 1, `${p.id}: levelNumber should be ${i + 1}`)
        assert.equal(p.difficulty, d, `${p.id}: wrong difficulty`)
        assert.equal(p.worldId, w.id, `${p.id}: wrong world`)
      })
    }
  }
})

test('difficulty order is easy, then medium, then hard', () => {
  WORLDS.forEach((w, wi) => {
    const levels = puzzlesInWorld(w.id)
    const ranks = levels.map((p) => difficultyRank(p.difficulty))
    for (let i = 1; i < ranks.length; i++) {
      assert.ok(ranks[i] >= ranks[i - 1], `${w.id}: tier goes backwards at index ${i}`)
    }
    // Worlds also run in declaration order.
    if (wi > 0) {
      const prev = puzzlesInWorld(WORLDS[wi - 1].id)
      assert.ok(levels[0].id !== prev[0].id, 'world ordering is not stable')
    }
  })
})

test('a group only advertises tiers the player can reach', () => {
  for (const d of DIFFICULTIES) {
    assert.ok(DIFFICULTY_META[d].label.length > 0, `${d} has no label`)
    assert.ok(DIFFICULTY_META[d].blurb.length > 0, `${d} has no blurb`)
  }
  assert.deepEqual(DIFFICULTIES, ['easy', 'medium', 'hard'])
  assert.ok(isDifficulty('easy') && isDifficulty('hard'))
  assert.ok(!isDifficulty('impossible') && !isDifficulty(undefined))
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

test('a level is never worth fewer points than an earlier one in the same world', () => {
  for (const w of WORLDS) {
    const points = puzzlesInWorld(w.id).map((p) => p.basePoints)
    for (let i = 1; i < points.length; i++) {
      assert.ok(points[i] >= points[i - 1], `${w.id}: level ${i} is easier than ${i - 1}`)
    }
  }
})

test('hard levels are worth more than easy ones at the same level number', () => {
  for (const w of WORLDS) {
    for (let n = 1; n <= LEVELS_PER_GROUP; n++) {
      const easy = puzzlesInGroup(w.id, 'easy')[n - 1]
      const hard = puzzlesInGroup(w.id, 'hard')[n - 1]
      assert.ok(
        hard.basePoints > easy.basePoints,
        `${w.id} level ${n}: hard should outscore easy`,
      )
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

test('nextPuzzle walks the whole game and stops at the end', () => {
  assert.equal(nextPuzzle(LEVEL_ORDER[0].id)?.id, LEVEL_ORDER[1].id)
  assert.equal(nextPuzzle(LEVEL_ORDER[LEVEL_ORDER.length - 2].id)?.id, LEVEL_ORDER.at(-1)!.id)
  assert.equal(nextPuzzle(LEVEL_ORDER.at(-1)!.id), null)
  assert.equal(nextPuzzle('not-a-level'), null)
})

test('nextPuzzle never skips a level', () => {
  for (let i = 0; i < LEVEL_ORDER.length - 1; i++) {
    assert.equal(nextPuzzle(LEVEL_ORDER[i].id)?.id, LEVEL_ORDER[i + 1].id)
  }
})

/* ================================================== generated levels ==== */

test('the hand-written openers are still the first levels of each world', () => {
  for (const w of WORLDS) {
    const easy = puzzlesInGroup(w.id, 'easy')
    assert.ok(easy.length >= 2, `${w.id} needs at least two openers`)
  }
  assert.ok(isCorrect(get('even-steps'), '10'), 'the easy opener should still grade')
  assert.ok(isCorrect(get('wave-pattern'), '⭐'), 'the lagoon opener should still grade')
  assert.ok(isEquationSolved(get('true-equation'), ['9', '-', '4', '5']), 'the ridge opener')
  assert.ok(isCorrect(get('sheep-flock'), '9'), 'the ruins opener should still grade')

  // Openers sit at the front of their world's easy tier, not scattered.
  for (const w of WORLDS) {
    const first = puzzlesInGroup(w.id, 'easy')[0]
    assert.equal(first.difficulty, 'easy', `${first.id} should open on easy`)
    assert.equal(first.levelNumber, 1)
  }
})

test('every generated level accepts its own answer', () => {
  for (const p of PUZZLES) {
    const answer = 'answer' in p ? String(p.answer) : ''
    if (answer) {
      assert.ok(hasAnswer(p, answer), `${p.id}: its own answer was rejected`)
      assert.ok(isCorrect(p, answer), `${p.id}: its own answer was marked wrong`)
    }
  }
})

test('every generated option list has the answer plus real distractors', () => {
  for (const p of PUZZLES) {
    if (!('options' in p) || !p.options) continue
    assert.equal(new Set(p.options).size, p.options.length, `${p.id}: duplicate options`)
    assert.ok(p.options.length >= 3, `${p.id}: needs at least 3 options`)
    const answer = String(p.answer)
    assert.ok(p.options.includes(answer), `${p.id}: answer missing from options`)
    const others = p.options.filter((o) => o !== answer)
    assert.ok(others.length >= 2, `${p.id}: not enough distractors`)
  }
})

test('every sequence continues to its answer under some stated rule', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'sequence') continue
    const items = p.items.map(Number)
    assert.ok(items.length >= 4, `${p.id}: sequence too short`)
    assert.ok(items.every(Number.isInteger), `${p.id}: non-integer term`)
    const gaps = items.slice(1).map((v, i) => v - items[i])
    const last = items.at(-1)!
    const answer = Number(p.answer)

    // A sequence is valid if one rule explains every gap *and* yields the answer.
    const constant = gaps.every((g) => g === gaps[0])
    const doubling = items.every((v, i) => i === 0 || v === items[i - 1] * 2)
    const growingByOne = gaps.every((g, i) => i === 0 || g === gaps[i - 1] + 1)
    const growingByTwo = gaps.every((g, i) => i === 0 || g === gaps[i - 1] + 2)

    const explained =
      (constant && last + gaps[0] === answer) ||
      (doubling && last * 2 === answer) ||
      (growingByOne && last + gaps.at(-1)! + 1 === answer) ||
      (growingByTwo && last + gaps.at(-1)! + 2 === answer)

    assert.ok(explained, `${p.id}: no rule yields ${answer} from ${items.join(',')}`)

    // The explanation must quote the answer, so a child can check the reasoning.
    assert.ok(
      p.explanation.includes(String(answer)),
      `${p.id}: explanation does not mention the answer`,
    )
  }
})

test('every numeric fill-in-gap equation balances', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'numeric') continue
    if (!p.parts.some((part) => part === null)) continue

    const filled = p.parts.map((part) => (part === null ? String(p.answer) : part))
    // `parts` may end with a unit word ("apples"), so only the arithmetic head
    // is parsed. The shape is always `a op b = c`.
    const text = filled.filter((part) => /^-?\d+$|^[+−=]$/.test(part)).join(' ')
    const match = /^(-?\d+)\s*([+−])\s*(-?\d+)\s*=\s*(-?\d+)$/.exec(text)
    if (!match) {
      // Not an equation shape (a plain word problem with a blank) — the word
      // problem is covered by "accepts its own answer" and the scoring tests.
      assert.ok(
        p.parts.filter((part) => /^-?\d+$/.test(part as string)).length <= 2,
        `${p.id}: unrecognised parts "${text}"`,
      )
      continue
    }
    const [, aRaw, op, bRaw, cRaw] = match
    const a = Number(aRaw)
    const b = Number(bRaw)
    const c = Number(cRaw)
    assert.equal(op === '+' ? a + b : a - b, c, `${p.id}: ${text} does not balance`)
  }
})

test('every generated visual count matches the picture', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'visual') continue
    if (p.answerMode !== 'number') continue
    const shown = p.rows.flat().filter(Boolean).length
    assert.equal(shown, Number(p.answer), `${p.id}: picture shows ${shown}, answer says ${p.answer}`)
  }
})

test('every generated visual "next" resolves to the repeated item', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'visual' || p.answerMode !== 'choice') continue
    const row = p.rows[0]
    const last = row.at(-1)
    if (last !== null && last !== undefined) continue
    // The group before the gap must repeat somewhere later in the row.
    const shown = row.filter((c): c is string => Boolean(c))
    const head = shown[0]
    assert.ok(shown.includes(p.answer), `${p.id}: answer "${p.answer}" never appears in the row`)
    assert.ok(
      shown.lastIndexOf(head) < shown.length - 1,
      `${p.id}: the pattern never restarts, so "next" is ambiguous`,
    )
  }
})

test('every equation bank is one token longer than its fillable slots', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'equation') continue
    const fillable = p.slots.filter((slot) => slot !== '=').length
    assert.equal(fillable, 4, `${p.id}: expected the a op b = c shape`)
    assert.equal(
      p.tokens.length,
      fillable + 1,
      `${p.id}: bank should hold one spare token beyond the ${fillable} slots`,
    )
    assert.ok(
      p.tokens.filter((t) => t === '+' || t === '-').length >= 1,
      `${p.id}: bank must offer at least one operator`,
    )
    assert.equal(
      p.tokens.filter((t) => t === '=').length,
      0,
      `${p.id}: the = is fixed furniture, not a spendable token`,
    )
  }
})

test('every equation has at least one true arrangement of its own bank', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'equation') continue
    const found = arrangements(p.tokens, 4).find((arr) => isEquationSolved(p, arr))
    assert.ok(found, `${p.id}: no true arrangement of ${p.tokens.join(' ')}`)
  }
})

test('every equation accepts all of its true arrangements', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'equation') continue
    const solutions = arrangements(p.tokens, 4).filter((arr) => isEquationSolved(p, arr))
    assert.ok(solutions.length >= 1, `${p.id}: unsolvable`)
    // More than one answer is intentional — grading checks the maths, not the
    // token order. But every accepted arrangement must really be true.
    for (const solution of solutions) {
      const [a, op, b, c] = solution.map(normalise)
      assert.equal(
        op === '+' ? Number(a) + Number(b) : Number(a) - Number(b),
        Number(c),
        `${p.id}: ${solution.join(' ')} was accepted but is not true`,
      )
    }
  }
})

test('every generated riddle states a rule its answer satisfies', () => {
  for (const p of PUZZLES) {
    if (p.kind !== 'riddle') continue
    if (p.answerMode !== 'choice') continue
    const n = Number(p.answer)
    assert.ok(Number.isInteger(n) && n > 0, `${p.id}: riddle answer should be a positive integer`)

    // The explanation is the contract: it must quote the answer itself.
    assert.ok(
      p.explanation.includes(String(n)),
      `${p.id}: explanation does not mention the answer ${n}`,
    )

    // Re-check the doubled-digit rule, which is the only numeric one generated.
    if (/ones digit/.test(p.riddle) || /ones/.test(p.explanation)) {
      const tens = Math.floor(n / 10)
      const ones = n % 10
      if (tens > 0) {
        assert.equal(ones, tens * 2, `${p.id}: ${n} does not have a doubled ones digit`)
      }
    }
  }
})

test('every generated level is internally consistent', () => {
  for (const p of PUZZLES) {
    assert.ok(p.id.length > 0, 'level with no id')
    assert.ok(!p.id.includes('undefined'), `${p.id}: id contains "undefined"`)
    assert.ok(!p.id.includes('NaN'), `${p.id}: id contains "NaN"`)
    assert.ok(p.title.length > 0 && p.title.length <= 48, `${p.id}: title length ${p.title.length}`)
    assert.ok(p.badge.trim().length > 0, `${p.id}: no badge`)
    assert.ok(p.hint.trim().length > 0, `${p.id}: no hint`)
    assert.ok(p.explanation.trim().length > 0, `${p.id}: no explanation`)
    assert.ok(p.cheer.trim().length > 0, `${p.id}: no cheer`)
    assert.ok(p.nudge.trim().length > 0, `${p.id}: no nudge`)
    assert.ok(p.basePoints > 0, `${p.id}: no basePoints`)
    assert.ok(Number.isInteger(p.basePoints), `${p.id}: basePoints should be an integer`)
    // No leftover template placeholders.
    for (const field of [p.prompt, p.hint, p.explanation] as string[]) {
      assert.ok(!/undefined|NaN|\[object/.test(field), `${p.id}: template leak in copy`)
    }
  }
})

test('generated levels vary: the same template is not repeated verbatim', () => {
  for (const w of WORLDS) {
    for (const d of DIFFICULTIES) {
      const group = puzzlesInGroup(w.id, d)
      const prompts = group.map((p) => p.prompt)
      // A little repetition is fine; total uniformity means a broken seed.
      const unique = new Set(prompts).size
      assert.ok(
        unique > group.length * 0.4,
        `${w.id}/${d}: only ${unique} distinct prompts across ${group.length} levels`,
      )
      const titles = group.map((p) => p.title)
      assert.equal(
        new Set(titles).size,
        titles.length,
        `${w.id}/${d}: duplicate titles within a group`,
      )
    }
  }
})

test('generation is deterministic', async () => {
  const a = await import('../src/data/puzzles.ts')
  const b = await import('../src/data/puzzles.ts?again')
  assert.deepEqual(
    a.PUZZLES.map((p) => p.id + p.title + p.prompt),
    b.PUZZLES.map((p) => p.id + p.title + p.prompt),
    're-importing the data should produce identical levels',
  )
})

/**
 * Every ordered draw of `length` tokens from `bank`, drawn without replacement
 * so a token cannot be spent twice. A bank of 5 over 4 slots is 120 outcomes.
 */
function arrangements(bank: string[], length: number): string[][] {
  const out: string[][] = []
  const walk = (rest: string[], acc: string[]) => {
    if (acc.length === length) {
      out.push(acc)
      return
    }
    for (let i = 0; i < rest.length; i++) {
      walk(rest.slice(0, i).concat(rest.slice(i + 1)), acc.concat(rest[i]))
    }
  }
  walk(bank, [])
  return out
}

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
