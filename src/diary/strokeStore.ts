// InkStroke（画面上の筆記）と StoredStroke（IndexedDB保存形式）の相互変換。
// 保存時は容量対策で点を間引く。復元時の筆圧は一定値になる（線の強弱は保存しない）。
import { resample } from '../core/geometry'
import type { InkStroke } from '../core/ink/types'
import type { StoredStroke } from '../storage/models'

export function toStored(s: InkStroke, maxPoints = 64): StoredStroke {
  const pts = s.points.map((p) => ({ x: p.x, y: p.y }))
  const sampled = pts.length > maxPoints ? resample(pts, maxPoints) : pts
  return {
    pointerType: s.pointerType,
    usedCoalesced: s.usedCoalesced,
    points: sampled.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10] as [number, number]),
    color: s.color,
    width: s.width,
    tool: s.tool,
  }
}

export function fromStored(s: StoredStroke, id: number, scale = 1): InkStroke {
  return {
    id,
    pointerType: s.pointerType,
    points: s.points.map(([x, y]) => ({ x: x * scale, y: y * scale, t: 0, p: 0.5, tiltX: 0, tiltY: 0 })),
    usedCoalesced: s.usedCoalesced,
    startedAt: 0,
    endedAt: 0,
    color: s.color,
    width: s.width,
    tool: s.tool,
  }
}
