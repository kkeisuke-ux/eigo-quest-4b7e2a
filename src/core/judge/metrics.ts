// ストローク間距離の各種メトリクス（仕様 §8）。
// DTW / 離散フレシェ / 始点・終点距離 / 方向 / 長さ比 / 重心距離 を組み合わせる。
// 座標は「文字正規化空間」（文字最大辺=1）を前提とする。
import { angleDiff, centroidOf, chordAngle, dist, polylineLength, type Pt } from '../geometry'
import type { JudgeWeights } from '../../config/judgeConfig'

/** Sakoe-Chibaバンド付きDTW。等長点列前提。1ステップあたり平均距離を返す。 */
export function dtwDistance(a: Pt[], b: Pt[], band: number): number {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) return Infinity
  const w = Math.max(band, Math.abs(n - m) + 1)
  let prev = new Float64Array(m + 1).fill(Infinity)
  let cur = new Float64Array(m + 1).fill(Infinity)
  prev[0] = 0
  for (let i = 1; i <= n; i++) {
    cur.fill(Infinity)
    const jStart = Math.max(1, i - w)
    const jEnd = Math.min(m, i + w)
    for (let j = jStart; j <= jEnd; j++) {
      const c = dist(a[i - 1], b[j - 1])
      const best = Math.min(prev[j], prev[j - 1], cur[j - 1])
      cur[j] = c + best
    }
    const tmp = prev
    prev = cur
    cur = tmp
  }
  return prev[m] / Math.max(n, m)
}

/** 離散フレシェ距離（反復DP版） */
export function frechetDistance(a: Pt[], b: Pt[]): number {
  const n = a.length
  const m = b.length
  if (n === 0 || m === 0) return Infinity
  const dp = new Float64Array(n * m)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = dist(a[i], b[j])
      let prev: number
      if (i === 0 && j === 0) prev = 0
      else if (i === 0) prev = dp[j - 1]
      else if (j === 0) prev = dp[(i - 1) * m]
      else prev = Math.min(dp[(i - 1) * m + j], dp[(i - 1) * m + j - 1], dp[i * m + j - 1])
      dp[i * m + j] = Math.max(d, prev)
    }
  }
  return dp[n * m - 1]
}

export interface StrokeFeatures {
  pts: Pt[]
  len: number
  start: Pt
  end: Pt
  centroid: Pt
  angle: number
}

export function strokeFeatures(pts: Pt[]): StrokeFeatures {
  if (pts.length === 0) {
    const z = { x: 0, y: 0 }
    return { pts, len: 0, start: z, end: z, centroid: z, angle: 0 }
  }
  return {
    pts,
    len: polylineLength(pts),
    start: pts[0],
    end: pts[pts.length - 1],
    centroid: centroidOf(pts),
    angle: chordAngle(pts),
  }
}

export interface PairMetrics {
  dtw: number
  frechet: number
  startDist: number
  endDist: number
  /** 弦方向の角度差 / PI（0..1） */
  angleDiffNorm: number
  /** 長さの比率差（クランプ済み） */
  lengthRatio: number
  centroidDist: number
}

export function pairMetrics(u: StrokeFeatures, r: StrokeFeatures, band: number): PairMetrics {
  return {
    dtw: dtwDistance(u.pts, r.pts, band),
    frechet: frechetDistance(u.pts, r.pts),
    startDist: dist(u.start, r.start),
    endDist: dist(u.end, r.end),
    angleDiffNorm: angleDiff(u.angle, r.angle) / Math.PI,
    lengthRatio: Math.min(2, Math.abs(u.len - r.len) / Math.max(r.len, 0.05)),
    centroidDist: dist(u.centroid, r.centroid),
  }
}

export function pairCost(m: PairMetrics, w: JudgeWeights): number {
  return (
    w.dtw * m.dtw +
    w.frechet * m.frechet +
    w.start * m.startDist +
    w.end * m.endDist +
    w.angle * m.angleDiffNorm +
    w.length * m.lengthRatio +
    w.centroid * m.centroidDist
  )
}
