// テスト実行の共通コンポーネント（5問テスト・まとめテスト・復習。仕様 §17-§24）。
// - 基本問題: 日本語 → Apple Pencilで英単語を書く。答えの単語は読み上げない（仕様 §17）
// - listen問題: 発音を聞いて書く（復習・発展。表示時に自動発音、聞き直し可。仕様 §18）
// - 不正解は やわらかいSEと「もういちど書いてみよう」→ その場で再挑戦（仕様 §20）
// - 「わからない」→ 復習対象に追加 → 答えを見てから次へ（仕様 §21-§22）
// - まとめテストは1問ごとに自動保存、途中再開可能（仕様 §25）
// - 全問正解は PERFECT! 演出（仕様 §24）
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { shuffled, type Pt } from '../core/geometry'
import type { InkStroke } from '../core/ink/types'
import { getWord } from '../data/words'
import { awardStudy, checkMilestones, type ExpGrantEvents } from '../game/logic'
import { playCorrect, playFinish, playPerfect, playWrong } from '../audio/sound'
import { speakWord } from '../audio/tts'
import { useAutoSpeak } from '../audio/useSpeech'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast, type Route } from '../state/store'
import {
  addActivity,
  addTestResult,
  addUnknownWord,
  applyWordOutcome,
  clearUnknownWord,
  deleteTestSession,
  getProfile,
  getTestSession,
  masteredWordCount,
  saveTestSession,
} from '../storage/repo'
import type { TestItemRecord, TestSessionRecord } from '../storage/models'
import type { WordJudgeResult } from '../recognition/classify'
import { BuddyCorner, type BuddyMood } from './BuddyCorner'
import { CHEER, ENCOURAGE, PRAISE, pickCheer } from './cheer'
import { WordCard } from './WordCard'
import { WordPad } from './WordPad'
import { saveSample } from './sampleUtil'
import { Button, LoadingView, TopBar } from '../ui/components'
import { PerfectCelebration } from '../ui/Celebration'
import { CoinReward, type CoinBreakdownItem } from '../ui/CoinReward'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'
import { JudgeMark } from '../ui/JudgeMark'
import { SpeakButton } from '../ui/SpeakButton'

export interface TestRunnerProps {
  kind: 'stage' | 'term' | 'review'
  targetId: string
  wordIds: string[]
  title: string
  backRoute: Route
  /** 「音を聞いて書く」問題を混ぜる割合 0..1（復習・発展用。仕様 §18） */
  listenRatio?: number
}

type Phase = 'init' | 'askResume' | 'running' | 'reveal' | 'done'
type QType = 'ja' | 'listen'

export function TestRunner({ kind, targetId, wordIds: baseIds, title, backRoute, listenRatio = 0 }: TestRunnerProps) {
  const profile = useProfile()
  const [phase, setPhase] = useState<Phase>('init')
  const [ids, setIds] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [items, setItems] = useState<TestItemRecord[]>([])
  const [qType, setQType] = useState<QType>('ja')
  const [wrong, setWrong] = useState<{ msg: string; marks: (boolean | null)[] | null } | null>(null)
  const [padLocked, setPadLocked] = useState(false)
  const [tries, setTries] = useState(0)
  const [retrySeq, setRetrySeq] = useState(0)
  const autoRetryRef = useRef<number | null>(null)

  const cancelAutoRetry = () => {
    if (autoRetryRef.current != null) {
      window.clearTimeout(autoRetryRef.current)
      autoRetryRef.current = null
    }
  }
  const [mark, setMark] = useState<'correct' | 'wrong' | null>(null)
  const [resultCoins, setResultCoins] = useState<{ amount: number; breakdown: CoinBreakdownItem[] } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const [buddyMsg, setBuddyMsg] = useState<string | undefined>(undefined)
  const [savedSession, setSavedSession] = useState<TestSessionRecord | null>(null)
  const [revealDoneOnce, setRevealDoneOnce] = useState(false)
  // 「こたえを見る」後のなぞりでも、×の文字だけ書き直せるようにする（第19回）
  const [revealWrong, setRevealWrong] = useState<{ msg: string; marks: (boolean | null)[] | null } | null>(null)
  const [revealRetrySeq, setRevealRetrySeq] = useState(0)
  const [revealLocked, setRevealLocked] = useState(false)
  const earnedRef = useRef(0)
  const itemsRef = useRef<TestItemRecord[]>([])
  const startMasteredRef = useRef<number | null>(null)
  const evoQueueRef = useRef<ExpGrantEvents[]>([])
  const busyRef = useRef(false)
  const moodTimerRef = useRef<number | null>(null)
  const testKey = `${kind}:${targetId}`

  const wordId = ids[index]
  const word = wordId ? getWord(wordId) : undefined

  const setItemsBoth = (v: TestItemRecord[]) => {
    itemsRef.current = v
    setItems(v)
  }

  // 途中セッションの確認（まとめテストのみ）。出題順はランダム化して開始
  useEffect(() => {
    if (!profile || phase !== 'init') return
    let alive = true
    void (async () => {
      startMasteredRef.current = await masteredWordCount(profile.id)
      if (kind === 'term') {
        const session = await getTestSession(profile.id, testKey)
        if (!alive) return
        if (session && session.currentIndex > 0 && session.currentIndex < session.wordIds.length) {
          setSavedSession(session)
          setPhase('askResume')
          return
        }
      }
      if (!alive) return
      setIds(shuffled(baseIds))
      setItemsBoth([])
      setIndex(0)
      setPhase('running')
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, phase])

  // 問題タイプの決定（listen問題は表示時に自動発音する）
  useEffect(() => {
    if (phase !== 'running') return
    setQType(listenRatio > 0 && Math.random() < listenRatio ? 'listen' : 'ja')
    cancelAutoRetry()
    setWrong(null)
    setPadLocked(false)
    setTries(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'running', index])

  useEffect(() => cancelAutoRetry, [])

  // 出題と同時に答えの単語を自動発音する（2026-08-08フィードバック:
  // 5問テスト・まとめテスト・復習とも、音とつづりを結びつけるため発音する）
  useAutoSpeak(phase === 'running' ? (word?.en ?? null) : null, 'word', `${index}-${qType}`)
  // reveal（答えを見る）画面では答えを発音する
  useAutoSpeak(phase === 'reveal' ? (word?.en ?? null) : null, 'word', `reveal-${index}`)

  useEffect(() => () => {
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
  }, [])

  if (!profile) return <LoadingView />

  const happyBuddy = (mood: BuddyMood = 'happy') => {
    setBuddyMood(mood)
    setBuddyMsg(pickCheer(PRAISE))
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
    moodTimerRef.current = window.setTimeout(() => {
      setBuddyMood('idle')
      setBuddyMsg(undefined)
    }, 2200)
  }

  const encourageBuddy = () => {
    setBuddyMsg(pickCheer(ENCOURAGE))
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
    moodTimerRef.current = window.setTimeout(() => setBuddyMsg(undefined), 2600)
  }

  const resume = (fromSaved: boolean) => {
    if (fromSaved && savedSession) {
      setIds(savedSession.wordIds)
      setItemsBoth(savedSession.items)
      setIndex(savedSession.currentIndex)
    } else {
      if (savedSession) void deleteTestSession(profile.id, testKey)
      setIds(shuffled(baseIds))
      setItemsBoth([])
      setIndex(0)
    }
    setPhase('running')
  }

  const persistSession = async (idsNow: string[], nextIndex: number, newItems: TestItemRecord[]) => {
    if (kind !== 'term') return
    await saveTestSession({
      profileId: profile.id,
      testKey,
      kind: 'term',
      targetId,
      wordIds: idsNow,
      currentIndex: nextIndex,
      items: newItems,
      startedAt: savedSession?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
    })
  }

  const perCorrectCoins =
    kind === 'stage'
      ? GAME_CONFIG.coins.stageTestPerCorrect
      : kind === 'term'
        ? GAME_CONFIG.coins.termTestPerCorrect
        : GAME_CONFIG.coins.reviewPerCorrect

  const finish = async (finalItems: TestItemRecord[]) => {
    const correct = finalItems.filter((i) => i.result === 'correct').length
    const perfect = finalItems.length > 0 && correct === finalItems.length
    if (kind !== 'review') {
      await addTestResult({
        profileId: profile.id,
        kind,
        targetId,
        at: Date.now(),
        total: finalItems.length,
        correct,
        items: finalItems,
      })
    }
    // かんそうボーナス（点数に関係なく「最後までできた」を肯定する。仕様 §23）
    const finishBonus = kind === 'term' ? GAME_CONFIG.coins.termTestFinishBonus : GAME_CONFIG.coins.stageTestFinishBonus
    await awardStudy(profile.id, finishBonus, 0, 'テストかんそう')
    earnedRef.current += finishBonus
    if (kind === 'term') {
      await deleteTestSession(profile.id, testKey)
      const msg = perfect
        ? `${profile.name}が ${title}で 100点を とりました！（${correct}/${finalItems.length}問）`
        : `${profile.name}が ${title}で さいこうきろくに ちょうせんしました（${correct}/${finalItems.length}問正解）`
      await addActivity(profile.id, profile.name, 'termTest', msg)
    }
    let perfectBonus = 0
    if (perfect && kind !== 'review') {
      perfectBonus = kind === 'term' ? GAME_CONFIG.coins.termTestPerfectBonus : GAME_CONFIG.coins.stageTestPerfectBonus
      const reward = await awardStudy(profile.id, perfectBonus, 0, 'ぜんもんせいかいボーナス')
      if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
      earnedRef.current += perfectBonus
    }
    setResultCoins({
      amount: earnedRef.current,
      breakdown: [
        { label: `せいかい ${correct}問`, value: perCorrectCoins * correct },
        { label: 'かんそうボーナス', value: finishBonus },
        { label: 'ぜんもんせいかいボーナス', value: perfectBonus },
      ],
    })
    const after = await masteredWordCount(profile.id)
    const fresh = await getProfile(profile.id)
    if (fresh && startMasteredRef.current != null) await checkMilestones(fresh, startMasteredRef.current, after)
    bumpData()
    setPhase('done')
    if (perfect) {
      setBuddyMood('celebrate')
      if (kind === 'term') {
        setShowCelebration(true) // playGrandはセレブレーション側で鳴る
      } else {
        playPerfect()
      }
    } else {
      playFinish()
    }
    const evo = evoQueueRef.current.find((e) => e.evolvedTo)
    if (evo) queueEvolutionFromEvents(evo)
  }

  const advance = (newItems: TestItemRecord[]) => {
    const nextIndex = index + 1
    if (nextIndex >= ids.length) void finish(newItems)
    else setIndex(nextIndex)
  }

  const finalizeCorrect = async (res: WordJudgeResult, allStrokes: InkStroke[], boxSize: number) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const item: TestItemRecord = {
        wordId,
        result: 'correct',
        recognized: res.recognized,
        retries: tries,
      }
      const newItems = [...itemsRef.current, item]
      setItemsBoth(newItems)
      cancelAutoRetry()
      setWrong(null)
      setMark('correct')
      playCorrect()
      happyBuddy()
      await saveSample(profile.id, word?.en ?? wordId, { verdict: 'correct', recognized: res.recognized, score: 100 }, allStrokes, boxSize, kind === 'review' ? 'review' : 'test')
      await applyWordOutcome(profile.id, wordId, 'correct', { context: kind === 'review' ? 'review' : 'test' })
      // テストでも復習でも、正解したら「わからなかった ことば」から自動削除（2026-08-08フィードバック）
      const removed = await clearUnknownWord(profile.id, wordId)
      if (removed) showToast(`「${word?.en}」が わからなかったことばから きえたよ！`)
      const reward = await awardStudy(profile.id, perCorrectCoins, GAME_CONFIG.exp.testCorrect, 'テストせいかい')
      earnedRef.current += perCorrectCoins
      if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
      await persistSession(ids, index + 1, newItems)
      bumpData()
      window.setTimeout(() => {
        setMark(null)
        busyRef.current = false
        advance(newItems)
      }, 1300)
    } catch (err) {
      busyRef.current = false
      throw err
    }
  }

  const handleJudged = (res: WordJudgeResult, _perBox: Pt[][][], allStrokes: InkStroke[], boxSize: number) => {
    if (mark === 'correct' || phase !== 'running') return
    if (res.correct) {
      void finalizeCorrect(res, allStrokes, boxSize)
    } else {
      // 不正解: 記録はまだ確定しない。×の表示を見せたあと、
      // 自動で×の文字だけ消して書き直しモードにする（2026-08-08 第6回: ボタン操作不要）
      playWrong()
      void saveSample(profile.id, word?.en ?? wordId, { verdict: 'wrong', recognized: res.recognized, score: 0 }, allStrokes, boxSize, kind === 'review' ? 'review' : 'test')
      const wrongCount = res.letters.filter((l) => !l.correct).length
      const msg = res.hasEmptyBox
        ? 'まだ かいていない マスがあるよ。つづきを かこう'
        : `おしい！ ×の ${wrongCount}もじを かきなおそう`
      setWrong({ msg, marks: res.letters.map((l) => l.correct) })
      encourageBuddy()
      setPadLocked(true)
      setTries((t) => t + 1)
      setMark('wrong')
      window.setTimeout(() => setMark(null), 900)
      cancelAutoRetry()
      autoRetryRef.current = window.setTimeout(() => {
        setWrong((w) => (w ? { ...w, marks: null } : w))
        setRetrySeq((s) => s + 1) // ×だった文字のボックスだけ消える
        setPadLocked(false)
        if (word) void speakWord(word.en) // やり直しのたびに発音する
      }, 1600)
    }
  }

  const markWrongOrUnknown = async (result: 'wrong' | 'unknown') => {
    if (busyRef.current) return
    busyRef.current = true
    cancelAutoRetry()
    setPadLocked(false)
    try {
      const item: TestItemRecord = { wordId, result, retries: tries }
      const newItems = [...itemsRef.current, item]
      setItemsBoth(newItems)
      await applyWordOutcome(profile.id, wordId, result, { context: kind === 'review' ? 'review' : 'test' })
      // 答えを見た・不正解のまま進んだ単語は「わからなかった単語」へ（どのテストかも記録。仕様 §22）
      await addUnknownWord(profile.id, wordId, result === 'unknown' ? 'unknown' : 'wrong', kind)
      await persistSession(ids, index + 1, newItems)
      bumpData()
      setWrong(null)
      setRevealDoneOnce(false)
      setRevealWrong(null)
      setRevealRetrySeq(0)
      setRevealLocked(false)
      setPhase('reveal') // 答えを見てから次へ（なぞりは任意。仕様 §21）
    } finally {
      busyRef.current = false
    }
  }

  const revealNext = () => {
    cancelAutoRetry()
    setRevealWrong(null)
    setPhase('running')
    advance(itemsRef.current)
  }

  const restartTest = async () => {
    if (kind === 'term') await deleteTestSession(profile.id, testKey)
    evoQueueRef.current = []
    earnedRef.current = 0
    setResultCoins(null)
    setShowCelebration(false)
    setIds(shuffled(baseIds))
    setItemsBoth([])
    setIndex(0)
    setWrong(null)
    setTries(0)
    setMark(null)
    setBuddyMood('idle')
    setPhase('running')
  }

  if (phase === 'init') return <LoadingView />

  if (phase === 'askResume') {
    return (
      <div className="screen">
        <TopBar title={title} back={backRoute} />
        <div className="center-panel">
          <div className="card resume-card">
            <p>
              とちゅうまで やった きろくが あるよ（{savedSession?.currentIndex ?? 0} / {savedSession?.wordIds.length ?? 0}問）
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
    const correct = items.filter((i) => i.result === 'correct').length
    const missed = items.filter((i) => i.result !== 'correct')
    const perfect = items.length > 0 && correct === items.length
    const rate = items.length > 0 ? Math.round((correct / items.length) * 100) : 0
    return (
      <div className="screen">
        {showCelebration && (
          <PerfectCelebration
            title={title}
            coins={resultCoins?.amount ?? 0}
            breakdown={resultCoins?.breakdown}
            onClose={() => setShowCelebration(false)}
          />
        )}
        <TopBar title={`${title} けっか`} back={backRoute} />
        <div className="result-wrap">
          <div className={`card result-main ${perfect ? 'result-perfect' : ''}`}>
            {perfect && (
              <div className="perfect-banner">
                🌟 PERFECT!　{correct} / {items.length}
              </div>
            )}
            <BuddyCorner mood={perfect ? 'celebrate' : 'idle'} size={100} message={perfect ? 'すごーい！' : 'さいごまで できたね！'} />
            <div className="result-score">
              {kind === 'review' ? 'ふくしゅう おわり！　' : ''}
              {items.length}問中 {correct}問 せいかい！
            </div>
            {kind === 'review' && <p className="termtest-status">ふくしゅうを がんばったから <b>コインを ゲット！</b></p>}
            <div className="result-rate">せいとうりつ {rate}%</div>
            {resultCoins && !(kind === 'term' && perfect && showCelebration) && (
              <CoinReward amount={resultCoins.amount} breakdown={resultCoins.breakdown} />
            )}
            {!perfect && kind !== 'review' && (
              <p className="termtest-status">
                <b>ぜんもんせいかいまで あと{items.length - correct}問！</b> もういちど ちょうせんしてみよう
              </p>
            )}
            <div className="result-chips">
              {items.map((i, n) => {
                const w = getWord(i.wordId)
                return (
                  <span key={n} className={`word-chip ${i.result === 'correct' ? 'chip-mastered' : 'chip-unknown'}`}>
                    {w?.en ?? i.wordId}
                  </span>
                )
              })}
            </div>
          </div>
          {missed.length > 0 && (
            <div className="card">
              <h3>わからなかった ことばに いれたよ（ふくしゅうで せいかいすると きえる）</h3>
              <div className="result-chips">
                {missed.map((i, n) => {
                  const w = getWord(i.wordId)
                  return (
                    <span key={n} className="word-chip chip-unknown">
                      {w?.en ?? i.wordId}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          <div className="result-actions">
            {perfect ? (
              <Button size="lg" variant="accent" onClick={() => navigate(kind === 'stage' ? { name: 'stages' } : { name: 'home' })}>
                つぎへ！
              </Button>
            ) : (
              <Button size="lg" variant="accent" onClick={() => void restartTest()}>
                もういちど ちょうせん！
              </Button>
            )}
            <div className="row gap wrap">
              {missed.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'review', mode: 'unknown' })}>
                  まちがえた ことばを ふくしゅう
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => navigate(backRoute)}>
                もどる
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'reveal') {
    return (
      <div className="screen">
        <TopBar title={`${title}　${index + 1} / ${ids.length}`} back={backRoute} />
        <div className="step-banner">こたえは「{word?.en}」。なぞって おぼえてから つぎへ すすもう</div>
        <div className="split">
          <div className="split-left">
            <WordCard wordId={wordId} showEn showJa showIllustration showSpeak big />
            {revealWrong && (
              <div className="feedback fb-wrong">
                <p className="feedback-soft">{revealWrong.msg}</p>
              </div>
            )}
            <BuddyCorner mood="idle" message="いっしょに おぼえよう" />
            <div className="row gap">
              <Button variant="secondary" onClick={revealNext}>
                {revealDoneOnce ? 'つぎへ！' : 'なぞらずに つぎへ'}
              </Button>
            </div>
          </div>
          <div className="split-right">
            <WordPad
              word={word?.en ?? ''}
              ghost
              caseInsensitive
              resetKey={`reveal-${index}`}
              retryToken={revealRetrySeq}
              perLetterMarks={revealWrong?.marks ?? null}
              disabled={revealDoneOnce || revealLocked}
              onJudged={(res) => {
                if (res.correct) {
                  playCorrect()
                  setRevealWrong(null)
                  setRevealDoneOnce(true)
                  window.setTimeout(revealNext, 950)
                } else {
                  // なぞりが認識されなかった時も×を見せて、×の文字だけ消して
                  // なぞりなおせるようにする（第19回。以前はエラー音だけ鳴って
                  // パッドがロックされ「なぞらずにつぎへ」しか押せなかった）
                  playWrong()
                  const wrongCount = res.letters.filter((l) => !l.correct).length
                  setRevealWrong({
                    msg: res.hasEmptyBox
                      ? 'まだ かいていない マスがあるよ。つづきを かこう'
                      : `おしい！ ×の ${wrongCount}もじを なぞりなおそう`,
                    marks: res.letters.map((l) => l.correct),
                  })
                  setRevealLocked(true)
                  cancelAutoRetry()
                  autoRetryRef.current = window.setTimeout(() => {
                    setRevealWrong((w) => (w ? { ...w, marks: null } : w))
                    setRevealRetrySeq((s) => s + 1) // ×だった文字のボックスだけ消える
                    setRevealLocked(false)
                    if (word) void speakWord(word.en)
                  }, 1600)
                }
              }}
              overlay={revealDoneOnce ? <JudgeMark kind="correct" /> : null}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar title={`${title}　${index + 1} / ${ids.length}`} back={backRoute} />
      <div className="split">
        <div className="split-left">
          {qType === 'ja' ? (
            <WordCard wordId={wordId} showEn={false} showJa showIllustration showSpeak big />
          ) : (
            <div className="card word-card word-card-big">
              <div className="word-card-listen">👂 きこえた ことばを かこう</div>
              {word && <SpeakButton text={word.en} kind="word" size="lg" label="もういちど きく" />}
            </div>
          )}
          {!wrong && (
            <p className="test-note">
              {qType === 'ja'
                ? 'おてほんなしで かいてみよう。せいかいするまで 何どでも かきなおせるよ。'
                : 'おとを よくきいて、きこえた たんごを かこう。'}
            </p>
          )}
          {wrong && (
            <div className="feedback fb-wrong">
              <p className="feedback-soft">{wrong.msg}</p>
              {tries >= 2 && (
                <div className="row gap">
                  <Button variant="secondary" onClick={() => void markWrongOrUnknown('wrong')}>
                    こたえを 見る
                  </Button>
                </div>
              )}
            </div>
          )}
          <BuddyCorner mood={buddyMood} message={buddyMsg ?? (index % 3 === 0 ? pickCheer(CHEER) : undefined)} />
        </div>
        <div className="split-right">
          <WordPad
            word={word?.en ?? ''}
            resetKey={`${targetId}-${index}`}
            retryToken={retrySeq}
            perLetterMarks={wrong?.marks ?? null}
            caseInsensitive
            onJudged={handleJudged}
            disabled={mark === 'correct' || padLocked}
            overlay={mark ? <JudgeMark kind={mark} /> : null}
            extraFooter={
              <Button variant="secondary" size="sm" onClick={() => void markWrongOrUnknown('unknown')} disabled={mark != null}>
                こたえを 見る
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
