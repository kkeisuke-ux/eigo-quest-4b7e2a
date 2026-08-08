// アルファベットなぞり練習（仕様 §6-§7）。
// - 文字が表示された瞬間に自動でアメリカ英語の文字名を発音（何度でも聞き直せる）
// - 1回目: ガイドつきなぞり（始点●・方向アニメ） → 2回目: うすいグレーだけでなぞり
// - 1文字終わるごとに進捗保存・コイン獲得。もどるでいつでも中断できる（進捗は残る）
import { useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { UPPERCASE, LOWERCASE } from '../data/alphabet'
import { awardStudy, type ExpGrantEvents } from '../game/logic'
import { playCorrect, playPerfect } from '../audio/sound'
import { useAutoSpeak } from '../audio/useSpeech'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, type AlphabetKind } from '../state/store'
import { addActivity, alphabetMasteryCounts, getAlphabetProgress, saveAlphabetProgress } from '../storage/repo'
import { TraceStep, type TraceMode } from '../learn/TraceStep'
import { BuddyCorner } from '../learn/BuddyCorner'
import { Button, LoadingView, TopBar } from '../ui/components'
import { CoinReward } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { SpeakButton } from '../ui/SpeakButton'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

const ROUNDS: TraceMode[] = ['guided', 'gray']

export function AlphabetLearn({ kind, startIndex = 0 }: { kind: AlphabetKind; startIndex?: number }) {
  const profile = useProfile()
  const items = kind === 'upper' ? UPPERCASE : LOWERCASE
  const [index, setIndex] = useState(Math.min(startIndex, items.length - 1))
  const [round, setRound] = useState(0)
  const [mark, setMark] = useState(false)
  const [doneAll, setDoneAll] = useState(false)
  const [earned, setEarned] = useState(0)

  const item = items[index]

  // 表示された瞬間に文字名を自動発音（仕様 §7）。ラウンドが変わっても同じ文字なら1回
  useAutoSpeak(profile && !doneAll ? item.audio.name : null, 'letter', `${index}`)

  if (!profile) return <LoadingView />

  const traceDone = async () => {
    setMark(true)
    playCorrect()
    const p = await getAlphabetProgress(profile.id, item.letter)
    p.traceDone++
    p.lastSeenAt = Date.now()
    const isLastRound = round + 1 >= ROUNDS.length
    if (isLastRound && p.practicedAt == null) p.practicedAt = Date.now()
    await saveAlphabetProgress(p)
    let evo: ExpGrantEvents | null = null
    if (isLastRound) {
      const reward = await awardStudy(profile.id, GAME_CONFIG.coins.alphabetTrace, GAME_CONFIG.exp.alphabet, 'アルファベットれんしゅう')
      setEarned((e) => e + GAME_CONFIG.coins.alphabetTrace)
      evo = reward.expEvents
    }
    bumpData()
    window.setTimeout(() => {
      setMark(false)
      if (!isLastRound) {
        setRound(round + 1)
        return
      }
      if (index + 1 < items.length) {
        setIndex(index + 1)
        setRound(0)
      } else {
        void (async () => {
          const counts = await alphabetMasteryCounts(profile.id)
          await addActivity(
            profile.id,
            profile.name,
            'alphabet',
            `${profile.name}が ${kind === 'upper' ? 'おおもじ' : 'こもじ'}の なぞりれんしゅうを さいごまで やりました`
          )
          void counts
        })()
        playPerfect()
        setDoneAll(true)
      }
      if (evo) queueEvolutionFromEvents(evo)
    }, 900)
  }

  if (doneAll) {
    return (
      <div className="screen">
        <TopBar title={kind === 'upper' ? 'おおもじ れんしゅう' : 'こもじ れんしゅう'} back={{ name: 'alphabet' }} />
        <div className="result-wrap">
          <div className="card result-main">
            <BuddyCorner mood="celebrate" size={110} message="26もじ ぜんぶ なぞれたね！" />
            <div className="result-score">{kind === 'upper' ? 'A〜Z' : 'a〜z'} かんりょう！</div>
            <CoinReward amount={earned} />
            <p className="termtest-status">
              つぎは <b>テスト</b>で じぶんのちからで かいてみよう！
            </p>
          </div>
          <div className="result-actions">
            <Button size="lg" variant="accent" onClick={() => navigate({ name: 'alphabetTest', kind })}>
              テストへ！
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'alphabet' })}>
              もどる
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar
        title={`${kind === 'upper' ? 'おおもじ' : 'こもじ'}　${index + 1} / ${items.length}`}
        back={{ name: 'alphabet' }}
      />
      <div className="step-banner">
        {round === 0 ? 'みどりの●から じゅんばんに なぞろう' : 'こんどは うすい字だけを 見て なぞろう'}
      </div>
      <div className="split">
        <div className="split-left">
          <div className="card letter-card">
            <div className="letter-card-letter">{item.letter}</div>
            <SpeakButton text={item.audio.name} kind="letter" size="lg" label="もういちど きく" />
          </div>
          <p className="hint-text">
            {round + 1}かいめ / {ROUNDS.length}かい
          </p>
          <BuddyCorner />
        </div>
        <div className="split-right">
          <TraceStep
            key={`${item.letter}-${round}`}
            letter={item.letter}
            mode={ROUNDS[round]}
            onDone={() => void traceDone()}
            overlay={mark ? <JudgeMark kind="correct" /> : null}
          />
        </div>
      </div>
    </div>
  )
}
