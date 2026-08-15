// お手本ストローク（reference stroke）の読み込みと前処理。
// アルファベットのSVGパス（src/data/alphabet.ts）を点列化し、
// 判定用の特徴量を事前計算してキャッシュする。
import { ALPHABET, ALT_STROKES, DATA_GUIDE_LINES, GUIDE_LINES, getAlphabetItem } from '../data/alphabet'
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

// ---------------- 4線リマップ（第20回: ガイドを等間隔化） ----------------
// ALPHABETの文字パスは旧4線（DATA_GUIDE_LINES）の座標系で描かれている。
// 表示・判定の4線（GUIDE_LINES）は等間隔なので、読み込み時にy座標を
// 「旧線の位置→新線の位置」へ区分線形で写像する（x座標はそのまま）。
// お手本表示・書き順アニメ・認識テンプレートのすべてがこの変換を通るため、
// ユーザーが新しい等間隔4線に沿って書いたものと一貫して比較できる。
const Y_SEGMENTS: [number, number, number, number][] = (() => {
  const oldY = [0, DATA_GUIDE_LINES.top, DATA_GUIDE_LINES.mid, DATA_GUIDE_LINES.base, DATA_GUIDE_LINES.descender, 100]
  const newY = [0, GUIDE_LINES.top, GUIDE_LINES.mid, GUIDE_LINES.base, GUIDE_LINES.descender, 100]
  return oldY.slice(0, -1).map((o0, i) => [o0, oldY[i + 1], newY[i], newY[i + 1]])
})()

function remapY(y: number): number {
  for (const [o0, o1, n0, n1] of Y_SEGMENTS) {
    if (y <= o1 || o1 === 100) {
      return o1 === o0 ? n0 : n0 + ((y - o0) / (o1 - o0)) * (n1 - n0)
    }
  }
  return y
}

function remapPts(pts: Pt[]): Pt[] {
  return pts.map((p) => ({ x: p.x, y: remapY(p.y) }))
}

/** リマップ済み点列からSVG path d を作り直す（flatten済みの密な折れ線なので見た目は滑らか） */
function ptsToPathD(pts: Pt[]): string {
  if (pts.length === 0) return ''
  const f = (v: number) => Math.round(v * 10) / 10
  return `M ${f(pts[0].x)} ${f(pts[0].y)}` + pts.slice(1).map((p) => ` L ${f(p.x)} ${f(p.y)}`).join('')
}

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
  const ref = buildRef(letter, item.strokes, resampleN)
  cache.set(key, ref)
  return ref
}

const variantCache = new Map<string, RefLetter[]>()

/**
 * その文字として認める字形の一覧（お手本＋別の書き方バリアント）。第26回。
 * 例: a を「丸を閉じて書く」「一筆で書く」も同じ a として照合する。
 */
export function getRefVariants(letter: string, resampleN = 28): RefLetter[] {
  const key = `${letter}:${resampleN}`
  const hit = variantCache.get(key)
  if (hit) return hit
  const alts = ALT_STROKES[letter] ?? []
  const list = [getRefLetter(letter, resampleN), ...alts.map((paths) => buildRef(letter, paths, resampleN))]
  variantCache.set(key, list)
  return list
}

/** その文字を書くのに要する最小画数（別の書き方を含む）。自動判定の待ち時間の判断に使う */
export function minRefStrokeCount(letter: string, resampleN = 28): number {
  return Math.min(...getRefVariants(letter, resampleN).map((r) => r.strokeCount))
}

function buildRef(letter: string, paths: string[], resampleN: number): RefLetter {
  const item = { strokes: paths }
  const raws = item.strokes.map((d) => remapPts(flattenPath(d, 16)))
  const bbox = bboxOf(raws)
  const transform = makeCharTransform(bbox)

  const strokes: RefStroke[] = item.strokes.map((_d, index) => {
    const raw = raws[index]
    const sampled = resample(raw, resampleN)
    const box = sampled.map((p) => ({ x: p.x / REF_VIEWBOX, y: p.y / REF_VIEWBOX }))
    const norm = applyCharTransform(sampled, transform)
    return {
      index,
      d: ptsToPathD(raw),
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
  return ref
}
