// コイン獲得アニメーション: コインが弾け、枚数がカウントアップする（音つき）。
// テスト・練習の結果画面で「もらえた」ことがひと目で分かるようにする。
import { useEffect, useMemo, useState } from 'react'
import { playCoins } from '../audio/sound'
import { CoinIcon } from './components'

export interface CoinBreakdownItem {
  label: string
  value: number
}

export function CoinReward({ amount, breakdown }: { amount: number; breakdown?: CoinBreakdownItem[] }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (amount <= 0) return
    playCoins()
    const start = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(amount * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [amount])

  const burst = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        dx: ((i * 53) % 90) - 45,
        delay: (i % 4) * 0.09,
        size: 15 + ((i * 7) % 8),
      })),
    []
  )

  if (amount <= 0) return null

  return (
    <div className="coin-reward">
      <div className="coin-burst" aria-hidden>
        {burst.map((b, i) => (
          <span
            key={i}
            className="coin-fly"
            style={{ left: `calc(50% + ${b.dx}px)`, animationDelay: `${b.delay}s` }}
          >
            <CoinIcon size={b.size} />
          </span>
        ))}
      </div>
      <div className="coin-total">
        <CoinIcon size={30} />
        <span className="coin-total-num">+{shown}</span>
        <span className="coin-total-label">コイン ゲット！</span>
      </div>
      {breakdown && breakdown.filter((b) => b.value > 0).length > 1 && (
        <ul className="coin-breakdown">
          {breakdown
            .filter((b) => b.value > 0)
            .map((b, i) => (
              <li key={i}>
                {b.label}　+{b.value}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
