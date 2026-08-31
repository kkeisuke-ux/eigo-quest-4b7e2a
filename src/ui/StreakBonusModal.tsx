// れんぞくボーナスの受け取り演出（第32回）。
// これまでは「もう入っています」を知らせるだけで、押しても何も起きず、
// 本当にコインが入ったのか分からなかった。
// そこで、コインを足すのは「うけとる！」を押した瞬間にして、
// 手持ちの数字が ◯◯ → ◯◯ と目の前で増えるところを見せる。
import { useEffect, useRef, useState } from 'react'
import type { StreakBonus } from '../game/streak'
import { addCoins, getProfile } from '../storage/repo'
import { bumpData } from '../state/store'
import { playCoins } from '../audio/sound'
import { Button, CoinIcon, Modal } from './components'
import { CoinReward } from './CoinReward'

interface Props {
  profileId: string | null
  bonuses: StreakBonus[]
  onClose: () => void
}

export function StreakBonusModal({ profileId, bonuses, onClose }: Props) {
  const [claimed, setClaimed] = useState(false)
  const [before, setBefore] = useState(0)
  const [shown, setShown] = useState(0)
  const busy = useRef(false)
  const total = bonuses.reduce((a, b) => a + b.coins, 0)

  useEffect(() => {
    // 新しいボーナスが来たら受け取り前の状態に戻す
    setClaimed(false)
    setShown(0)
    busy.current = false
  }, [bonuses])

  // 手持ちコインを before → before+total まで数え上げる（増えたことが目で分かる）
  useEffect(() => {
    if (!claimed) return
    playCoins()
    const start = performance.now()
    const dur = 1100
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(before + total * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [claimed, before, total])

  const claim = async () => {
    if (busy.current || !profileId) return
    busy.current = true
    const profile = await getProfile(profileId)
    setBefore(profile?.coins ?? 0)
    for (const b of bonuses) await addCoins(profileId, b.coins, `${b.label}ボーナス`)
    setClaimed(true)
    bumpData()
  }

  return (
    <Modal open={bonuses.length > 0} onClose={claimed ? onClose : undefined}>
      <div className="streak-bonus-modal">
        <p className="streak-bonus-emoji">🎉</p>
        {bonuses.map((b, i) => (
          <p key={`${b.streak}-${i}`} className="streak-bonus-line">
            <span className="streak-bonus-label">{b.label}</span>
            <span className="streak-bonus-coins">＋{b.coins} コイン</span>
          </p>
        ))}

        {!claimed ? (
          <>
            <p className="streak-bonus-sub">よく つづけたね！ コインを うけとろう</p>
            <Button onClick={() => void claim()}>うけとる！</Button>
          </>
        ) : (
          <>
            <CoinReward amount={total} />
            <p className="streak-bonus-wallet">
              <CoinIcon size={26} />
              <span className="streak-bonus-wallet-num">{shown}</span>
              <span className="streak-bonus-wallet-label">コインに なった！</span>
            </p>
            <Button onClick={onClose}>やったー！</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
