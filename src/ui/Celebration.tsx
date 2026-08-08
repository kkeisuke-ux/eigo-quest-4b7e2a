// まとめテスト100点の専用セレブレーション（仕様追加 2026-08-08）。
// 紙吹雪＋大きなバディ＋大ファンファーレ＋コイン獲得で、達成のうれしさを最大化する。
import { useEffect, useMemo } from 'react'
import { BuddyCorner } from '../learn/BuddyCorner'
import { playGrand } from '../audio/sound'
import { Button } from './components'
import { CoinReward, type CoinBreakdownItem } from './CoinReward'

const CONFETTI_COLORS = ['#e0645f', '#f2c33c', '#4a67d8', '#3f9d63', '#8a5bd6', '#f2a63c']

export function PerfectCelebration({
  title,
  coins,
  breakdown,
  onClose,
}: {
  title: string
  coins: number
  breakdown?: CoinBreakdownItem[]
  onClose: () => void
}) {
  useEffect(() => {
    playGrand()
  }, [])

  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        left: (i * 37 + 13) % 100,
        delay: ((i * 17) % 24) / 10,
        dur: 2.2 + ((i * 13) % 14) / 10,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 7 + (i % 3) * 3,
        h: 11 + ((i * 5) % 4) * 2,
        rot: (i * 47) % 360,
      })),
    []
  )

  return (
    <div className="celebration-back">
      <div className="confetti-layer" aria-hidden>
        {confetti.map((p, i) => (
          <span
            key={i}
            className="confetti"
            style={{
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebration-panel">
        <div className="celebration-100">
          <span className="celebration-crown">👑</span>
          100点!!
        </div>
        <p className="celebration-title">{title}</p>
        <BuddyCorner mood="celebrate" size={150} message="すごい！！ やったね！！" />
        <CoinReward amount={coins} breakdown={breakdown} />
        <Button size="lg" variant="accent" onClick={onClose}>
          やったー！ つぎへ！
        </Button>
      </div>
    </div>
  )
}
