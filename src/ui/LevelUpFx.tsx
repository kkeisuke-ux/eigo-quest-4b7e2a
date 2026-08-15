// レベルアップ演出（第22回）。
// 進化ほど大きな変化ではないが、スターをあげた瞬間に「やった！」と感じられるように
// 光のバースト＋キャラのジャンプ＋星の紙ふぶき＋Lv表示で祝う。タップで閉じる。
import { useEffect, useMemo } from 'react'
import { playPerfect } from '../audio/sound'
import { CharacterSprite } from '../game/sprites'
import type { ExpGrantEvents } from '../game/logic'
import { setPendingLevelUp, useAppState } from '../state/store'
import { getSpecies } from '../data/species'

/** EXP付与イベントからレベルアップ演出をキューする（進化がある場合は進化モーダルに任せる） */
export function queueLevelUpFromEvents(ev: ExpGrantEvents | null | undefined, stage: number) {
  if (!ev || ev.levelsGained <= 0 || ev.evolvedTo) return
  const sp = getSpecies(ev.speciesId)
  setPendingLevelUp({
    speciesId: ev.speciesId,
    stage,
    fromLevel: ev.newLevel - ev.levelsGained,
    toLevel: ev.newLevel,
    name: sp?.stages[stage]?.name ?? '',
  })
}

const STAR_COLORS = ['#f7d154', '#f2a63c', '#7fd8a5', '#79b8f2', '#d99ae8']

export function LevelUpFx() {
  const pending = useAppState((s) => s.pendingLevelUp)

  useEffect(() => {
    if (pending) playPerfect()
  }, [pending])

  const stars = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 41 + 7) % 100,
        delay: ((i * 13) % 10) / 12,
        dur: 1.1 + ((i * 7) % 8) / 10,
        size: 14 + ((i * 5) % 3) * 6,
        color: STAR_COLORS[i % STAR_COLORS.length],
      })),
    [pending?.toLevel]
  )

  if (!pending) return null
  return (
    <div className="modal-back evo-back" onClick={() => setPendingLevelUp(null)}>
      <div className="lvlfx-panel" onClick={(e) => e.stopPropagation()}>
        {stars.map((st, i) => (
          <span
            key={i}
            className="lvlfx-star"
            style={{
              left: `${st.left}%`,
              animationDelay: `${st.delay}s`,
              animationDuration: `${st.dur}s`,
              fontSize: st.size,
              color: st.color,
            }}
          >
            ★
          </span>
        ))}
        <div className="lvlfx-burst" aria-hidden />
        <div className="lvlfx-sprite">
          <CharacterSprite speciesId={pending.speciesId} stage={pending.stage} size={150} />
        </div>
        <p className="lvlfx-title">レベルアップ！</p>
        <p className="lvlfx-level">
          {pending.name}　Lv.{pending.fromLevel} <span className="lvlfx-arrow">→</span> <b>Lv.{pending.toLevel}</b>
        </p>
        <button className="btn btn-accent btn-lg" onClick={() => setPendingLevelUp(null)}>
          やったー！
        </button>
      </div>
    </div>
  )
}
