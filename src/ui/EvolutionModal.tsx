// 進化演出（仕様 §24）。現在の姿 → 光 → 新しい姿。タップでスキップ可能。
import { useEffect, useState } from 'react'
import { setPendingEvolution, useAppState, type PendingEvolution } from '../state/store'
import { CharacterSprite } from '../game/sprites'
import { Button } from './components'
import type { ExpGrantEvents } from '../game/logic'

export function queueEvolutionFromEvents(ev: ExpGrantEvents | null | undefined) {
  if (!ev || !ev.evolvedTo || ev.newStage == null) return
  setPendingEvolution({
    speciesId: ev.speciesId,
    fromStage: ev.newStage - 1,
    toStage: ev.newStage,
    fromName: ev.evolvedFrom ?? '',
    toName: ev.evolvedTo,
  })
}

export function EvolutionModal() {
  const pending = useAppState((s) => s.pendingEvolution)
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
            <Button onClick={() => setPendingEvolution(null)}>やったー！</Button>
          </div>
        )}
      </div>
    </div>
  )
}
