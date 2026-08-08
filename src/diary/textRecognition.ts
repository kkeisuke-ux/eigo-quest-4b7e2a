// 絵日記の手書き英文をテキスト化する（仕様 §29-§30）。
// 1行の自由筆記を、ストロークのx座標の重なりで文字クラスタへ分割し、
// クラスタごとに認識器（recognition/classify）へかける。
// 認識結果は本人が確認・修正できる前提の「下読み」であり、完全一致は狙わない
// （READMEの設計メモ参照）。
import { bboxOf, type Pt } from '../core/geometry'
import { classifyLetter } from '../recognition/classify'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { GUIDE_LINES } from '../data/alphabet'

interface Cluster {
  strokes: Pt[][]
  minX: number
  maxX: number
}

/** x範囲が重なるストロークをひとつの文字クラスタにまとめる */
function clusterStrokes(strokes: Pt[][]): Cluster[] {
  const items = strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      const b = bboxOf([s])
      return { stroke: s, minX: b.minX, maxX: b.maxX }
    })
    .sort((a, b) => a.minX - b.minX)

  const clusters: Cluster[] = []
  for (const it of items) {
    const last = clusters[clusters.length - 1]
    // 少しの重なり（または2px程度の接近）で同じ文字とみなす
    if (last && it.minX <= last.maxX - Math.max(2, (last.maxX - last.minX) * 0.12)) {
      last.strokes.push(it.stroke)
      last.maxX = Math.max(last.maxX, it.maxX)
      last.minX = Math.min(last.minX, it.minX)
    } else {
      clusters.push({ strokes: [it.stroke], minX: it.minX, maxX: it.maxX })
    }
  }
  return clusters
}

export interface RecognizedText {
  text: string
  /** クラスタごとの認識文字（デバッグ・確認表示用） */
  letters: string[]
}

/**
 * 行キャンバスの手書きストロークからテキストを推定する。
 * @param strokesPx 行キャンバス座標のストローク列
 * @param rowHeightPx 行キャンバスの高さ（4線ガイドの descender 線がおよそ下端）
 */
export function recognizeTextLine(strokesPx: Pt[][], rowHeightPx: number): RecognizedText {
  const cfg = getEffectiveJudgeConfig()
  const clusters = clusterStrokes(strokesPx)
  if (clusters.length === 0) return { text: '', letters: [] }

  // 行の高さ→viewBox100 のスケール（descender線=94 が行高の約94%にある想定）
  const scale = (GUIDE_LINES.descender / 94) * (100 / Math.max(rowHeightPx, 1))

  // 文字幅の中央値からスペース判定のしきい値を決める
  const widths = clusters.map((c) => c.maxX - c.minX).sort((a, b) => a - b)
  const medianW = widths[Math.floor(widths.length / 2)] || 20
  const spaceGap = Math.max(medianW * 0.55, 10)

  let text = ''
  const letters: string[] = []
  let prevMaxX: number | null = null

  for (const cluster of clusters) {
    if (prevMaxX != null && cluster.minX - prevMaxX > spaceGap) text += ' '
    prevMaxX = cluster.maxX

    // クラスタを仮想ボックス（viewBox100）へ射影: y は行そのまま、x は中心を50へ
    const b = bboxOf(cluster.strokes)
    const cx = (b.minX + b.maxX) / 2
    const projected = cluster.strokes.map((s) =>
      s.map((p) => ({ x: (p.x - cx) * scale + 50, y: p.y * scale }))
    )

    // ピリオド判定: ベースライン付近の小さな点
    const w = (b.maxX - b.minX) * scale
    const h = (b.maxY - b.minY) * scale
    const cyVb = ((b.minY + b.maxY) / 2) * scale
    if (w < 12 && h < 12 && cyVb > GUIDE_LINES.base - 12) {
      text += '.'
      letters.push('.')
      continue
    }

    const res = classifyLetter(
      projected.map((s) => s),
      100,
      cfg
    )
    const best = res.ranking[0]?.letter ?? '?'
    text += best
    letters.push(best)
  }

  return { text, letters }
}
