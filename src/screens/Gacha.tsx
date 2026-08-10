// なかまガチャ（仕様 §20, §21, §22）。
// 出会えないこともある。課金は一切ない。確率・コストは gameConfig で調整。
import { useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { rollGacha, type GachaOutcome } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast } from '../state/store'
import { Button, LoadingView, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

type Phase = 'idle' | 'shake' | 'silhouette' | 'reveal' | 'miss' | 'dup'

function Capsule({ shaking }: { shaking: boolean }) {
  return (
    <svg viewBox="0 0 120 120" width={170} className={shaking ? 'capsule capsule-shake' : 'capsule'} aria-hidden>
      <path d="M14,60 a46,46 0 0 1 92,0 Z" fill="#58b8ae" />
      <path d="M14,60 a46,46 0 0 0 92,0 Z" fill="#f3f0e8" />
      <rect x="12" y="56" width="96" height="8" rx="4" fill="#3f9387" />
      <circle cx="60" cy="38" r="12" fill="#ffffff" opacity="0.55" />
      <path d="M60,30 l2.6,5.4 5.9,0.8 -4.3,4.1 1,5.8 -5.2,-2.7 -5.2,2.7 1,-5.8 -4.3,-4.1 5.9,-0.8 z" fill="#ffffff" opacity="0.9" />
    </svg>
  )
}

export function Gacha() {
  const profile = useProfile()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<GachaOutcome | null>(null)
  const timersRef = useRef<number[]>([])

  if (!profile) return <LoadingView />
  const cost = GAME_CONFIG.gacha.gachaCost
  const busy = phase === 'shake' || phase === 'silhouette'

  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }

  const skip = () => {
    if (!result) return
    clearTimers()
    if (result.outcome === 'miss') setPhase('miss')
    else if (result.outcome === 'new') setPhase('reveal')
    else if (result.outcome === 'dup') setPhase('dup')
  }

  const roll = async () => {
    if (busy) return
    const res = await rollGacha(profile.id)
    bumpData()
    if (res.outcome === 'noCoins') {
      showToast('コインが たりないよ。べんきょうして ためよう！')
      return
    }
    setResult(res)
    setPhase('shake')
    clearTimers()
    timersRef.current.push(
      window.setTimeout(() => {
        if (res.outcome === 'miss') setPhase('miss')
        else if (res.outcome === 'new') {
          setPhase('silhouette')
          timersRef.current.push(window.setTimeout(() => setPhase('reveal'), 1100))
        } else if (res.outcome === 'dup') {
          setPhase('dup')
          queueEvolutionFromEvents(res.expEvents)
        }
      }, 1300)
    )
  }

  const again = (
    <div className="row gap">
      <Button onClick={() => void roll()} disabled={profile.coins < cost}>
        もういちど（{cost}コイン）
      </Button>
      <Button variant="secondary" onClick={() => navigate({ name: 'home' })}>
        もどる
      </Button>
    </div>
  )

  return (
    <div className="screen">
      <TopBar title="なかまガチャ" back={{ name: 'home' }} />
      <div className="gacha-stage" onClick={busy ? skip : undefined}>
        {phase === 'idle' && (
          <>
            <Capsule shaking={false} />
            <p className="gacha-note">なにが でるかは おたのしみ。なかまに であえないことも あるよ。</p>
            <Button size="lg" onClick={() => void roll()} disabled={profile.coins < cost}>
              ガチャを まわす（{cost}コイン）
            </Button>
            {profile.coins < cost && <p className="gacha-warn">コインが たりないよ。べんきょうして ためよう！</p>}
          </>
        )}
        {phase === 'shake' && (
          <>
            <Capsule shaking />
            <p className="gacha-note">ころころ ころころ……（タップで スキップ）</p>
          </>
        )}
        {phase === 'silhouette' && result?.outcome === 'new' && (
          <>
            <div className="gacha-sil">
              <CharacterSprite speciesId={result.speciesId} stage={0} size={170} silhouette />
            </div>
            <p className="gacha-note">…だれかが やってきた…？</p>
          </>
        )}
        {phase === 'reveal' && result?.outcome === 'new' && (
          <>
            <div className="gacha-pop">
              <CharacterSprite speciesId={result.speciesId} stage={0} size={180} />
            </div>
            <p className="gacha-big">{result.name}が なかまに なった！</p>
            {result.becameBuddy && <p className="gacha-note">これから いっしょに べんきょうするよ</p>}
            {again}
          </>
        )}
        {phase === 'miss' && (
          <>
            <div className="gacha-miss-mark">…</div>
            <p className="gacha-big gacha-big-miss">……こんかいは なかまに であえなかった</p>
            {again}
          </>
        )}
        {phase === 'dup' && result?.outcome === 'dup' && (
          <>
            <div className="gacha-pop">
              <CharacterSprite speciesId={result.speciesId} stage={result.stage} size={160} />
            </div>
            <p className="gacha-big">{result.name}が また あそびに きた！</p>
            <p className="gacha-note">なかよしEXP +{result.friendExp}</p>
            {again}
          </>
        )}
      </div>
    </div>
  )
}
