// 2D幾何ユーティリティ。判定エンジン全体で共有する。

export interface Pt {
  x: number
  y: number
}

export interface BBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  w: number
  h: number
  cx: number
  cy: number
}

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

export function polylineLength(pts: Pt[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  return len
}

/** arc length based resampling（$1 recognizer方式）。必ずn点を返す。 */
export function resample(pts: Pt[], n: number): Pt[] {
  if (n <= 0) return []
  if (pts.length === 0) return []
  const total = polylineLength(pts)
  if (pts.length === 1 || total < 1e-9) {
    return Array.from({ length: n }, () => ({ x: pts[0].x, y: pts[0].y }))
  }
  const step = total / (n - 1)
  const out: Pt[] = [{ x: pts[0].x, y: pts[0].y }]
  let D = 0
  let prev = pts[0]
  for (let i = 1; i < pts.length; i++) {
    let cur = pts[i]
    let d = dist(prev, cur)
    while (D + d >= step && out.length < n - 1 && d > 1e-12) {
      const t = (step - D) / d
      const np = lerpPt(prev, cur, t)
      out.push(np)
      prev = np
      d = dist(prev, cur)
      D = 0
    }
    D += d
    prev = cur
  }
  while (out.length < n) out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y })
  return out
}

export function bboxOf(strokes: Pt[][]): BBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of strokes) {
    for (const p of s) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!isFinite(minX)) {
    minX = minY = maxX = maxY = 0
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: maxX - minX,
    h: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
}

export function centroidOf(pts: Pt[]): Pt {
  if (pts.length === 0) return { x: 0, y: 0 }
  let sx = 0
  let sy = 0
  for (const p of pts) {
    sx += p.x
    sy += p.y
  }
  return { x: sx / pts.length, y: sy / pts.length }
}

/** 始点→終点の弦の角度（ラジアン） */
export function chordAngle(pts: Pt[]): number {
  const a = pts[0]
  const b = pts[pts.length - 1]
  return Math.atan2(b.y - a.y, b.x - a.x)
}

/** 角度差を [0, PI] に正規化 */
export function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2)
  if (d > Math.PI) d = Math.PI * 2 - d
  return d
}

/**
 * 文字正規化変換: 文字全体のbboxを (0.5,0.5) 中心・最大辺1のスケールへ写す。
 * 「少し大きい・小さい・位置ずれ」を吸収する（仕様 §8）。
 */
export interface CharTransform {
  cx: number
  cy: number
  scale: number
}

export function makeCharTransform(bbox: BBox): CharTransform {
  const scale = Math.max(bbox.w, bbox.h, 1e-6)
  return { cx: bbox.cx, cy: bbox.cy, scale }
}

export function applyCharTransform(pts: Pt[], t: CharTransform): Pt[] {
  return pts.map((p) => ({ x: (p.x - t.cx) / t.scale + 0.5, y: (p.y - t.cy) / t.scale + 0.5 }))
}

/** 配列のシャッフル（Fisher–Yates、非破壊） */
export function shuffled<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** 再現性のある乱数（自己テスト・合成データ用） */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
