// ============================================================
// なぞり練習用: 1画だけの判定（お手本の位置に重ねて書く。仕様 §6）
// 文字全体の認識（自由筆記の分類）は src/recognition/classify.ts が担当。
// ============================================================
import { applyCharTransform, polylineLength, resample, type Pt } from '../geometry'
import { getRefLetter, REF_VIEWBOX } from '../refdata'
import { DEFAULT_JUDGE_CONFIG, type JudgeConfig } from '../../config/judgeConfig'
import { pairCost, pairMetrics, strokeFeatures } from './metrics'
import type { RefStroke } from '../refdata'
import type { StrokeFeatures } from './metrics'

export function refStrokeFeatures(rs: RefStroke): StrokeFeatures {
  return {
    pts: rs.norm,
    len: rs.normLen,
    start: rs.normStart,
    end: rs.normEnd,
    centroid: rs.normCentroid,
    angle: rs.normAngle,
  }
}

export interface TraceJudgeResult {
  ok: boolean
  /** 始点が遠すぎる */
  startTooFar: boolean
  /** 逆方向に書いたと推定される */
  reversed: boolean
  cost: number
  startDist: number
}

export function judgeTraceStroke(
  letter: string,
  strokeIndex: number,
  strokePx: Pt[],
  boxSizePx: number,
  cfg: JudgeConfig = DEFAULT_JUDGE_CONFIG
): TraceJudgeResult {
  const ref = getRefLetter(letter, cfg.resampleN)
  const rs = ref.strokes[strokeIndex]
  if (!rs) throw new Error(`judgeTraceStroke: stroke ${strokeIndex} not found for ${letter}`)
  const sVb = REF_VIEWBOX / Math.max(boxSizePx, 1)
  const conv = strokePx.map((p) => ({ x: p.x * sVb, y: p.y * sVb }))
  if (conv.length < 2 || polylineLength(conv) < cfg.minStrokeLen) {
    // iの点など「点」ストロークは長さ0でも許す（お手本側も極小のとき）
    if (!(rs.normLen < 0.12 && conv.length >= 1)) {
      return { ok: false, startTooFar: false, reversed: false, cost: Infinity, startDist: Infinity }
    }
  }
  // なぞりでは「お手本の位置」に合わせる必要があるため、ref側の正規化変換を使う
  const norm = resample(applyCharTransform(conv, ref.transform), cfg.resampleN)
  const feat = strokeFeatures(norm)
  const featRev = strokeFeatures([...norm].reverse())
  const refF = refStrokeFeatures(rs)
  // なぞりは位置ガイドが見えているため、位置系（始点・終点・重心）の重みを倍にして
  // 「となりの別の画」への誤マッチを防ぐ。線の揺れ（DTW）への寛容さは変えない。
  const traceWeights = {
    ...cfg.weights,
    start: cfg.weights.start * 2,
    end: cfg.weights.end * 2,
    centroid: cfg.weights.centroid * 2,
  }
  const costF = pairCost(pairMetrics(feat, refF, cfg.dtwBand), traceWeights)
  const costR = pairCost(pairMetrics(featRev, refF, cfg.dtwBand), traceWeights)
  const startDist = Math.hypot(feat.start.x - rs.normStart.x, feat.start.y - rs.normStart.y)
  const endNearStart = Math.hypot(feat.end.x - rs.normStart.x, feat.end.y - rs.normStart.y)

  const startTooFar = startDist > cfg.trace.startRadius
  const ok = !startTooFar && costF <= cfg.trace.passCost
  const reversed =
    !ok && costR <= cfg.trace.passCost && costR + cfg.reverseMargin < costF && endNearStart <= cfg.trace.startRadius

  return { ok, startTooFar, reversed, cost: costF, startDist }
}
