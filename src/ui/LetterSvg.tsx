// お手本アルファベットのSVG表示（仕様 §6）。
// - full: お手本全画（ゴースト・なぞり背景用）
// - upTo/current/showRest: 書き順なぞり練習用（確定画・現在画・残り画）
// - current の画には始点マーカー（緑の丸）と進行方向アニメーション（青い点）を表示
// - RuleLines: 英語罫線（4線）。InkCanvasのguideに敷く
import { useEffect, useMemo, useRef } from 'react'
import { getRefLetter, hasRefLetter } from '../core/refdata'
import { resample } from '../core/geometry'
import { GUIDE_LINES } from '../data/alphabet'

/** 英語罫線（4線ガイド）。基線(base)は濃く、中線(mid)は破線 */
export function RuleLines({ className }: { className?: string }) {
  const { top, mid, base, descender } = GUIDE_LINES
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <rect x="0.8" y="0.8" width="98.4" height="98.4" fill="none" stroke="#d8cfc0" strokeWidth="1.2" rx="3" />
      <line x1="3" y1={top} x2="97" y2={top} stroke="#cfd8e6" strokeWidth="0.9" />
      <line x1="3" y1={mid} x2="97" y2={mid} stroke="#cfd8e6" strokeWidth="0.9" strokeDasharray="3.2 2.6" />
      <line x1="3" y1={base} x2="97" y2={base} stroke="#9fb3d1" strokeWidth="1.3" />
      <line x1="3" y1={descender} x2="97" y2={descender} stroke="#e2e7f0" strokeWidth="0.8" />
    </svg>
  )
}

/** 複数行の英語罫線（絵日記の英文エリア用）。rows行ぶんの4線を等間隔に描く */
export function TextRuleLines({ rows, className }: { rows: number; className?: string }) {
  const { top, mid, base, descender } = GUIDE_LINES
  const band = 100 / rows
  const lines = Array.from({ length: rows }, (_, i) => {
    const y = (v: number) => i * band + (v / 100) * band
    return (
      <g key={i}>
        <line x1="1.5" y1={y(top)} x2="98.5" y2={y(top)} stroke="#cfd8e6" strokeWidth="0.5" />
        <line x1="1.5" y1={y(mid)} x2="98.5" y2={y(mid)} stroke="#cfd8e6" strokeWidth="0.5" strokeDasharray="1.6 1.4" />
        <line x1="1.5" y1={y(base)} x2="98.5" y2={y(base)} stroke="#9fb3d1" strokeWidth="0.7" />
        <line x1="1.5" y1={y(descender)} x2="98.5" y2={y(descender)} stroke="#eef1f6" strokeWidth="0.4" />
      </g>
    )
  })
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="#d8cfc0" strokeWidth="0.7" rx="2" />
      {lines}
    </svg>
  )
}

interface Props {
  letter: string
  className?: string
  upTo?: number
  current?: number
  showRest?: boolean
  full?: boolean
  numbers?: boolean
  color?: string
  ghostColor?: string
  restColor?: string
  strokeWidth?: number
  opacity?: number
}

export function LetterSvg({
  letter,
  className,
  upTo = 0,
  current,
  showRest = false,
  full = false,
  numbers = false,
  color = '#2c3a52',
  ghostColor = '#b9c6e8',
  restColor = '#e9edf5',
  strokeWidth = 6,
  opacity = 1,
}: Props) {
  const ref = useMemo(() => (hasRefLetter(letter) ? getRefLetter(letter) : null), [letter])
  const dotRef = useRef<SVGCircleElement | null>(null)

  useEffect(() => {
    if (!ref || full || current == null) return
    const rs = ref.strokes[current]
    if (!rs) return
    const pts = resample(rs.raw, 60)
    let raf = 0
    const startT = performance.now()
    const loop = (t: number) => {
      const period = 1500
      const elapsed = (((t - startT) % period) + period) % period
      const idx = Math.min(pts.length - 1, Math.max(0, Math.floor((elapsed / period) * pts.length)))
      const p = pts[idx]
      const dot = dotRef.current
      if (dot && p) {
        dot.setAttribute('cx', String(p.x))
        dot.setAttribute('cy', String(p.y))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ref, letter, current, full])

  if (!ref) return <div className={className}>?</div>
  const cur = !full && current != null ? ref.strokes[current] : null

  return (
    <svg className={className} viewBox="0 0 100 100" style={{ opacity }}>
      {ref.strokes.map((rs, i) => {
        let strokeColor: string | null = null
        if (full || i < upTo) strokeColor = color
        else if (i === current) strokeColor = ghostColor
        else if (showRest) strokeColor = restColor
        if (!strokeColor) return null
        return (
          <path
            key={i}
            d={rs.d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {cur && cur.raw.length > 0 && (
        <>
          <circle className="pulse-dot" cx={cur.raw[0].x} cy={cur.raw[0].y} r={4.8} fill="#43a047" />
          <circle ref={dotRef} cx={cur.raw[0].x} cy={cur.raw[0].y} r={2.9} fill="#1c9b7c" />
        </>
      )}
      {numbers &&
        ref.strokes.map((rs, i) => (
          <g key={`n${i}`}>
            <circle cx={rs.raw[0].x} cy={rs.raw[0].y} r={6} fill="#ffffff" opacity={0.88} />
            <text
              x={rs.raw[0].x}
              y={rs.raw[0].y + 2.6}
              textAnchor="middle"
              fontSize={7.5}
              fill="#c94f4f"
              fontWeight={700}
            >
              {i + 1}
            </text>
          </g>
        ))}
    </svg>
  )
}
