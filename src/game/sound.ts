/* =============================================================== sound ==== */
/**
 * A tiny Web Audio synth. Everything is generated at runtime, so the game ships
 * with no audio files and stays tiny.
 *
 * Browsers block audio until the user interacts with the page, so the context
 * is created lazily on the first gesture and resumed on every later one.
 */

type Voice = 'tap' | 'select' | 'correct' | 'wrong' | 'star' | 'unlock' | 'back'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null

  try {
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.32
    master.connect(ctx.destination)
    return ctx
  } catch {
    ctx = null
    return null
  }
}

/** Call from a real user gesture so the first sound is not swallowed. */
export function unlockAudio(): void {
  const c = audio()
  if (c && c.state === 'suspended') void c.resume()
}

export function setSoundEnabled(on: boolean): void {
  enabled = on
  if (!on && ctx) void ctx.suspend()
  else if (on && ctx) void ctx.resume()
}

export function isSoundEnabled(): boolean {
  return enabled
}

interface Note {
  /** Hz */
  freq: number
  /** Seconds from the start of the voice. */
  at: number
  /** Seconds. */
  dur: number
  /** Relative gain, 0-1. */
  gain?: number
  /** Waveform. */
  type?: OscillatorType
}

const RECIPES: Record<Voice, Note[]> = {
  tap: [{ freq: 620, at: 0, dur: 0.05, gain: 0.5, type: 'triangle' }],
  select: [{ freq: 780, at: 0, dur: 0.07, gain: 0.6, type: 'sine' }],
  back: [{ freq: 420, at: 0, dur: 0.07, gain: 0.45, type: 'sine' }],
  // Rising major triad — unmistakable "you got it".
  correct: [
    { freq: 523.25, at: 0, dur: 0.16, gain: 0.7, type: 'sine' },
    { freq: 659.25, at: 0.09, dur: 0.16, gain: 0.7, type: 'sine' },
    { freq: 783.99, at: 0.18, dur: 0.3, gain: 0.75, type: 'sine' },
  ],
  // Soft, low, short. Never harsh — kids should not dread a mistake.
  wrong: [
    { freq: 300, at: 0, dur: 0.13, gain: 0.4, type: 'sine' },
    { freq: 232, at: 0.1, dur: 0.18, gain: 0.32, type: 'sine' },
  ],
  star: [{ freq: 1046.5, at: 0, dur: 0.14, gain: 0.55, type: 'triangle' }],
  unlock: [
    { freq: 523.25, at: 0, dur: 0.14, gain: 0.6, type: 'triangle' },
    { freq: 659.25, at: 0.1, dur: 0.14, gain: 0.6, type: 'triangle' },
    { freq: 987.77, at: 0.2, dur: 0.26, gain: 0.6, type: 'triangle' },
  ],
}

export function play(voice: Voice): void {
  if (!enabled) return
  const c = audio()
  if (!c || !master || c.state !== 'running') return

  const now = c.currentTime
  for (const note of RECIPES[voice]) {
    const osc = c.createOscillator()
    const env = c.createGain()
    osc.type = note.type ?? 'sine'
    osc.frequency.setValueAtTime(note.freq, now + note.at)

    const peak = (note.gain ?? 0.6) * master.gain.value
    // Short attack, exponential release — avoids the click of a raw square wave.
    env.gain.setValueAtTime(0.0001, now + note.at)
    env.gain.exponentialRampToValueAtTime(peak, now + note.at + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur)

    osc.connect(env)
    env.connect(master)
    osc.start(now + note.at)
    osc.stop(now + note.at + note.dur + 0.03)
  }
}
