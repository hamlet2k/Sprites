/**
 * Generate simple PNG PWA icons (no external deps).
 * Dark background + purple crystal mark matching the app theme.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([len, typeB, data, crc])
}

function encodePng(size, rgbaAt) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = rgbaAt(x, y, size)
      const i = y * stride + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** App icon: dark bg, soft purple rounded diamond / crystal. */
function paintIcon(x, y, size, { maskable }) {
  const bg = [11, 14, 20, 255]
  const purple = [91, 141, 239, 255] // close to --accent
  const purpleDeep = [126, 20, 255, 255]
  const glow = [237, 230, 255, 255]

  // Safe zone inset for maskable icons (~10% each side)
  const pad = maskable ? size * 0.12 : size * 0.08
  const cx = size / 2
  const cy = size / 2
  const nx = (x - cx) / (size / 2 - pad)
  const ny = (y - cy) / (size / 2 - pad)

  // Soft vignette background
  const edge = Math.sqrt(nx * nx + ny * ny)
  let r = bg[0]
  let g = bg[1]
  let b = bg[2]
  if (edge < 1.15) {
    const t = Math.max(0, 1 - edge * 0.35)
    r = Math.round(bg[0] + 18 * t)
    g = Math.round(bg[1] + 22 * t)
    b = Math.round(bg[2] + 40 * t)
  }

  // Diamond (manhattan) crystal
  const diamond = Math.abs(nx) + Math.abs(ny)
  if (diamond < 0.72) {
    const inner = 1 - diamond / 0.72
    const mix = inner * inner
    r = Math.round(purpleDeep[0] * (1 - mix) + purple[0] * mix)
    g = Math.round(purpleDeep[1] * (1 - mix) + purple[1] * mix)
    b = Math.round(purpleDeep[2] * (1 - mix) + purple[2] * mix)
    // highlight
    if (nx + ny < -0.15 && diamond < 0.45) {
      const h = Math.min(1, (-nx - ny - 0.15) * 1.4)
      r = Math.round(r + (glow[0] - r) * h * 0.45)
      g = Math.round(g + (glow[1] - g) * h * 0.45)
      b = Math.round(b + (glow[2] - b) * h * 0.45)
    }
  }

  // Outer ring for non-maskable clarity
  if (!maskable) {
    const ring = Math.abs(Math.sqrt(nx * nx + ny * ny) - 0.88)
    if (ring < 0.04) {
      r = purple[0]
      g = purple[1]
      b = purple[2]
    }
  }

  return [r, g, b, 255]
}

mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const any = encodePng(size, (x, y, s) => paintIcon(x, y, s, { maskable: false }))
  writeFileSync(join(outDir, `pwa-${size}.png`), any)
  const mask = encodePng(size, (x, y, s) => paintIcon(x, y, s, { maskable: true }))
  writeFileSync(join(outDir, `pwa-maskable-${size}.png`), mask)
  console.log(`wrote pwa-${size}.png + maskable`)
}

// Apple touch icon (180)
const apple = encodePng(180, (x, y, s) => paintIcon(x, y, s, { maskable: true }))
writeFileSync(join(outDir, 'apple-touch-icon.png'), apple)
console.log('wrote apple-touch-icon.png')
