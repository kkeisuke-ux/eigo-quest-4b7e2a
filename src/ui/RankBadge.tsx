// 称号バッジの描画（2026-08-14 第36回）。
// パラメトリックSVGで30種を描き分ける（級=盾+数字、段=黒地に金文字、特別称号=固有色+冠/光）。
// 注意: components.tsx からも参照されるため、循環importを避けて components には依存しない
import { useEffect } from 'react'
import { RANKS, nextRank, rankForCount, type RankDef } from '../game/ranks'
import { playPerfect } from '../audio/sound'

/** 未達の特別称号用: 輪郭だけの「？」バッジ（第38回。どんな称号かはお楽しみ） */
export function MysteryBadge({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="？？？">
      <path
        d="M24 4 L42 10 L42 26 C42 36 34 42 24 46 C14 42 6 36 6 26 L6 10 Z"
        fill="none"
        stroke="#b8b0a0"
        strokeWidth="2.5"
        strokeDasharray="4 3"
      />
      <text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="900" fill="#b8b0a0">
        ？
      </text>
    </svg>
  )
}

/** 盾型バッジ1個のSVG */
export function RankBadge({ rank, size = 28, locked = false }: { rank: RankDef; size?: number; locked?: boolean }) {
  const uid = `rk-${rank.count}-${locked ? 'l' : 'a'}`
  const showRays = !locked && rank.decor?.includes('rays')
  const showCrown = rank.decor?.includes('crown')
  const showSparkle = !locked && rank.decor?.includes('sparkle')
  const color = locked ? '#c9ced6' : rank.color
  const edge = locked ? '#a8aeb8' : rank.edge
  const isDan = rank.tier === 'dan'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label={rank.label} style={locked ? { opacity: 0.55 } : undefined}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={edge} />
        </linearGradient>
      </defs>
      {showRays && (
        <g opacity="0.85">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return (
              <line
                key={i}
                x1={24 + Math.cos(a) * 15}
                y1={26 + Math.sin(a) * 15}
                x2={24 + Math.cos(a) * 23}
                y2={26 + Math.sin(a) * 23}
                stroke="#f2e04c"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )
          })}
        </g>
      )}
      {/* 盾 */}
      <path
        d="M24 4 L42 10 L42 26 C42 36 34 42 24 46 C14 42 6 36 6 26 L6 10 Z"
        fill={`url(#${uid})`}
        stroke={edge}
        strokeWidth="2.5"
      />
      {showCrown && (
        <path d="M15 6 L18 1 L22 5 L24 0 L26 5 L30 1 L33 6 Z" fill={locked ? '#a8aeb8' : '#f2c33c'} stroke={locked ? '#8a95a1' : '#cf9c1a'} strokeWidth="1" />
      )}
      {/* 中央の文字 */}
      <text
        x="24"
        y={rank.tier === 'kyu' ? 27 : 29}
        textAnchor="middle"
        fontSize={rank.tier === 'kyu' ? (rank.emblem.length >= 3 ? 12 : rank.emblem.length === 2 ? 15 : 18) : 20}
        fontWeight="900"
        fill={locked ? '#7c828c' : isDan ? '#f2c33c' : '#ffffff'}
        stroke={locked ? 'none' : 'rgba(0,0,0,0.25)'}
        strokeWidth="0.6"
        fontFamily="'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif"
      >
        {rank.emblem}
      </text>
      {rank.tier === 'kyu' && (
        <text x="24" y="38" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff" opacity="0.9">
          級
        </text>
      )}
      {isDan && (
        <text x="24" y="39" textAnchor="middle" fontSize="9" fontWeight="700" fill="#f2c33c" opacity="0.95">
          段
        </text>
      )}
      {showSparkle && (
        <g fill="#fffbe8">
          <circle cx="13" cy="14" r="1.6" />
          <circle cx="35" cy="12" r="1.2" />
          <circle cx="37" cy="24" r="1.4" />
        </g>
      )}
    </svg>
  )
}

/** 名前の横などに常時出す称号チップ（バッジ+称号名） */
export function RankChip({
  perfectCount,
  size = 22,
  onClick,
}: {
  perfectCount: number
  size?: number
  onClick?: () => void
}) {
  const rank = rankForCount(perfectCount)
  if (!rank) return null
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag className={`rank-chip rank-chip-${rank.tier}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <RankBadge rank={rank} size={size} />
      <span>{rank.label}</span>
    </Tag>
  )
}

/** 全30種のバッジ一覧（未達はシルエット）。次のランクまでの残りも表示 */
export function RankListModal({
  open,
  perfectCount,
  onClose,
}: {
  open: boolean
  perfectCount: number
  onClose: () => void
}) {
  const next = nextRank(perfectCount)
  // 十段より先（特別称号）は、とるまで名前もバッジもひみつ（ワクワク感のため）
  const nextHint = next == null ? '　さいこうの しょうごうだ！' : next.tier === 'grand' ? '　つぎの しょうごうは ひみつ…！ あと1つで わかるよ' : `　つぎの「${next.label}」まで あと1つ！`
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
      <div className="rank-list-head">
        <h2>しょうごう</h2>
        <p className="tile-sub">
          アルファベットテストの ごうかく（おおもじ・こもじ）と、まとめテストの 100点で しょうごうが 1つずつ あがるよ（いま {perfectCount}）{nextHint}
        </p>
      </div>
      <div className="rank-list">
        {RANKS.map((r) => {
          const got = perfectCount >= r.count
          const secret = !got && r.tier === 'grand'
          return (
            <div key={r.count} className={`rank-item ${got ? 'rank-item-got' : 'rank-item-locked'}`}>
              {secret ? <MysteryBadge size={44} /> : <RankBadge rank={r} size={44} locked={!got} />}
              <span className="rank-item-label">{secret ? '？？？' : r.label}</span>
              <span className="rank-item-cond">たっせい {r.count}</span>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

/** ランクアップ演出（まとめテストで新しい100点をとった直後） */
export function RankUpModal({ rank, onClose }: { rank: RankDef; onClose: () => void }) {
  useEffect(() => {
    playPerfect()
  }, [])
  return (
    <div className="modal-back evo-back" onClick={onClose}>
      <div className="modal-panel evo-panel rankup-panel" onClick={(e) => e.stopPropagation()}>
        <p className="evo-text">しょうごうが あがった！</p>
        <div className="rankup-badge">
          <RankBadge rank={rank} size={120} />
        </div>
        <p className="evo-text evo-text-big">「{rank.label}」に なった！</p>
        <button className="btn btn-primary btn-lg" onClick={onClose}>
          やったー！
        </button>
      </div>
    </div>
  )
}
