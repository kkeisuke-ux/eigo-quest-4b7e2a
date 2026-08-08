// ============================================================
// アルファベット文字認識（仕様 §14-§16）
// - 1ボックス=1文字。書いたストローク群を全候補テンプレートと照合して分類する
// - コスト = boxCostWeight × box系(0..1、4線ガイド上の位置・大きさを保持)
//          + (1-boxCostWeight) × shape系(インクbbox正規化、純粋な字形)
// - 書き順・画の向きは問わない（Hungarianで順序不問マッチング、正逆min）
// - 「人が普通に読める字形なら正解」。ただし明らかに別の文字は不正解（仕様 §16）
// ============================================================
import {
  applyCharTransform,
  bboxOf,
  dist,
  makeCharTransform,
  polylineLength,
  resample,
  type Pt,
} from '../core/geometry'
import { getRefLetter, listRefLetters, REF_VIEWBOX } from '../core/refdata'
import { DEFAULT_JUDGE_CONFIG, type JudgeConfig } from '../config/judgeConfig'
import { pairCost, pairMetrics, strokeFeatures, type StrokeFeatures } from '../core/judge/metrics'
import { hungarian } from '../core/judge/hungarian'

/** マッチしなかった画（欠け・余り）に与えるコスト */
const PAD_COST = 0.95

/** 大文字と小文字の形がほぼ同じで、字形からは区別できない文字 */
export const CASE_EQUIVALENT = new Set(['c', 'k', 'o', 's', 'u', 'v', 'w', 'x', 'z'])

/** expected に対して「同じ文字」とみなす字形のリスト（c → [c, C] など） */
export function equivalentForms(expected: string): string[] {
  const lower = expected.toLowerCase()
  if (CASE_EQUIVALENT.has(lower)) {
    return expected === lower ? [lower, lower.toUpperCase()] : [expected, lower]
  }
  return [expected]
}

export interface LetterCandidate {
  letter: string
  /** 混合平均コスト（低いほど近い） */
  cost: number
  /** 画数がお手本と一致していたか */
  countMatch: boolean
}

export interface ClassifyResult {
  /** コスト昇順の候補ランキング */
  ranking: LetterCandidate[]
  /** 有効ストローク数 */
  userCount: number
  droppedTinyStrokes: number
}

interface PreparedInk {
  /** box系 0..1 */
  box: Pt[][]
  boxF: StrokeFeatures[]
  boxFRev: StrokeFeatures[]
  /** shape系（インクbbox正規化） */
  norm: Pt[][]
  normF: StrokeFeatures[]
  normFRev: StrokeFeatures[]
  dropped: number
}

function prepareInk(strokesPx: Pt[][], boxSizePx: number, cfg: JudgeConfig): PreparedInk {
  const sVb = REF_VIEWBOX / Math.max(boxSizePx, 1)
  const kept: Pt[][] = []
  let dropped = 0
  const converted = strokesPx.map((s) => s.map((p) => ({ x: p.x * sVb, y: p.y * sVb })))
  // 極小ストロークは基本ゴミだが、i/j の点として意味があるため
  // 「他に十分な長さの画がある場合のみ」保持する
  const hasSubstantial = converted.some((s) => polylineLength(s) >= cfg.minStrokeLen * 3)
  for (const conv of converted) {
    const len = polylineLength(conv)
    if (conv.length < 2 && !hasSubstantial) {
      dropped++
      continue
    }
    if (len < cfg.minStrokeLen && !hasSubstantial) {
      dropped++
      continue
    }
    kept.push(conv.length >= 2 ? conv : [conv[0], { x: conv[0].x + 0.1, y: conv[0].y + 0.1 }])
  }
  const inkBBox = bboxOf(kept)
  const t = makeCharTransform(inkBBox)
  const box = kept.map((s) => resample(s, cfg.resampleN).map((p) => ({ x: p.x / REF_VIEWBOX, y: p.y / REF_VIEWBOX })))
  const norm = kept.map((s) => resample(applyCharTransform(s, t), cfg.resampleN))
  return {
    box,
    boxF: box.map(strokeFeatures),
    boxFRev: box.map((s) => strokeFeatures([...s].reverse())),
    norm,
    normF: norm.map(strokeFeatures),
    normFRev: norm.map((s) => strokeFeatures([...s].reverse())),
    dropped,
  }
}

/** 閉曲線（O・o など、始点と終点がほぼつながる画）か */
function isClosedLoop(pts: Pt[]): boolean {
  const len = polylineLength(pts)
  if (len < 1e-6 || pts.length < 8) return false
  return dist(pts[0], pts[pts.length - 1]) < len * 0.2
}

/** 点列の開始位置を off だけ回した点列（閉曲線の「どこから書いてもよい」対応） */
function rotated(pts: Pt[], off: number): Pt[] {
  return [...pts.slice(off), ...pts.slice(0, off)]
}

/** 1候補文字との混合平均コスト */
function costAgainst(ink: PreparedInk, letter: string, cfg: JudgeConfig): LetterCandidate {
  const ref = getRefLetter(letter, cfg.resampleN)
  const userCount = ink.norm.length
  const refCount = ref.strokeCount
  const wBox = cfg.boxCostWeight
  const wShape = 1 - wBox

  // ペアごとの混合コスト（正方向・逆方向のmin。閉曲線は開始位置もずらして比較）
  const cost: number[][] = []
  for (let u = 0; u < userCount; u++) {
    const row: number[] = []
    for (let r = 0; r < refCount; r++) {
      const rs = ref.strokes[r]
      const refBoxF = strokeFeatures(rs.box)
      const refNormF: StrokeFeatures = {
        pts: rs.norm,
        len: rs.normLen,
        start: rs.normStart,
        end: rs.normEnd,
        centroid: rs.normCentroid,
        angle: rs.normAngle,
      }
      const mixedOf = (normF: StrokeFeatures, boxF: StrokeFeatures): number =>
        wShape * pairCost(pairMetrics(normF, refNormF, cfg.dtwBand), cfg.weights) +
        wBox * pairCost(pairMetrics(boxF, refBoxF, cfg.dtwBand), cfg.weights)

      let best = Math.min(mixedOf(ink.normF[u], ink.boxF[u]), mixedOf(ink.normFRev[u], ink.boxFRev[u]))
      // O のような閉曲線は書き始めの位置が人によって違うため、開始位置を回して最小を取る
      if (isClosedLoop(rs.norm) && isClosedLoop(ink.norm[u])) {
        const n = ink.norm[u].length
        for (let k = 1; k < 8; k++) {
          const off = Math.round((n * k) / 8)
          const normRot = rotated(ink.norm[u], off)
          const boxRot = rotated(ink.box[u], off)
          best = Math.min(
            best,
            mixedOf(strokeFeatures(normRot), strokeFeatures(boxRot)),
            mixedOf(strokeFeatures([...normRot].reverse()), strokeFeatures([...boxRot].reverse()))
          )
        }
      }
      row.push(best)
    }
    cost.push(row)
  }

  const K = Math.max(userCount, refCount)
  const matrix: number[][] = []
  for (let u = 0; u < K; u++) {
    const row: number[] = []
    for (let r = 0; r < K; r++) {
      if (u < userCount && r < refCount) row.push(cost[u][r])
      else row.push(PAD_COST)
    }
    matrix.push(row)
  }
  const assignment = hungarian(matrix)

  let total = 0
  for (let u = 0; u < K; u++) {
    const r = assignment[u]
    if (u < userCount && r >= 0 && r < refCount) total += cost[u][r]
    else total += PAD_COST
  }
  const diff = Math.abs(userCount - refCount)
  const avg = total / K + diff * cfg.strokeCountPenalty
  return { letter, cost: avg, countMatch: diff === 0 }
}

/**
 * 自由筆記1文字の分類。candidates省略時は52文字すべてと照合する。
 */
export function classifyLetter(
  strokesPx: Pt[][],
  boxSizePx: number,
  cfg: JudgeConfig = DEFAULT_JUDGE_CONFIG,
  candidates?: string[]
): ClassifyResult {
  const cands = candidates ?? listRefLetters()
  if (strokesPx.length === 0) return { ranking: [], userCount: 0, droppedTinyStrokes: 0 }
  const ink = prepareInk(strokesPx, boxSizePx, cfg)
  if (ink.norm.length === 0) return { ranking: [], userCount: 0, droppedTinyStrokes: ink.dropped }
  const ranking = cands
    .map((c) => costAgainst(ink, c, cfg))
    .sort((a, b) => a.cost - b.cost)
  return { ranking, userCount: ink.norm.length, droppedTinyStrokes: ink.dropped }
}

export interface ExpectedLetterJudge {
  /** 総合判定: 読める字形で、明らかな別文字でもない */
  correct: boolean
  /** 期待文字（同形の大小含む）のコスト */
  expectedCost: number
  /** 字形として合格コスト以内だったか */
  shapeOk: boolean
  /** 「明らかに別の文字」と判定された（仕様 §16） */
  clearlyDifferent: boolean
  /** 最も近いと認識された文字（表示・分析用） */
  recognized: string | null
  ranking: LetterCandidate[]
}

/**
 * 「この文字を書いたか」の判定（テスト・練習STEP3/4用）。
 * 書き順・画の向きは問わず、字形が読めれば正解（仕様 §8, §14）。
 */
export function judgeExpectedLetter(
  strokesPx: Pt[][],
  boxSizePx: number,
  expected: string,
  cfg: JudgeConfig = DEFAULT_JUDGE_CONFIG,
  candidates?: string[]
): ExpectedLetterJudge {
  const res = classifyLetter(strokesPx, boxSizePx, cfg, candidates)
  if (res.ranking.length === 0) {
    return { correct: false, expectedCost: Infinity, shapeOk: false, clearlyDifferent: false, recognized: null, ranking: [] }
  }
  const forms = new Set(equivalentForms(expected))
  const expectedCand = res.ranking.filter((c) => forms.has(c.letter)).sort((a, b) => a.cost - b.cost)[0]
  const best = res.ranking[0]
  const expectedCost = expectedCand?.cost ?? Infinity
  const shapeOk = expectedCost <= cfg.letterPassCost

  // 明らかに別の文字: 最良候補が別文字で、期待文字よりはっきり近く、期待文字自体も微妙なとき
  const bestIsOther = !forms.has(best.letter)
  const clearlyDifferent =
    bestIsOther &&
    best.cost + cfg.distinctMargin < expectedCost &&
    expectedCost > cfg.letterPassCost * cfg.distinctRatio

  return {
    correct: shapeOk && !clearlyDifferent,
    expectedCost,
    shapeOk,
    clearlyDifferent,
    recognized: best.letter,
    ranking: res.ranking,
  }
}

export interface WordJudgeResult {
  correct: boolean
  /** 各ボックスの判定 */
  letters: ExpectedLetterJudge[]
  /** 認識された文字列（表示・分析用） */
  recognized: string
  /** 未記入のボックスがあるか */
  hasEmptyBox: boolean
}

/**
 * 単語の判定: 1文字ずつ認識 → 結合 → 正解単語と比較（仕様 §16）。
 * スペリングは正確に評価する: 全ボックスが正しい文字である必要がある（仕様 §14）。
 */
export function judgeWord(
  perBoxStrokes: Pt[][][],
  boxSizePx: number,
  expectedWord: string,
  cfg: JudgeConfig = DEFAULT_JUDGE_CONFIG
): WordJudgeResult {
  const letters: ExpectedLetterJudge[] = []
  let recognized = ''
  let hasEmptyBox = false
  for (let i = 0; i < expectedWord.length; i++) {
    const strokes = perBoxStrokes[i] ?? []
    if (strokes.length === 0) {
      hasEmptyBox = true
      letters.push({
        correct: false,
        expectedCost: Infinity,
        shapeOk: false,
        clearlyDifferent: false,
        recognized: null,
        ranking: [],
      })
      recognized += '_'
      continue
    }
    const j = judgeExpectedLetter(strokes, boxSizePx, expectedWord[i], cfg)
    letters.push(j)
    recognized += j.recognized ?? '_'
  }
  const correct = !hasEmptyBox && letters.every((l) => l.correct)
  return { correct, letters, recognized, hasEmptyBox }
}
