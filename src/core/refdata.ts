// お手本ストローク（reference stroke）の読み込みと前処理。
// アルファベットのSVGパス（src/data/alphabet.ts）を点列化し、
// 判定用の特徴量を事前計算してキャッシュする。
import { ALPHABET, getAlphabetItem } from '../data/alphabet'
import { flattenPath } from './svgPath'
import {
  type Pt,
  type BBox,
  type CharTransform,
  applyCharTransform,
  bboxOf,
  centroidOf,
  chordAngle,
  makeCharTransform,
  polylineLength,
  resample,
} from './geometry'

/** お手本のviewBox一辺（英語罫線ボックス） */
export const REF_VIEWBOX = 100

export interface RefStroke {
  /** 何画目か（0始まり） */
  index: number
  /** SVG path (d属性)。表示・アニメーション用 */
  d: string
  /** flatten後の点列（viewBox100座標系・密） */
  raw: Pt[]
  /** resample後の点列（viewBox100座標系） */
  sampled: Pt[]
  /** box系（viewBox/100 → 0..1）の点列 */
  box: Pt[]
  /** 文字bbox正規化空間での点列 */
  norm: Pt[]
  normLen: number
  normStart: Pt
  normEnd: Pt
  normCentroid: Pt
  /** 始点→終点の弦の角度（書く方向） */
  normAngle: number
}

export interface RefLetter {
  letter: string
  strokeCount: number
  viewBox: number
  strokes: RefStroke[]
  bbox: BBox
  transform: CharTransform
  /** 縦横比（クランプ済み） */
  aspect: number
}

const cache = new Map<string, RefLetter>()

export function hasRefLetter(letter: string): boolean {
  return getAlphabetItem(letter) != null
}

export function listRefLetters(): string[] {
  return ALPHABET.map((a) => a.letter)
}

export function clampedAspect(bbox: BBox): number {
  const m = Math.max(bbox.w, bbox.h, 1e-6)
  const w = Math.max(bbox.w, m * 0.2)
  const h = Math.max(bbox.h, m * 0.2)
  return w / h
}

export function getRefLetter(letter: string, resampleN = 28): RefLetter {
  const key = `${letter}:${resampleN}`
  const hit = cache.get(key)
  if (hit) return hit

  const item = getAlphabetItem(letter)
  if (!item) throw new Error(`refdata: no stroke data for "${letter}"`)

  const raws = item.strokes.map((d) => flattenPath(d, 16))
  const bbox = bboxOf(raws)
  const transform = makeCharTransform(bbox)

  const strokes: RefStroke[] = item.strokes.map((d, index) => {
    const raw = raws[index]
    const sampled = resample(raw, resampleN)
    const box = sampled.map((p) => ({ x: p.x / REF_VIEWBOX, y: p.y / REF_VIEWBOX }))
    const norm = applyCharTransform(sampled, transform)
    return {
      index,
      d,
      raw,
      sampled,
      box,
      norm,
      normLen: polylineLength(norm),
      normStart: norm[0],
      normEnd: norm[norm.length - 1],
      normCentroid: centroidOf(norm),
      normAngle: chordAngle(norm),
    }
  })

  const ref: RefLetter = {
    letter,
    strokeCount: strokes.length,
    viewBox: REF_VIEWBOX,
    strokes,
    bbox,
    transform,
    aspect: clampedAspect(bbox),
  }
  cache.set(key, ref)
  return ref
}
