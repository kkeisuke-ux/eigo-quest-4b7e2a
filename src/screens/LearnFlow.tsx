// 5語ステージの練習フロー（仕様 §13）。1単語につき:
//   STEP1 発音を聞きながら お手本をなぞる
//   STEP2 もう一度、発音を聞きながら お手本をなぞる
//   STEP3 お手本を見ながら 自分で書く
//   STEP4 日本語の意味だけを見て 自分で書く
// 途中保存（practiceSessions）で続きから再開できる。
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import type { InkStroke } from '../core/ink/types'
import type { Pt } from '../core/geometry'
import { getStageLocation, getWord } from '../data/words'
import { awardStudy, checkMilestones, type ExpGrantEvents } from '../game/logic'
import { playCorrect, playPerfect, playWrong } from '../audio/sound'
import { useAutoSpeak } from '../audio/useSpeech'
import { speakWord } from '../audio/tts'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast, type Route } from '../state/store'
import {
  addActivity,
  clearUnknownWord,
  deletePracticeSession,
  getPracticeSession,
  getWordProgress,
  masteredWordCount,
  getProfile,
  savePracticeSession,
  saveWordProgress,
} from '../storage/repo'
import type { WordJudgeResult } from '../recognition/classify'
import { BuddyCorner, type BuddyMood } from '../learn/BuddyCorner'
import { WordCard } from '../learn/WordCard'
import { WordPad } from '../learn/WordPad'
import { saveSample } from '../learn/sampleUtil'
import { Button, LoadingView, TopBar } from '../ui/components'
import { CoinReward, type CoinBreakdownItem } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

const STEP_LABELS = [
  'STEP1 きいて なぞろう（1かいめ）',
  'STEP2 きいて なぞろう（2かいめ）',
  'STEP3 おてほんを 見ながら かこう',
  'STEP4 日本語だけを 見て かこう',
]

type Phase = 'init' | 'askResume' | 'running' | 'done'

export function LearnFlow({ stageId }: { stageId: string }) {
  const profile = useProfile()
  const loc = getStageLocation(stageId)
  const [phase, setPhase] = useState<Phase>('init')
  const [wordIdx, setWordIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [tries, setTries] = useState(0)
  const [retrySeq, setRetrySeq] = useState(0)
  const [wrongMarks, setWrongMarks] = useState<(boolean | null)[] | null>(null)
  const [padLocked, setPadLocked] = useState(false)
  const [showModelHelp, setShowModelHelp] = useState(false)
  const [mark, setMark] = useState<'correct' | 'wrong' | null>(null)
  const [wrongMsg, setWrongMsg] = useState<string | null>(null)
  const autoRetryRef = useRef<number | null>(null)

  const cancelAutoRetry = () => {
    if (autoRetryRef.current != null) {
      window.clearTimeout(autoRetryRef.current)
      autoRetryRef.current = null
    }
  }
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const [resultCoins, setResultCoins] = useState<{ amount: number; breakdown: CoinBreakdownItem[] } | null>(null)
  const [saved, setSaved] = useState<{ wordIdx: number; step: number } | null>(null)
  const earnedRef = useRef({ trace: 0, copy: 0, recall: 0 })
  const evoQueueRef = useRef<ExpGrantEvents[]>([])
  const busyRef = useRef(false)
  const backRoute: Route = { name: 'stages' }

  const wordIds = loc?.stage.wordIds ?? []
  const wordId = wordIds[wordIdx]
  const word = wordId ? getWord(wordId) : undefined

  // 途中保存の確認
  useEffect(() => {
    if (!profile || phase !== 'init') return
    let alive = true
    void (async () => {
      const session = await getPracticeSession(profile.id, stageId)
      if (!alive) return
      if (session && (session.wordIdx > 0 || session.step > 0) && session.wordIdx < wordIds.length) {
        setSaved({ wordIdx: session.wordIdx, step: session.step })
        setPhase('askResume')
      } else {
        setPhase('running')
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, phase])

  // なぞり・見て書くステップでは表示と同時に自動発音（仕様 §12, §13）。
  // STEP4（思い出して書く）は自動発音しない
  const autoText = phase === 'running' && step <= 2 ? (word?.en ?? null) : null
  useAutoSpeak(autoText, 'word', `${wordIdx}-${step}`)

  if (!profile) return <LoadingView />
  if (!loc || !word) return <LoadingView label="ステージが見つかりません" />

  const persist = (nextWordIdx: number, nextStep: number) => {
    void savePracticeSession({
      profileId: profile.id,
      stageId,
      wordIdx: nextWordIdx,
      step: nextStep,
      updatedAt: Date.now(),
    })
  }

  const resume = (fromSaved: boolean) => {
    if (fromSaved && saved) {
      setWordIdx(Math.min(saved.wordIdx, wordIds.length - 1))
      setStep(Math.min(saved.step, 3))
    } else {
      void deletePracticeSession(profile.id, stageId)
      setWordIdx(0)
      setStep(0)
    }
    setPhase('running')
  }

  const grantStepReward = async (stepDone: number) => {
    let coins = 0
    let reason = ''
    if (stepDone <= 1) {
      coins = GAME_CONFIG.coins.wordTrace
      reason = 'なぞりれんしゅう'
      earnedRef.current.trace += coins
    } else if (stepDone === 2) {
      coins = GAME_CONFIG.coins.wordCopy
      reason = '見ながら かけた'
      earnedRef.current.copy += coins
    } else {
      coins = GAME_CONFIG.coins.wordRecall
      reason = 'おもいだして かけた'
      earnedRef.current.recall += coins
    }
    const reward = await awardStudy(profile.id, coins, GAME_CONFIG.exp.write, reason)
    if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
  }

  const updateProgress = async (stepDone: number) => {
    const p = await getWordProgress(profile.id, wordId)
    if (stepDone <= 1) p.traceDone++
    else if (stepDone === 2) p.copyDone++
    else p.recallDone++
    p.lastSeenAt = Date.now()
    if (stepDone === 3) p.practicedAt = Date.now()
    if (p.nextReviewAt == null) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      p.nextReviewAt = d.getTime() + 24 * 60 * 60 * 1000
    }
    await saveWordProgress(p)
  }

  const finishStage = async () => {
    const reward = await awardStudy(profile.id, GAME_CONFIG.coins.stageClearBonus, 0, 'ステージクリア')
    if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
    await deletePracticeSession(profile.id, stageId)
    await addActivity(profile.id, profile.name, 'stageClear', `${profile.name}が 「${loc.stage.label}」の 5語を れんしゅうしました`)
    const before = await masteredWordCount(profile.id)
    const fresh = await getProfile(profile.id)
    if (fresh) await checkMilestones(fresh, before, before)
    const e = earnedRef.current
    setResultCoins({
      amount: e.trace + e.copy + e.recall + GAME_CONFIG.coins.stageClearBonus,
      breakdown: [
        { label: 'なぞり', value: e.trace },
        { label: '見ながら かけた', value: e.copy },
        { label: 'おもいだして かけた', value: e.recall },
        { label: 'クリアボーナス', value: GAME_CONFIG.coins.stageClearBonus },
      ],
    })
    bumpData()
    playPerfect()
    setPhase('done')
    const evo = evoQueueRef.current.find((ev) => ev.evolvedTo)
    if (evo) queueEvolutionFromEvents(evo)
  }

  const advance = async (stepDone: number) => {
    await grantStepReward(stepDone)
    await updateProgress(stepDone)
    if (stepDone === 3) {
      // STEP4（日本語だけで書けた）まで練習できたら「わからなかった ことば」から卒業
      // （2026-08-08 第6回フィードバック）
      const removed = await clearUnknownWord(profile.id, wordId)
      if (removed) showToast(`「${word.en}」が わからなかったことばから きえたよ！`)
    }
    if (stepDone < 3) {
      const next = stepDone + 1
      setStep(next)
      persist(wordIdx, next)
    } else if (wordIdx + 1 < wordIds.length) {
      setWordIdx(wordIdx + 1)
      setStep(0)
      persist(wordIdx + 1, 0)
    } else {
      await finishStage()
      return
    }
    cancelAutoRetry()
    setTries(0)
    setShowModelHelp(false)
    setWrongMsg(null)
    setWrongMarks(null)
    setPadLocked(false)
  }

  const handleJudged = (res: WordJudgeResult, perBox: Pt[][][], allStrokes: InkStroke[], boxSize: number) => {
    if (busyRef.current || phase !== 'running') return
    void saveSample(
      profile.id,
      word.en,
      { verdict: res.correct ? 'correct' : 'wrong', recognized: res.recognized, score: res.correct ? 100 : 0 },
      allStrokes,
      boxSize,
      'practice'
    )
    if (res.correct) {
      busyRef.current = true
      cancelAutoRetry()
      setWrongMsg(null)
      setWrongMarks(null)
      setMark('correct')
      playCorrect()
      setBuddyMood('happy')
      window.setTimeout(() => {
        setMark(null)
        setBuddyMood('idle')
        busyRef.current = false
        void advance(step)
      }, 1100)
    } else {
      playWrong()
      setMark('wrong')
      // ×の表示を見せたあと、自動で×の文字だけ消して書き直しモードにする
      setWrongMarks(res.letters.map((l) => l.correct))
      const wrongCount = res.letters.filter((l) => !l.correct).length
      setWrongMsg(
        res.hasEmptyBox ? 'まだ かいていない マスがあるよ。つづきを かこう' : `おしい！ ×の ${wrongCount}もじを かきなおそう`
      )
      setPadLocked(true)
      setTries((t) => t + 1)
      window.setTimeout(() => setMark(null), 900)
      cancelAutoRetry()
      autoRetryRef.current = window.setTimeout(() => {
        setWrongMarks(null)
        setRetrySeq((s) => s + 1) // ×だった文字のボックスだけ消える
        setPadLocked(false)
        void speakWord(word.en) // やり直しのたびに発音する
      }, 1600)
    }
  }

  if (phase === 'init') return <LoadingView />

  if (phase === 'askResume') {
    return (
      <div className="screen">
        <TopBar title={loc.stage.label} back={backRoute} />
        <div className="center-panel">
          <div className="card resume-card">
            <p>
              とちゅうまで やった きろくが あるよ（{(saved?.wordIdx ?? 0) + 1}この めの STEP{(saved?.step ?? 0) + 1}）
            </p>
            <div className="row gap">
              <Button onClick={() => resume(true)}>つづきから</Button>
              <Button variant="secondary" onClick={() => resume(false)}>
                さいしょから
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="screen">
        <TopBar title={`${loc.stage.label} クリア！`} back={backRoute} />
        <div className="result-wrap">
          <div className="card result-main">
            <BuddyCorner mood="celebrate" size={110} message="5この ことば、れんしゅう できたね！" />
            <div className="result-score">
              {wordIds.map((id) => {
                const w = getWord(id)
                return (
                  <span key={id} className="word-chip chip-practiced">
                    {w?.en}
                  </span>
                )
              })}
            </div>
            {resultCoins && <CoinReward amount={resultCoins.amount} breakdown={resultCoins.breakdown} />}
            <p className="termtest-status">
              つぎは <b>5もんテスト</b>で おぼえたか たしかめよう！
            </p>
          </div>
          <div className="result-actions">
            <Button size="lg" variant="accent" onClick={() => navigate({ name: 'stageTest', stageId })}>
              5もんテストへ！
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(backRoute)}>
              ステージいちらんへ もどる
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isTrace = step <= 1 || showModelHelp
  const showEn = step <= 2 || showModelHelp

  return (
    <div className="screen">
      <TopBar title={`${loc.stage.label}　${wordIdx + 1} / ${wordIds.length}こめ`} back={backRoute} />
      <div className="step-banner">{STEP_LABELS[step]}</div>
      <div className="split">
        <div className="split-left">
          <WordCard
            wordId={wordId}
            showEn={showEn}
            showJa
            showIllustration
            showSpeak
            big
          />
          {wrongMsg && (
            <div className="feedback fb-wrong">
              <p className="feedback-soft">{wrongMsg}</p>
              {tries >= 2 && !showModelHelp && (
                <div className="row gap">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      cancelAutoRetry()
                      setShowModelHelp(true)
                      setWrongMsg(null)
                      setWrongMarks(null)
                      setPadLocked(false)
                      void speakWord(word.en)
                    }}
                  >
                    おてほんを 見る
                  </Button>
                </div>
              )}
            </div>
          )}
          <BuddyCorner mood={buddyMood} />
        </div>
        <div className="split-right">
          <WordPad
            word={word.en}
            ghost={isTrace}
            resetKey={`${stageId}-${wordIdx}-${step}-${showModelHelp ? 'help' : ''}`}
            retryToken={retrySeq}
            perLetterMarks={wrongMarks}
            onJudged={handleJudged}
            disabled={mark === 'correct' || padLocked}
            overlay={mark ? <JudgeMark kind={mark} /> : null}
          />
        </div>
      </div>
    </div>
  )
}
