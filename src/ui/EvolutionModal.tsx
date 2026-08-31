// 進化演出（仕様 §24）。現在の姿 → 光 → 新しい姿。タップでスキップ可能。
import { useEffect, useState } from 'react'
import { pushEvolutions, shiftEvolution, useAppState, type PendingEvolution } from '../state/store'
import { getSpecies } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { Button } from './components'
import type { ExpGrantEvents } from '../game/logic'

/**
 * 進化演出を積む。まとめてスターをあげて何段も進化したときは、
 * 1段ずつ見せる（第31回）。まとめてやると変身が見られないのは、
 * 育てる いちばんの たのしみを 失うため。
 */
export function queueEvolutionFromEvents(ev: ExpGrantEvents | null | undefined) {
  if (!ev || !ev.evolvedTo || ev.newStage == null) return
  const sp = getSpecies(ev.speciesId)
  const stages = ev.stagesGained.length > 0 ? ev.stagesGained : [ev.newStage]
  pushEvolutions(
    stages.map((to) => ({
      speciesId: ev.speciesId,
      fromStage: to - 1,
      toStage: to,
      fromName: sp?.stages[to - 1]?.name ?? ev.evolvedFrom ?? '',
      toName: sp?.stages[to]?.name ?? ev.evolvedTo ?? '',
    }))
  )
}

export function EvolutionModal() {
  const queue = useAppState((s) => s.pendingEvolutions)
  const pending = queue[0] ?? null
  const [phase, setPhase] = useState<'before' | 'flash' | 'after'>('before')
  const [current, setCurrent] = useState<PendingEvolution | null>(null)

  useEffect(() => {
    if (!pending) {
      setCurrent(null)
      return
    }
    setCurrent(pending)
    setPhase('before')
    const t1 = window.setTimeout(() => setPhase('flash'), 1500)
    const t2 = window.setTimeout(() => setPhase('after'), 2400)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [pending])

  if (!current) return null

  const advance = () => {
    if (phase === 'before') setPhase('flash')
    else if (phase === 'flash') setPhase('after')
  }

  return (
    <div className="modal-back evo-back" onClick={advance}>
      <div className="modal-panel evo-panel" onClick={(e) => e.stopPropagation()}>
        {phase === 'before' && (
          <div className="evo-stage" onClick={advance}>
            <div className="evo-glow">
              <CharacterSprite speciesId={current.speciesId} stage={current.fromStage} size={150} />
            </div>
            <p className="evo-text">…おや？ {current.fromName}の ようすが…！</p>
          </div>
        )}
        {phase === 'flash' && (
          <div className="evo-stage" onClick={advance}>
            <div className="evo-flash" />
            <p className="evo-text">！！</p>
          </div>
        )}
        {phase === 'after' && (
          <div className="evo-stage">
            <div className="evo-pop">
              <CharacterSprite speciesId={current.speciesId} stage={current.toStage} size={170} />
            </div>
            <p className="evo-text evo-text-big">
              {current.fromName}は {current.toName}に しんかした！
            </p>
            <Button onClick={() => shiftEvolution()}>{queue.length > 1 ? `つぎへ（あと ${queue.length - 1}）` : 'やったー！'}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
