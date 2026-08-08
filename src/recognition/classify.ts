// ============================================================
// アルファベット文字認識（仕様 §14-§16 + 2026-08-08 第3回フィードバック）
// - 1ボックス=1文字。書いたストローク群を全候補テンプレートと照合して分類する
// - コスト = boxCostWeight × box系(0..1、4線ガイド上の位置・大きさを保持)
//          + (1-boxCostWeight) × shape系(インクbbox正規化、純粋な字形)
// - 書き順・画の向きは問わない（Hungarianで順序不問マッチング、正逆min）
// - 「人が普通に読める字形なら正解」。ただし明らかに別の文字は不正解（仕様 §16）
// - 画数がちがっても、続け書き（例: g を丸〜しっぽまで一筆で書く）や
//   分け書き（例: o を2画で書く）に対応するため、ストロークを連結した
//   バリアントとも照合して最小コストを採用する
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
  /** 画数がお手本と一致していたか（連結バリアント採用時はtrue扱い） */
  countMatch: boolean
  /** 連結バリアント経由で最小コストになったか（別文字判定の証拠には使わない） */
  viaVariant: boolean
}

export interface ClassifyResult {
  /** コスト昇順の候補ランキング */
  ranking: LetterCandidate[]
  /** 有効ストローク数 */
  userCount: number
  droppedTinyStrokes: number
}

/** norm（字形正規化）と box（罫線位置）の両座標系を持つ1画分の点列 */
interface StrokeSet {
  norm: Pt[]
  box: Pt[]
}

interface PreparedInk {
  sets: StrokeSet[]
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
    if ((conv.length < 2 || len < cfg.minStrokeLen) && !hasSubstantial) {
      dropped++
      continue
    }
    kept.push(conv.length >= 2 ? conv : [conv[0], { x: conv[0].x + 0.1, y: conv[0].y + 0.1 }])
  }
  const inkBBox = bboxOf(kept)
  const t = makeCharTransform(inkBBox)
  const sets = kept.map((s) => ({
    box: resample(s, cfg.resampleN).map((p) => ({ x: p.x / REF_VIEWBOX, y: p.y / REF_VIEWBOX })),
    norm: resample(applyCharTransform(s, t), cfg.resampleN),
  }))
  return { sets, dropped }
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

/** 複数画を1画に連結する（続け書き対応。間はresampleの弧長補間が橋渡しする） */
function joinSets(sets: StrokeSet[], n: number): StrokeSet {
  return {
    norm: resample(sets.flatMap((s) => s.norm), n),
    box: resample(sets.flatMap((s) => s.box), n),
  }
}

interface MergeVariant {
  sets: StrokeSet[]
  /** 連結した境界の数（1連結ごとに小さなペナルティを掛ける） */
  joins: number
}

/**
 * 隣接ストロークを連結して target 本にした組合せを列挙する。
 * 連結数は最大3（M や E の完全一筆書きまで対応。k=3は全連結1通りのみ）
 */
function mergeVariants(sets: StrokeSet[], target: number, n: number): MergeVariant[] {
  const k = sets.length - target
  if (k <= 0 || k > 3 || target < 1) return []
  const boundaries = sets.length - 1
  const combos: number[][] = []
  if (k === 1) {
    for (let i = 0; i < boundaries; i++) combos.push([i])
  } else if (k === 2) {
    for (let i = 0; i < boundaries; i++) {
      for (let j = i + 1; j < boundaries; j++) combos.push([i, j])
    }
  } else {
    // k=3: 全境界を連結（完全一筆書き）
    combos.push(Array.from({ length: boundaries }, (_, i) => i))
  }
  return combos.map((cut) => {
    const groups: StrokeSet[][] = []
    let cur: StrokeSet[] = [sets[0]]
    for (let i = 1; i < sets.length; i++) {
      if (cut.includes(i - 1)) {
        cur.push(sets[i])
      } else {
        groups.push(cur)
        cur = [sets[i]]
      }
    }
    groups.push(cur)
    return { sets: groups.map((g) => (g.length === 1 ? g[0] : joinSets(g, n))), joins: k }
  })
}

/** user×ref のペア混合コスト（正逆・閉曲線回転を考慮した最小） */
function pairMixedCost(u: StrokeSet, r: StrokeSet, cfg: JudgeConfig): number {
  const wBox = cfg.boxCostWeight
  const wShape = 1 - wBox
  const refNormF = strokeFeatures(r.norm)
  const refBoxF = strokeFeatures(r.box)
  const evalOne = (normPts: Pt[], boxPts: Pt[]): number =>
    wShape * pairCost(pairMetrics(strokeFeatures(normPts), refNormF, cfg.dtwBand), cfg.weights) +
    wBox * pairCost(pairMetrics(strokeFeatures(boxPts), refBoxF, cfg.dtwBand), cfg.weights)

  let best = Math.min(
    evalOne(u.norm, u.box),
    evalOne([...u.norm].reverse(), [...u.box].reverse())
  )
  // O のような閉曲線は書き始めの位置が人によって違うため、開始位置を回して最小を取る
  if (isClosedLoop(r.norm) && isClosedLoop(u.norm)) {
    const n = u.norm.length
    for (let k = 1; k < 8; k++) {
      const off = Math.round((n * k) / 8)
      const normRot = rotated(u.norm, off)
      const boxRot = rotated(u.box, off)
      best = Math.min(
        best,
        evalOne(normRot, boxRot),
        evalOne([...normRot].reverse(), [...boxRot].reverse())
      )
    }
  }
  return best
}

/** ストローク列同士のマッチングコスト（Hungarian・PAD込み平均） */
function matchCost(userSets: StrokeSet[], refSets: StrokeSet[], cfg: JudgeConfig): number {
  const U = userSets.length
  const R = refSets.length
  const K = Math.max(U, R)
  const matrix: number[][] = []
  for (let u = 0; u < K; u++) {
    const row: number[] = []
    for (let r = 0; r < K; r++) {
      if (u < U && r < R) row.push(pairMixedCost(userSets[u], refSets[r], cfg))
      else row.push(PAD_COST)
    }
    matrix.push(row)
  }
  const assignment = hungarian(matrix)
  let total = 0
  for (let u = 0; u < K; u++) {
    const r = assignment[u]
    if (u < U && r >= 0 && r < R) total += matrix[u][r]
    else total += PAD_COST
  }
  return total / K
}

/**
 * 連結バリアント1回あたりのコスト加算。
 * 続け書きは正当な書き方として認めつつ、画数どおりの別文字（例: Bを書いたのに
 * E(4画連結)扱い）にすり替わるのを防ぐための小さなハンデ。
 */
const JOIN_PENALTY = 0.05

/** 1候補文字との混合平均コスト（続け書き・分け書きのバリアント込み） */
function costAgainst(ink: PreparedInk, letter: string, cfg: JudgeConfig): LetterCandidate {
  const ref = getRefLetter(letter, cfg.resampleN)
  const refSets: StrokeSet[] = ref.strokes.map((rs) => ({ norm: rs.norm, box: rs.box }))
  const userSets = ink.sets
  const diff = Math.abs(userSets.length - refSets.length)

  // 基本: そのままの画数で照合（画数差はペナルティ）
  let best = matchCost(userSets, refSets, cfg) + diff * cfg.strokeCountPenalty
  let viaVariant = false

  // ユーザーの画数が少ない（続け書き）→ お手本側を連結して照合
  for (const variant of mergeVariants(refSets, userSets.length, cfg.resampleN)) {
    const c = matchCost(userSets, variant.sets, cfg) + variant.joins * JOIN_PENALTY
    if (c < best) {
      best = c
      viaVariant = true
    }
  }
  // ユーザーの画数が多い（分け書き）→ ユーザー側を連結して照合
  for (const variant of mergeVariants(userSets, refSets.length, cfg.resampleN)) {
    const c = matchCost(variant.sets, refSets, cfg) + variant.joins * JOIN_PENALTY
    if (c < best) {
      best = c
      viaVariant = true
    }
  }

  return { letter, cost: best, countMatch: diff === 0 || viaVariant, viaVariant }
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
  if (ink.sets.length === 0) return { ranking: [], userCount: 0, droppedTinyStrokes: ink.dropped }
  const ranking = cands
    .map((c) => costAgainst(ink, c, cfg))
    .sort((a, b) => a.cost - b.cost)
  return { ranking, userCount: ink.sets.length, droppedTinyStrokes: ink.dropped }
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

  // 明らかに別の文字: 「画数どおりに書かれた別文字」が期待文字よりはっきり近く、
  // 期待文字自体も微妙なとき。連結バリアント経由でしか近づけない候補は
  // 別文字の証拠として弱いので使わない（続け書きの正字を誤って弾かないため）
  const bestSolid = res.ranking.find((c) => !c.viaVariant) ?? best
  const bestIsOther = !forms.has(bestSolid.letter)
  const clearlyDifferent =
    bestIsOther &&
    bestSolid.cost + cfg.distinctMargin < expectedCost &&
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
      } satisfies ExpectedLetterJudge)
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
