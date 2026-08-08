// コイン獲得のグローバル演出。コインが増えるたびに画面右上（コインバッジの下）へ
// 「🪙+N」がポンと出て、ふわっと上がって消える。どの画面でも共通で出る。
import { useAppState } from '../state/store'
import { CoinIcon } from './components'

export function CoinFx() {
  const items = useAppState((s) => s.coinFx)
  if (items.length === 0) return null
  return (
    <div className="coinfx-layer" aria-hidden>
      {items.map((c, i) => (
        <span key={c.id} className="coinfx-pop" style={{ animationDelay: `${(i % 3) * 0.06}s` }}>
          <CoinIcon size={22} />
          <b>+{c.amount}</b>
        </span>
      ))}
    </div>
  )
}
