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
  const [wrong, setWrong] = useState<{ recognized: string; hasEmpty: boolean; marks: (boolean | null)[] } | null>(null)
  const [tries, setTries] = useState(0)
  const [retrySeq, setRetrySeq] = useState(0)
  const [mark, setMark] = useState<'correct' | 'wrong' | null>(null)
  const [resultCoins, setResultCoins] = useState<{ amount: number; breakdown: CoinBreakdownItem[] } | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const [savedSession, setSavedSession] = useState<TestSessionRecord | null>(null)
  const [revealDoneOnce, setRevealDoneOnce] = useState(false)
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
    setWrong(null)
    setTries(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'running', index])

  // listen問題: 出題と同時に発音（仕様 §18）。ja問題は読み上げない（仕様 §17）
  useAutoSpeak(phase === 'running' && qType === 'listen' ? (word?.en ?? null) : null, 'word', `${index}`)
  // reveal（答えを見る）画面では答えを発音する
  useAutoSpeak(phase === 'reveal' ? (word?.en ?? null) : null, 'word', `reveal-${index}`)

  useEffect(() => () => {
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
  }, [])

  if (!profile) return <LoadingView />

  const happyBuddy = (mood: BuddyMood = 'happy') => {
    setBuddyMood(mood)
    if (moodTimerRef.current != null) window.clearTimeout(moodTimerRef.current)
    moodTimerRef.current = window.setTimeout(() => setBuddyMood('idle'), 1800)
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
      // 不正解: 記録はまだ確定せず、×の文字だけその場で書き直せる（仕様 §20 + 2026-08-08）
      playWrong()
      void saveSample(profile.id, word?.en ?? wordId, { verdict: 'wrong', recognized: res.recognized, score: 0 }, allStrokes, boxSize, kind === 'review' ? 'review' : 'test')
      setWrong({ recognized: res.recognized, hasEmpty: res.hasEmptyBox, marks: res.letters.map((l) => l.correct) })
      setTries((t) => t + 1)
      setMark('wrong')
      window.setTimeout(() => setMark(null), 900)
    }
  }

  const retryWrite = () => {
    setWrong(null)
    setRetrySeq((s) => s + 1) // ×だった文字のボックスだけ消えて再開する
  }

  const markWrongOrUnknown = async (result: 'wrong' | 'unknown') => {
    if (busyRef.current) return
    busyRef.current = true
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
      setPhase('reveal') // 答えを見てから次へ（なぞりは任意。仕様 §21）
    } finally {
      busyRef.current = false
    }
  }

  const revealNext = () => {
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
              {items.length}問中 {correct}問 せいかい！
            </div>
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
              resetKey={`reveal-${index}`}
              onJudged={(res) => {
                if (res.correct) {
                  playCorrect()
                  setRevealDoneOnce(true)
                  window.setTimeout(revealNext, 950)
                } else {
                  playWrong()
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
            <WordCard wordId={wordId} showEn={false} showJa showIllustration showSpeak={false} big />
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
              <p className="feedback-soft">
                {wrong.hasEmpty
                  ? 'まだ かいていない マスがあるよ。'
                  : `おしい！ ×の ${wrong.marks.filter((m) => m === false).length}もじだけ かきなおそう`}
              </p>
              <div className="row gap">
                <Button onClick={retryWrite}>かきなおす</Button>
                {tries >= 2 && (
                  <Button variant="secondary" onClick={() => void markWrongOrUnknown('wrong')}>
                    こたえを 見る
                  </Button>
                )}
              </div>
            </div>
          )}
          <BuddyCorner mood={buddyMood} />
        </div>
        <div className="split-right">
          <WordPad
            word={word?.en ?? ''}
            resetKey={`${targetId}-${index}`}
            retryToken={retrySeq}
            perLetterMarks={wrong?.marks ?? null}
            onJudged={handleJudged}
            disabled={mark === 'correct' || wrong != null}
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
