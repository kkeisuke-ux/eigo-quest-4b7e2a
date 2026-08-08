// PWA用アイコンPNGを依存ライブラリなしで生成する（グラデ背景 + 白の「A」マーク）。
// 出力: public/icons/icon-512.png, icon-192.png, apple-touch-icon.png(180)
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ---- 最小PNGエンコーダ ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}
function encodePng(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- 描画 ----
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const qx = ax + t * dx
  const qy = ay + t * dy
  return Math.hypot(px - qx, py - qy)
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  // 「A」の3画（線分）: 左斜め・右斜め・横棒
  const s = size
  const strokes = [
    [0.5 * s, 0.18 * s, 0.28 * s, 0.74 * s],
    [0.5 * s, 0.18 * s, 0.72 * s, 0.74 * s],
    [0.365 * s, 0.54 * s, 0.635 * s, 0.54 * s],
  ]
  const r = 0.05 * s
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 背景: 上下グラデ（ティール→グリーン）
      const t = y / size
      let R = Math.round(28 + (63 - 28) * t)
      let G = Math.round(155 + (183 - 155) * t)
      let B = Math.round(124 + (117 - 124) * t)
      // 白の山マーク（SDFでアンチエイリアス）
      let d = Infinity
      for (const [ax, ay, bx, by] of strokes) d = Math.min(d, distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by))
      const a = Math.max(0, Math.min(1, r - d + 0.5))
      if (a > 0) {
        R = Math.round(R + (255 - R) * a)
        G = Math.round(G + (255 - G) * a)
        B = Math.round(B + (255 - B) * a)
      }
      const i = (y * size + x) * 4
      buf[i] = R
      buf[i + 1] = G
      buf[i + 2] = B
      buf[i + 3] = 255
    }
  }
  return encodePng(size, size, buf)
}

for (const [name, size] of [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
]) {
  fs.writeFileSync(path.join(OUT_DIR, name), renderIcon(size))
  console.log('wrote', name)
}
