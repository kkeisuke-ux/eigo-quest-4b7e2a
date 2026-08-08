// 筆記サンプルの保存（認識しきい値調整用）。
// 容量対策として1画32点に再サンプリングして保存する。
import { resample } from '../core/geometry'
import type { InkStroke } from '../core/ink/types'
import { addStrokeSample } from '../storage/repo'
import type { StrokeSampleRecord } from '../storage/models'

export async function saveSample(
  profileId: string,
  target: string,
  summary: { verdict: string; recognized: string; score: number },
  strokes: InkStroke[],
  boxSize: number,
  context: StrokeSampleRecord['context'],
  humanLabel: 'correct' | 'incorrect' | null = null
): Promise<number> {
  const stored = strokes.map((s) => ({
    pointerType: s.pointerType,
    usedCoalesced: s.usedCoalesced,
    points: resample(
      s.points.map((p) => ({ x: p.x, y: p.y })),
      32
    ).map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10] as [number, number]),
  }))
  return addStrokeSample({
    profileId,
    target,
    at: Date.now(),
    boxSize,
    strokes: stored,
    summary: {
      verdict: summary.verdict,
      recognized: summary.recognized,
      score: Math.round(summary.score * 1000) / 1000,
    },
    context,
    humanLabel,
  })
}
