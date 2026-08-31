// 仲間キャラクターのパラメトリックSVG描画（完全オリジナル）。
// speciesId + stage をキーに描画するため、将来 <img> による本格イラストへ
// 差し替える場合もこのコンポーネントの中身を置き換えるだけでよい（仕様 §25）。
import type { ReactNode } from 'react'
import { getSpecies, type Look } from '../data/species'

// 段階が6つになったので線形に大きくすると枠(120x128)からはみ出す。頭打ちのある表にする（第31回）
const STAGE_RADIUS = [24, 28, 32, 34, 36, 38]
const SIL = '#4a4460'

function starPath(cx: number, cy: number, R: number, r: number): string {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 === 0 ? R : r
    d += (i === 0 ? 'M' : 'L') + (cx + rr * Math.cos(rad)).toFixed(1) + ',' + (cy + rr * Math.sin(rad)).toFixed(1)
  }
  return d + 'Z'
}

interface DrawCtx {
  c1: string
  c2: string
  cx: number
  cy: number
  R: number
  topY: number
  sil: boolean
}

function bodyShape(look: Look, d: DrawCtx): ReactNode {
  const { c1, cx, cy, R } = d
  switch (look.body) {
    case 'round':
      return <circle cx={cx} cy={cy} r={R} fill={c1} />
    case 'tall':
      return <ellipse cx={cx} cy={cy - 4} rx={R * 0.82} ry={R * 1.18} fill={c1} />
    case 'tear':
      return (
        <g fill={c1}>
          <circle cx={cx} cy={cy} r={R * 0.95} />
          <path d={`M${cx - R * 0.38},${cy - R * 0.72} L${cx},${cy - R * 1.55} L${cx + R * 0.38},${cy - R * 0.72} Z`} />
        </g>
      )
    case 'square':
      return <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} rx={R * 0.34} fill={c1} />
    case 'mountain':
      return (
        <path
          d={`M${cx - R * 1.18},${cy + R * 0.85} L${cx},${cy - R * 1.05} L${cx + R * 1.18},${cy + R * 0.85} Z`}
          fill={c1}
          stroke={c1}
          strokeWidth={10}
          strokeLinejoin="round"
        />
      )
    case 'star':
      return <path d={starPath(cx, cy, R * 1.25, R * 0.62)} fill={c1} stroke={c1} strokeWidth={6} strokeLinejoin="round" />
    case 'cloud':
      return (
        <g fill={c1}>
          <circle cx={cx - R * 0.68} cy={cy + R * 0.12} r={R * 0.62} />
          <circle cx={cx} cy={cy - R * 0.32} r={R * 0.78} />
          <circle cx={cx + R * 0.68} cy={cy + R * 0.12} r={R * 0.62} />
          <rect x={cx - R * 0.68} y={cy + R * 0.05} width={R * 1.36} height={R * 0.68} rx={R * 0.3} />
        </g>
      )
  }
}

function extraShapes(look: Look, d: DrawCtx, layer: 'back' | 'front'): ReactNode[] {
  const { c2, cx, cy, R, topY, sil } = d
  const out: ReactNode[] = []
  const gold = sil ? SIL : '#f2c33c'
  const goldDark = sil ? SIL : '#d9a520'
  const white = sil ? SIL : '#ffffff'
  for (const ex of look.extras) {
    const key = `${layer}-${ex}`
    if (layer === 'back') {
      if (ex === 'rays') {
        out.push(
          <g key={key} stroke={c2} strokeWidth={3.4} strokeLinecap="round">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (Math.PI / 4) * i
              const r1 = R + 5
              const r2 = R + 14
              return (
                <line
                  key={i}
                  x1={cx + r1 * Math.cos(a)}
                  y1={cy + r1 * Math.sin(a)}
                  x2={cx + r2 * Math.cos(a)}
                  y2={cy + r2 * Math.sin(a)}
                />
              )
            })}
          </g>
        )
      } else if (ex === 'wings') {
        out.push(
          <g key={key} fill={c2} opacity={0.95}>
            <ellipse cx={cx - R - 7} cy={cy - 6} rx={11} ry={5.5} transform={`rotate(24 ${cx - R - 7} ${cy - 6})`} />
            <ellipse cx={cx + R + 7} cy={cy - 6} rx={11} ry={5.5} transform={`rotate(-24 ${cx + R + 7} ${cy - 6})`} />
          </g>
        )
      } else if (ex === 'tail') {
        out.push(<circle key={key} cx={cx + R + 7} cy={cy + R * 0.45} r={7} fill={c2} />)
      } else if (ex === 'rainbow') {
        const cols = sil ? [SIL, SIL, SIL] : ['#e0645f', '#f2c33c', '#5a9bd8']
        out.push(
          <g key={key} fill="none" strokeWidth={3.2} strokeLinecap="round">
            {cols.map((c, i) => {
              const r = 22 - i * 5
              return <path key={i} d={`M${cx - r},${topY - 4} A${r},${r} 0 0 1 ${cx + r},${topY - 4}`} stroke={c} />
            })}
          </g>
        )
      } else if (ex === 'starHalo') {
        out.push(
          <g key={key} fill={gold}>
            <path d={starPath(cx - R - 6, topY + 4, 5, 2.4)} />
            <path d={starPath(cx + R + 6, topY + 2, 4.4, 2.1)} />
            <path d={starPath(cx, topY - 12, 5.6, 2.7)} />
          </g>
        )
      } else if (ex === 'crescent') {
        out.push(
          <g key={key}>
            <circle cx={cx + R * 0.72} cy={topY + 2} r={9} fill={c2} />
            {!sil && <circle cx={cx + R * 0.72 + 4.5} cy={topY} r={8} fill={look.c1} />}
          </g>
        )
      } else if (ex === 'aura') {
        // 高レベルの光のオーラ（第57回）。二重の輪でハッキリ「格が上がった」と分かるようにする
        out.push(
          <g key={key} fill="none">
            <circle cx={cx} cy={cy} r={R + 9} stroke={sil ? SIL : c2} strokeWidth={3} opacity={0.55} />
            <circle cx={cx} cy={cy} r={R + 15} stroke={sil ? SIL : c2} strokeWidth={1.8} opacity={0.32} />
          </g>
        )
      } else if (ex === 'orbit') {
        out.push(
          <g key={key}>
            <ellipse
              cx={cx}
              cy={cy}
              rx={R + 17}
              ry={(R + 17) * 0.36}
              fill="none"
              stroke={sil ? SIL : gold}
              strokeWidth={3}
              opacity={0.85}
              transform={`rotate(-18 ${cx} ${cy})`}
            />
            <circle cx={cx - R - 15} cy={cy + 5} r={3.6} fill={sil ? SIL : gold} />
            <circle cx={cx + R + 15} cy={cy - 5} r={3.2} fill={sil ? SIL : gold} />
          </g>
        )
      } else if (ex === 'bigWings') {
        out.push(
          <g key={key} fill={c2} opacity={0.95}>
            <path d={`M${cx - R + 2},${cy - 4} q-22,-16 -30,-2 q10,3 12,10 q-10,1 -13,8 q16,6 31,-4 Z`} />
            <path d={`M${cx + R - 2},${cy - 4} q22,-16 30,-2 q-10,3 -12,10 q10,1 13,8 q-16,6 -31,-4 Z`} />
          </g>
        )
      } else if (ex === 'cape') {
        // 体の後ろにマント。体より外へ大きくはみ出させないと、小さい表示では見えない
        out.push(
          <g key={key}>
            <path
              d={`M${cx - R * 0.7},${cy - R * 0.55} L${cx - R * 1.5},${cy + R * 1.2} L${cx + R * 1.5},${cy + R * 1.2} L${cx + R * 0.7},${cy - R * 0.55} Z`}
              fill={sil ? SIL : c2}
              stroke={sil ? SIL : look.c1}
              strokeWidth={2.4}
              strokeLinejoin="round"
              opacity={0.95}
            />
            <path
              d={`M${cx - R * 0.72},${cy - R * 0.55} q${R * 0.72},${R * 0.34} ${R * 1.44},0`}
              fill="none"
              stroke={sil ? SIL : look.c1}
              strokeWidth={5}
              strokeLinecap="round"
            />
          </g>
        )
      } else if (ex === 'mane') {
        out.push(
          <g key={key} fill={c2} opacity={0.95}>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (Math.PI * 2 * i) / 12
              return <circle key={i} cx={cx + (R + 5) * Math.cos(a)} cy={cy + (R + 5) * Math.sin(a)} r={6.5} />
            })}
          </g>
        )
      } else if (ex === 'flame') {
        out.push(
          <g key={key} fill={sil ? SIL : '#f4863a'} opacity={0.9}>
            <path d={`M${cx - R - 4},${cy + R * 0.5} q-3,-14 5,-20 q-2,10 6,14 q-2,8 -11,6 Z`} />
            <path d={`M${cx + R + 4},${cy + R * 0.5} q3,-14 -5,-20 q2,10 -6,14 q2,8 11,6 Z`} />
          </g>
        )
      } else if (ex === 'thunder') {
        out.push(
          <g key={key} fill={sil ? SIL : '#ffd23f'} stroke={sil ? SIL : '#e0a815'} strokeWidth={1}>
            <path d={`M${cx - R - 12},${cy - 14} l7,0 l-4,8 l6,0 l-11,15 l3,-11 l-6,0 Z`} />
            <path d={`M${cx + R + 5},${cy - 16} l7,0 l-4,8 l6,0 l-11,15 l3,-11 l-6,0 Z`} />
          </g>
        )
      }
    } else {
      if (ex === 'brushTuft') {
        out.push(
          <g key={key}>
            <path d={`M${cx - 7},${topY + 3} L${cx},${topY - 13} L${cx + 7},${topY + 3} Z`} fill={c2} />
            <circle cx={cx} cy={topY - 13} r={2.6} fill={sil ? SIL : '#3a3a44'} />
          </g>
        )
      } else if (ex === 'inkDrop') {
        out.push(
          <g key={key} fill={c2}>
            <circle cx={cx + R * 0.62} cy={topY + 6} r={4.4} />
            <path d={`M${cx + R * 0.62 - 2.6},${topY + 4} L${cx + R * 0.62},${topY - 4} L${cx + R * 0.62 + 2.6},${topY + 4} Z`} />
          </g>
        )
      } else if (ex === 'foldCorner') {
        out.push(
          <path
            key={key}
            d={`M${cx + R - 14},${cy - R + 1} L${cx + R - 1},${cy - R + 1} L${cx + R - 1},${cy - R + 14} Z`}
            fill={c2}
          />
        )
      } else if (ex === 'stripeBand') {
        out.push(<rect key={key} x={cx - R} y={cy + R * 0.3} width={R * 2} height={R * 0.42} fill={c2} opacity={0.9} />)
      } else if (ex === 'gridLines') {
        out.push(
          <g key={key} stroke={c2} strokeWidth={2} strokeDasharray="4 3" opacity={0.75}>
            <line x1={cx - R * 0.85} y1={cy} x2={cx + R * 0.85} y2={cy} />
            <line x1={cx} y1={cy - R * 0.85} x2={cx} y2={cy + R * 0.85} />
          </g>
        )
      } else if (ex === 'leaf') {
        out.push(
          <g key={key}>
            <line x1={cx + R * 0.3} y1={topY + 3} x2={cx + R * 0.42} y2={topY - 6} stroke={sil ? SIL : '#5b7d43'} strokeWidth={2} />
            <ellipse
              cx={cx + R * 0.52}
              cy={topY - 9}
              rx={7.5}
              ry={4}
              fill={c2}
              transform={`rotate(-28 ${cx + R * 0.52} ${topY - 9})`}
            />
          </g>
        )
      } else if (ex === 'branch') {
        out.push(
          <g key={key} stroke={c2} strokeWidth={3} strokeLinecap="round" fill="none">
            <path d={`M${cx - R * 0.45},${topY + 2} L${cx - R * 0.7},${topY - 10} L${cx - R * 0.95},${topY - 6}`} />
            <path d={`M${cx - R * 0.7},${topY - 10} L${cx - R * 0.55},${topY - 16}`} />
          </g>
        )
      } else if (ex === 'rockBumps') {
        out.push(
          <g key={key} fill={c2} opacity={0.8}>
            <circle cx={cx - R * 0.5} cy={cy - R * 0.45} r={4} />
            <circle cx={cx + R * 0.42} cy={cy - R * 0.2} r={3.2} />
            <circle cx={cx - R * 0.1} cy={cy + R * 0.5} r={3.6} />
          </g>
        )
      } else if (ex === 'snowCap') {
        out.push(<ellipse key={key} cx={cx} cy={topY + 4} rx={R * 0.78} ry={R * 0.32} fill={white} />)
      } else if (ex === 'horns') {
        out.push(
          <g key={key} fill={c2}>
            <path d={`M${cx - R * 0.5},${topY + 4} L${cx - R * 0.62},${topY - 9} L${cx - R * 0.28},${topY + 1} Z`} />
            <path d={`M${cx + R * 0.5},${topY + 4} L${cx + R * 0.62},${topY - 9} L${cx + R * 0.28},${topY + 1} Z`} />
          </g>
        )
      } else if (ex === 'crown') {
        out.push(
          <path
            key={key}
            d={`M${cx - 12},${topY - 2} L${cx - 12},${topY - 12} L${cx - 6},${topY - 6} L${cx},${topY - 15} L${cx + 6},${topY - 6} L${cx + 12},${topY - 12} L${cx + 12},${topY - 2} Z`}
            fill={gold}
            stroke={goldDark}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        )
      } else if (ex === 'scarf') {
        out.push(
          <g key={key} fill={c2}>
            <rect x={cx - R * 0.78} y={cy + R * 0.5} width={R * 1.56} height={7} rx={3.5} />
            <rect x={cx + R * 0.3} y={cy + R * 0.55} width={6} height={14} rx={3} />
          </g>
        )
      } else if (ex === 'sparkle') {
        const sp = (sx: number, sy: number, s: number) => (
          <path
            d={`M${sx},${sy - s} L${sx + s * 0.3},${sy - s * 0.3} L${sx + s},${sy} L${sx + s * 0.3},${sy + s * 0.3} L${sx},${sy + s} L${sx - s * 0.3},${sy + s * 0.3} L${sx - s},${sy} L${sx - s * 0.3},${sy - s * 0.3} Z`}
            fill={sil ? SIL : '#ffe9a8'}
            stroke={sil ? SIL : '#e8bd4a'}
            strokeWidth={0.8}
          />
        )
        out.push(
          <g key={key}>
            {sp(cx - R - 8, topY + 12, 5)}
            {sp(cx + R + 9, topY + 18, 4)}
          </g>
        )
      } else if (ex === 'windCheeks') {
        out.push(
          <g key={key} stroke={c2} strokeWidth={2.2} fill="none" strokeLinecap="round">
            <path d={`M${cx - R - 10},${cy} q6,-6 12,0 q-6,5 -10,2`} />
            <path d={`M${cx + R + 10},${cy} q-6,-6 -12,0 q6,5 10,2`} />
          </g>
        )
      } else if (ex === 'gem') {
        // ひたいの宝石。小さいが「特別なすがた」の目印としてよく効く（第57回）
        out.push(
          <g key={key}>
            <path
              d={`M${cx},${topY + 3} L${cx + 5},${topY + 9} L${cx},${topY + 16} L${cx - 5},${topY + 9} Z`}
              fill={sil ? SIL : '#6fe3ff'}
              stroke={sil ? SIL : '#2aa5c9'}
              strokeWidth={1.2}
            />
            {!sil && <path d={`M${cx - 1.6},${topY + 7} L${cx + 1},${topY + 9.5} L${cx - 1.6},${topY + 12} Z`} fill="#ffffff" opacity={0.8} />}
          </g>
        )
      }
    }
  }
  return out
}

function face(look: Look, d: DrawCtx): ReactNode {
  if (d.sil) return null
  const { cx, cy, R } = d
  const eyeY = cy - R * 0.16
  const dx = R * 0.42
  const ink = '#2b2b33'
  const eyes: ReactNode[] = []
  for (const side of [-1, 1]) {
    const ex = cx + side * dx
    const key = `eye${side}`
    switch (look.eyes) {
      case 'dot':
        eyes.push(<circle key={key} cx={ex} cy={eyeY} r={3.1} fill={ink} />)
        break
      case 'big':
        eyes.push(
          <g key={key}>
            <circle cx={ex} cy={eyeY} r={5.6} fill="#ffffff" />
            <circle cx={ex} cy={eyeY + 0.6} r={3} fill={ink} />
            <circle cx={ex + 1.2} cy={eyeY - 0.9} r={1.1} fill="#ffffff" />
          </g>
        )
        break
      case 'happy':
        eyes.push(
          <path key={key} d={`M${ex - 4},${eyeY + 1.5} Q${ex},${eyeY - 4} ${ex + 4},${eyeY + 1.5}`} fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
        )
        break
      case 'sleepy':
        eyes.push(
          <path key={key} d={`M${ex - 4},${eyeY - 0.5} Q${ex},${eyeY + 3} ${ex + 4},${eyeY - 0.5}`} fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
        )
        break
      case 'star':
        eyes.push(<path key={key} d={starPath(ex, eyeY, 4.6, 2.2)} fill="#e8a020" />)
        break
    }
  }
  const mouthY = cy + R * 0.22
  let mouth: ReactNode
  switch (look.mouth) {
    case 'smile':
      mouth = <path d={`M${cx - 5},${mouthY} Q${cx},${mouthY + 4.5} ${cx + 5},${mouthY}`} fill="none" stroke={ink} strokeWidth={2.3} strokeLinecap="round" />
      break
    case 'open':
      mouth = <ellipse cx={cx} cy={mouthY + 1.5} rx={4} ry={4.8} fill="#8a4b46" />
      break
    case 'w':
      mouth = (
        <path
          d={`M${cx - 5.5},${mouthY} Q${cx - 2.7},${mouthY + 3.4} ${cx},${mouthY} Q${cx + 2.7},${mouthY + 3.4} ${cx + 5.5},${mouthY}`}
          fill="none"
          stroke={ink}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      )
      break
  }
  return (
    <g>
      {eyes}
      {mouth}
      {look.blush && (
        <g fill="#f2a08d" opacity={0.55}>
          <circle cx={cx - R * 0.62} cy={cy + R * 0.06} r={3.2} />
          <circle cx={cx + R * 0.62} cy={cy + R * 0.06} r={3.2} />
        </g>
      )}
    </g>
  )
}

export function CharacterSprite({
  speciesId,
  stage,
  size = 96,
  silhouette = false,
  className,
}: {
  speciesId: string
  stage: number
  size?: number
  silhouette?: boolean
  className?: string
}) {
  const species = getSpecies(speciesId)
  if (!species) return null
  const clamped = Math.min(Math.max(stage, 0), species.stages.length - 1)
  const look = species.stages[clamped].look
  const R = STAGE_RADIUS[Math.min(clamped, STAGE_RADIUS.length - 1)]
  const d: DrawCtx = {
    c1: silhouette ? SIL : look.c1,
    c2: silhouette ? SIL : look.c2,
    cx: 60,
    cy: 68,
    R,
    topY: 68 - R - (look.body === 'tall' ? 8 : look.body === 'tear' ? R * 0.55 : 0),
    sil: silhouette,
  }
  const lookForDraw: Look = { ...look }
  return (
    <svg viewBox="0 0 120 128" width={size} height={size * (128 / 120)} className={className} aria-hidden>
      {extraShapes(lookForDraw, d, 'back')}
      {bodyShape(lookForDraw, d)}
      {extraShapes(lookForDraw, d, 'front')}
      {face(lookForDraw, d)}
    </svg>
  )
}
