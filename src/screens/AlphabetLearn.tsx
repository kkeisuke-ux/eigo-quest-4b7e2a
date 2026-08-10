// アルファベットなぞり練習（仕様 §6-§7 + 2026-08-08フィードバック反映）。
// - 文字が表示された瞬間に自動でアメリカ英語の文字名を発音（何度でも聞き直せる）
// - 1文字につき3ラウンド:
//     1かいめ: 書き順ガイドに沿って書く（ガイド表示。判定は字形のみ）
//     2かいめ: うすいグレーだけをなぞる
//     3かいめ: 自分で書く（ガイドなし・4線のみ）
// - ラウンドクリアごとに○＋正解音。1文字終わるごとに進捗保存・コイン獲得
import { useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { UPPERCASE, LOWERCASE } from '../data/alphabet'
import { awardStudy, type ExpGrantEvents } from '../game/logic'
import { playCorrect, playPerfect } from '../audio/sound'
import { useAutoSpeak } from '../audio/useSpeech'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, type AlphabetKind } from '../state/store'
import { addActivity, getAlphabetProgress, saveAlphabetProgress } from '../storage/repo'
import type { InkStroke } from '../core/ink/types'
import type { ExpectedLetterJudge } from '../recognition/classify'
import { TraceStep, type TraceMode } from '../learn/TraceStep'
import { LetterPad } from '../learn/LetterPad'
import { BuddyCorner } from '../learn/BuddyCorner'
import { playWrong } from '../audio/sound'
import { Button, LoadingView, TopBar } from '../ui/components'
import { CoinReward } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { SpeakButton } from '../ui/SpeakButton'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

type Round = TraceMode | 'free'

const ROUNDS: Round[] = ['guided', 'gray', 'free']

const ROUND_BANNERS: Record<Round, string> = {
  guided: 'かきじゅんガイドに そって かこう',
  numbers: 'すうじの じゅんばんに なぞろう',
  gray: 'うすい字だけを 見て なぞろう',
  free: 'こんどは じぶんの ちからで かいてみよう',
}

export function AlphabetLearn({
  kind,
  startIndex = 0,
  letters,
}: {
  kind: AlphabetKind
  startIndex?: number
  /** 指定時はこの文字だけを練習する（「にがてなもじだけ」モード） */
  letters?: string[]
}) {
  const profile = useProfile()
  const allItems = kind === 'upper' ? UPPERCASE : LOWERCASE
  const isSubset = !!letters && letters.length > 0
  const items = isSubset ? allItems.filter((i) => letters!.includes(i.letter)) : allItems
  const [index, setIndex] = useState(isSubset ? 0 : Math.min(startIndex, items.length - 1))
  const [round, setRound] = useState(0)
  const [tries, setTries] = useState(0)
  const [mark, setMark] = useState(false)
  const [freeMsg, setFreeMsg] = useState<string | null>(null)
  const [doneAll, setDoneAll] = useState(false)
  const [earned, setEarned] = useState(0)

  const item = items[index]

  // 表示された瞬間に文字名を自動発音（仕様 §7）。
  // 第14回: ラウンドが変わるたび・まちがえて書き直すたびにも毎回発音する
  // （keyにround/triesを含める。○表示中のmarkはfalseに戻った時点=次のラウンド開始）
  useAutoSpeak(profile && !doneAll ? item.audio.name : null, 'letter', `${index}-${round}-${tries}`)

  if (!profile) return <LoadingView />

  const roundDone = async () => {
    setMark(true)
    playCorrect()
    const isLastRound = round + 1 >= ROUNDS.length
    const p = await getAlphabetProgress(profile.id, item.letter)
    p.traceDone++
    p.lastSeenAt = Date.now()
    if (isLastRound) {
      p.writes++
      if (p.practicedAt == null) p.practicedAt = Date.now()
    }
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
      setFreeMsg(null)
      setTries(0)
      if (!isLastRound) {
        setRound(round + 1)
        return
      }
      if (index + 1 < items.length) {
        setIndex(index + 1)
        setRound(0)
      } else {
        void addActivity(
          profile.id,
          profile.name,
          'alphabet',
          `${profile.name}が ${kind === 'upper' ? 'おおもじ' : 'こもじ'}の なぞりれんしゅうを さいごまで やりました`
        )
        playPerfect()
        setDoneAll(true)
      }
      if (evo) queueEvolutionFromEvents(evo)
    }, 1000)
  }

  const handleFreeJudged = (j: ExpectedLetterJudge, _strokes: InkStroke[], _boxSize: number) => {
    if (j.correct) {
      void roundDone()
    } else {
      playWrong()
      setFreeMsg('おしい！ もういちど かいてみよう')
      setTries((t) => t + 1)
    }
  }

  if (doneAll) {
    return (
      <div className="screen">
        <TopBar title={kind === 'upper' ? 'おおもじ れんしゅう' : 'こもじ れんしゅう'} back={{ name: 'alphabet' }} />
        <div className="result-wrap">
          <div className="card result-main">
            <BuddyCorner
              mood="celebrate"
              size={110}
              message={isSubset ? `にがてな ${items.length}もじ かけたね！` : '26もじ ぜんぶ かけたね！'}
            />
            <div className="result-score">
              {isSubset ? `${items.map((i) => i.letter).join(' ')}` : kind === 'upper' ? 'A〜Z' : 'a〜z'} かんりょう！
            </div>
            <CoinReward amount={earned} />
            <p className="termtest-status">
              つぎは <b>テスト</b>で おとを きいて かいてみよう！
            </p>
          </div>
          <div className="result-actions">
            <Button
              size="lg"
              variant="accent"
              onClick={() => navigate({ name: 'alphabetTest', kind, letters: isSubset ? items.map((i) => i.letter) : undefined })}
            >
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

  const currentRound = ROUNDS[round]

  return (
    <div className="screen">
      <TopBar
        title={`${kind === 'upper' ? 'おおもじ' : 'こもじ'}${isSubset ? '（にがてなもじ）' : ''}　${index + 1} / ${items.length}`}
        back={{ name: 'alphabet' }}
      />
      <div className="step-banner">
        {round + 1}かいめ: {ROUND_BANNERS[currentRound]}
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
          {freeMsg && (
            <div className="feedback fb-wrong">
              <p className="feedback-soft">{freeMsg}</p>
              {tries >= 2 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRound(1)
                    setFreeMsg(null)
                    setTries(0)
                  }}
                >
                  なぞりに もどる
                </Button>
              )}
            </div>
          )}
          <BuddyCorner />
        </div>
        <div className="split-right">
          {currentRound === 'free' ? (
            <LetterPad
              letter={item.letter}
              resetKey={`${item.letter}-free-${tries}`}
              onJudged={handleFreeJudged}
              disabled={mark}
              overlay={mark ? <JudgeMark kind="correct" /> : null}
            />
          ) : (
            <TraceStep
              key={`${item.letter}-${round}`}
              letter={item.letter}
              mode={currentRound}
              onDone={() => void roundDone()}
              overlay={mark ? <JudgeMark kind="correct" /> : null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
