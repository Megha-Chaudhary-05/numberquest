/**
 * Generates the PWA app icons as real PNG files, with zero dependencies.
 *
 * Renders a rounded-square "graduation cap + spark" mark over a violet→pink
 * gradient, supersampled 4x4 for antialiasing, then writes 8-bit RGBA PNGs
 * using only node:zlib.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync, crc32 } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

/* ---------------------------------------------------------------- raster --- */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

const VIOLET = [124, 92, 255]
const PINK = [236, 72, 153]
const MINT = [45, 212, 167]
const SUN = [250, 204, 21]
const WHITE = [255, 255, 255]

/** Signed distance to a rounded rectangle centred on (cx, cy). */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r
}

/** Signed distance to a line segment, used to draw the plus and cap strokes. */
function sdSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy || 1), 0, 1)
  return Math.hypot(wx - vx * t, wy - vy * t)
}

/** Even-odd point-in-polygon test, used for the spark star. */
function inPolygon(px, py, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function starPoints(cx, cy, outer, inner, points = 5, rotation = -Math.PI / 2) {
  const pts = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = rotation + (i * Math.PI) / points
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return pts
}

/**
 * Colour of the mark at normalised (u, v) in [0, 1].
 * `maskable` scales the artwork down so it survives a circular mask.
 */
function sampleMark(u, v, maskable) {
  const scale = maskable ? 0.62 : 1
  const x = (u - 0.5) / scale + 0.5
  const y = (v - 0.5) / scale + 0.5

  // background
  let colour = mix(VIOLET, PINK, clamp((x + y) / 2, 0, 1))

  if (maskable) {
    // full-bleed background; the badge shape only reads as a soft halo
    colour = mix(colour, [255, 255, 255], 0.06)
  } else {
    // rounded-square plate
    const d = sdRoundRect(x, y, 0.5, 0.5, 0.5, 0.5, 0.225)
    if (d > 0) return null // transparent outside the plate
    colour = mix(colour, WHITE, clamp(d / -0.02, 0, 1) * 0.1)
  }

  // graduation cap: a wide flat diamond plus its base
  const capDiamond = [
    [0.5, 0.3],
    [0.79, 0.44],
    [0.5, 0.58],
    [0.21, 0.44],
  ]
  const capBase = [
    [0.29, 0.485],
    [0.5, 0.6],
    [0.71, 0.485],
    [0.71, 0.565],
    [0.5, 0.68],
    [0.29, 0.565],
  ]
  const onCap = inPolygon(x, y, capDiamond) || inPolygon(x, y, capBase)
  if (onCap) colour = WHITE

  // tassel
  const tasselD = Math.min(
    sdSegment(x, y, 0.755, 0.455, 0.815, 0.53),
    sdSegment(x, y, 0.815, 0.53, 0.805, 0.62),
  )
  if (tasselD < 0.022) colour = mix(SUN, colour, clamp(tasselD / 0.022, 0, 1) * 0.15)

  // spark
  const spark = starPoints(0.29, 0.71, 0.105, 0.044)
  if (inPolygon(x, y, spark)) colour = mix(SUN, [255, 240, 190], 0.25)

  // underline swoosh
  const swooshD = sdSegment(x, y, 0.3, 0.83, 0.7, 0.83)
  if (swooshD < 0.026) colour = mix(MINT, colour, clamp(swooshD / 0.026, 0, 1) * 0.2)

  return colour
}

function renderPng(size, { maskable = false } = {}) {
  const SS = 4 // supersampling factor
  const rows = Buffer.alloc(size * (size * 4 + 1))

  for (let py = 0; py < size; py++) {
    const rowStart = py * (size * 4 + 1)
    rows[rowStart] = 0 // filter type: None
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size
          const v = (py + (sy + 0.5) / SS) / size
          const c = sampleMark(u, v, maskable)
          if (c) {
            r += c[0]
            g += c[1]
            b += c[2]
            a += 255
          }
        }
      }
      const n = SS * SS
      const alpha = a / n
      const o = rowStart + 1 + px * 4
      // un-premultiply so edge pixels keep their hue
      const k = alpha > 0 ? 255 / alpha : 0
      rows[o] = clamp(Math.round((r / n) * k), 0, 255)
      rows[o + 1] = clamp(Math.round((g / n) * k), 0, 255)
      rows[o + 2] = clamp(Math.round((b / n) * k), 0, 255)
      rows[o + 3] = Math.round(alpha)
    }
  }
  return encodePng(size, size, rows)
}

/* ------------------------------------------------------------------ png --- */

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0, 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rawRows) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rawRows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ----------------------------------------------------------------- svg --- */

function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="NumberQuest">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7C5CFF"/>
      <stop offset="1" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <path d="M50 30 L79 44 L50 58 L21 44 Z" fill="#fff"/>
  <path d="M29 48.5 L50 60 L71 48.5 L71 56.5 L50 68 L29 56.5 Z" fill="#fff" opacity=".9"/>
  <path d="M75.5 45.5 L81.5 53 L80.5 62" stroke="#FACC15" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <path d="M29 71 l3.6 7.3 8 1.2 -5.8 5.7 1.4 8 -7.2 -3.8 -7.2 3.8 1.4 -8 -5.8 -5.7 8 -1.2 Z" fill="#FACC15"/>
  <path d="M30 83 L70 83" stroke="#2DD4A7" stroke-width="6" stroke-linecap="round"/>
</svg>
`
}

/* ----------------------------------------------------------------- run --- */

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['apple-touch-icon.png', 180, {}],
  ['maskable-512.png', 512, { maskable: true }],
]

for (const [name, size, opts] of targets) {
  const png = renderPng(size, opts)
  writeFileSync(resolve(OUT_DIR, name), png)
  console.log(`  ${name.padEnd(22)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`)
}

writeFileSync(
  resolve(dirname(OUT_DIR), 'favicon.svg'),
  faviconSvg(),
  'utf8',
)
console.log('  favicon.svg')
console.log('\nIcons written to public/icons/\n')
