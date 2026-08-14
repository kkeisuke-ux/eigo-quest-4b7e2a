// アルファベットテスト（仕様 §8）。
// - 文字名の音声を聞いて、その文字を書く（26文字ランダム順）
// - 練習と違い書き順は教えず、「最終的に文字として読めるか」だけを判定する
// - 正解した文字は「習得済み」になり、プロフィールごとに 26文字中の習得数を保存
import { useEffect, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { shuffled } from '../core/geometry'
import type { InkStroke } from '../core/ink/types'
import { UPPERCASE, LOWERCASE } from '../data/alphabet'
import { awardStudy, type ExpGrantEvents } from '../game/logic'
import { playCorrect, playFinish, playPerfect, playWrong } from '../audio/sound'
import { useAutoSpeak } from '../audio/useSpeech'
import { useProfile, useRememberAlphabetKind } from '../state/hooks'
import { bumpData, navigate, type AlphabetKind } from '../state/store'
import {
  addActivity,
  addTestResult,
  alphabetMasteryCounts,
  deleteTestSession,
  getAlphabetProgress,
  getTestSession,
  saveAlphabetProgress,
  saveTestSession,
} from '../storage/repo'
import type { ExpectedLetterJudge } from '../recognition/classify'
import { LetterPad } from '../learn/LetterPad'
import { TraceStep } from '../learn/TraceStep'
import { BuddyCorner, type BuddyMood } from '../learn/BuddyCorner'
import { saveSample } from '../learn/sampleUtil'
import { Button, LoadingView, TopBar } from '../ui/components'
import { CoinReward } from '../ui/CoinReward'
import { JudgeMark } from '../ui/JudgeMark'
import { SpeakButton } from '../ui/SpeakButton'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

type Phase = 'init' | 'askResume' | 'running' | 'reveal' | 'done'

interface ItemResult {
  letter: string
  correct: boolean
}

export function AlphabetTest({ kind, letters }: { kind: AlphabetKind; letters?: string[] }) {
  const profile = useProfile()
  useRememberAlphabetKind(kind)
  const allItems = kind === 'upper' ? UPPERCASE : LOWERCASE
  const isSubset = !!letters && letters.length > 0
  const items = isSubset ? allItems.filter((i) => letters!.includes(i.letter)) : allItems
  const [order, setOrder] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('init')
  const [results, setResults] = useState<ItemResult[]>([])
  const [tries, setTries] = useState(0)
  const [mark, setMark] = useState<'correct' | 'wrong' | null>(null)
  const [revealMark, setRevealMark] = useState(false)
  const [buddyMood, setBuddyMood] = useState<BuddyMood>('idle')
  const [savedIndex, setSavedIndex] = useState(0)
  const earnedRef = useRef(0)
  const evoQueueRef = useRef<ExpGrantEvents[]>([])
  const busyRef = useRef(false)
  const testKey = `alphabet:${kind}${isSubset ? ':weak' : ''}`

  const letter = order[index]
  const audioName = letter?.toUpperCase() ?? null

  // 出題と同時に文字名を発音（見本は見せない）。何度でも聞き直せる。
  // 第15回: まちがえて書き直す前にも毎回発音する（keyにtriesを含める）
  useAutoSpeak(phase === 'running' || phase === 'reveal' ? audioName : null, 'letter', `${phase}-${index}-${tries}`)

  // 途中保存があれば「つづきから」を聞く（第15回: 途中で抜けても最初からにならない）
  useEffect(() => {
    if (!profile || phase !== 'init') return
    let alive = true
    void (async () => {
      const session = await getTestSession(profile.id, testKey)
      if (!alive) return
      if (session && session.currentIndex > 0 && session.currentIndex < session.wordIds.length) {
        setSavedIndex(session.currentIndex)
        setOrder(session.wordIds)
        setResults(session.items.map((it) => ({ letter: it.wordId, correct: it.result === 'correct' })))
        setPhase('askResume')
        return
      }
      setOrder(shuffled(items.map((i) => i.letter)))
      setPhase('running')
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, phase])

  useEffect(() => {
    setTries(0)
  }, [index])

  if (!profile || phase === 'init') return <LoadingView />

  const persistSession = async (orderNow: string[], nextIndex: number, newResults: ItemResult[]) => {
    await saveTestSession({
      profileId: profile.id,
      testKey,
      kind: 'alphabet',
      targetId: kind,
      wordIds: orderNow,
      currentIndex: nextIndex,
      items: newResults.map((r) => ({ wordId: r.letter, result: r.correct ? ('correct' as const) : ('wrong' as const) })),
      startedAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  const finish = async (finalResults: ItemResult[]) => {
    await deleteTestSession(profile.id, testKey)
    const correct = finalResults.filter((r) => r.correct).length
    const perfect = correct === finalResults.length
    await addTestResult({
      profileId: profile.id,
      kind: 'alphabet',
      targetId: kind,
      at: Date.now(),
      total: finalResults.length,
      correct,
      items: finalResults.map((r) => ({ wordId: r.letter, result: r.correct ? 'correct' : 'wrong' })),
    })
    const counts = await alphabetMasteryCounts(profile.id)
    const label = kind === 'upper' ? 'おおもじ' : 'こもじ'
    if ((kind === 'upper' && counts.upper === 26) || (kind === 'lower' && counts.lower === 26)) {
      await addActivity(profile.id, profile.name, 'alphabet', `${profile.name}が ${label}を 26もじ マスターしました！`)
    }
    bumpData()
    setPhase('done')
    if (perfect) playPerfect()
    else playFinish()
    const evo = evoQueueRef.current.find((e) => e.evolvedTo)
    if (evo) queueEvolutionFromEvents(evo)
  }

  const advance = (newResults: ItemResult[]) => {
    if (index + 1 >= order.length) void finish(newResults)
    else setIndex(index + 1)
  }

  const handleJudged = (j: ExpectedLetterJudge, strokes: InkStroke[], boxSize: number) => {
    if (busyRef.current || phase !== 'running') return
    void saveSample(
      profile.id,
      letter,
      { verdict: j.correct ? 'correct' : 'wrong', recognized: j.recognized ?? '?', score: j.correct ? 100 : 0 },
      strokes,
      boxSize,
      'test'
    )
    if (j.correct) {
      busyRef.current = true
      void (async () => {
        const p = await getAlphabetProgress(profile.id, letter)
        p.correct++
        p.lastSeenAt = Date.now()
        p.masteredAt = p.masteredAt ?? Date.now()
        await saveAlphabetProgress(p)
        const reward = await awardStudy(profile.id, GAME_CONFIG.coins.alphabetTestPerCorrect, GAME_CONFIG.exp.testCorrect, 'アルファベットテスト')
        earnedRef.current += GAME_CONFIG.coins.alphabetTestPerCorrect
        if (reward.expEvents) evoQueueRef.current.push(reward.expEvents)
        const newResults = [...results, { letter, correct: true }]
        setResults(newResults)
        await persistSession(order, index + 1, newResults)
        setMark('correct')
        playCorrect()
        setBuddyMood('happy')
        bumpData()
        window.setTimeout(() => {
          setMark(null)
          setBuddyMood('idle')
          busyRef.current = false
          advance(newResults)
        }, 1100)
      })()
    } else {
      playWrong()
      setMark('wrong')
      setTries((t) => t + 1)
      window.setTimeout(() => setMark(null), 900)
    }
  }

  const giveUp = async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const p = await getAlphabetProgress(profile.id, letter)
      p.wrong++
      p.lastSeenAt = Date.now()
      p.masteredAt = null
      await saveAlphabetProgress(p)
      const newResults = [...results, { letter, correct: false }]
      setResults(newResults)
      await persistSession(order, index + 1, newResults)
      bumpData()
      setPhase('reveal')
    } finally {
      busyRef.current = false
    }
  }

  const revealDone = () => {
    setRevealMark(true)
    playCorrect()
    window.setTimeout(() => {
      setRevealMark(false)
      setPhase('running')
      advance(results)
    }, 950)
  }

  if (phase === 'askResume') {
    return (
      <div className="screen">
        <TopBar title={`${kind === 'upper' ? 'おおもじ' : 'こもじ'}テスト`} back={{ name: 'alphabet' }} />
        <div className="center-panel">
          <div className="card resume-card">
            <p>
              とちゅうまで やった きろくが あるよ（{savedIndex} / {order.length}もじ）
            </p>
            <div className="row gap">
              <Button
                onClick={() => {
                  setIndex(savedIndex)
                  setPhase('running')
                }}
              >
                つづきから
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void deleteTestSession(profile.id, testKey)
                  setOrder(shuffled(items.map((i) => i.letter)))
                  setResults([])
                  setIndex(0)
                  setPhase('running')
                }}
              >
                さいしょから
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const correct = results.filter((r) => r.correct).length
    const missed = results.filter((r) => !r.correct)
    const perfect = correct === results.length
    const missedLetters = missed.map((r) => r.letter)
    return (
      <div className="screen">
        <TopBar
          title={`${kind === 'upper' ? 'おおもじ' : 'こもじ'}テスト${isSubset ? '（にがてなもじ）' : ''} けっか`}
          back={{ name: 'alphabet' }}
        />
        <div className="result-wrap">
          <div className={`card result-main ${perfect ? 'result-perfect' : ''}`}>
            {perfect && (
              <div className="perfect-banner">
                🌟 PERFECT!　{results.length} / {results.length}
              </div>
            )}
            <BuddyCorner mood={perfect ? 'celebrate' : 'idle'} size={100} message={perfect ? 'すごーい！' : 'さいごまで できたね！'} />
            <div className="result-score">
              {results.length}もじ中 {correct}もじ かけた！
            </div>
            <CoinReward amount={earnedRef.current} />
            <div className="result-chips">
              {results.map((r, i) => (
                <span key={i} className={`word-chip ${r.correct ? 'chip-mastered' : 'chip-unknown'}`}>
                  {r.letter}
                </span>
              ))}
            </div>
          </div>
          {missed.length > 0 && (
            <div className="card">
              <h3>もういちど れんしゅうすると いい もじ</h3>
              <div className="result-chips">
                {missed.map((r, i) => (
                  <span key={i} className="word-chip chip-unknown">
                    {r.letter}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="result-actions">
            <Button size="lg" variant="accent" onClick={() => navigate({ name: 'alphabet' })}>
              アルファベットへ もどる
            </Button>
            {missed.length > 0 && (
              <div className="row gap wrap">
                <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'alphabetLearn', kind, letters: missedLetters })}>
                  にがてな もじだけ れんしゅう
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'alphabetTest', kind, letters: missedLetters })}>
                  にがてな もじだけ テスト
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'reveal') {
    return (
      <div className="screen">
        <TopBar title={`テスト　${index + 1} / ${order.length}`} back={{ name: 'alphabet' }} />
        <div className="step-banner">こたえは「{letter}」。なぞって おぼえよう</div>
        <div className="split">
          <div className="split-left">
            <div className="card letter-card">
              <div className="letter-card-letter">{letter}</div>
              <SpeakButton text={audioName ?? ''} kind="letter" size="lg" label="もういちど きく" />
            </div>
            <BuddyCorner mood="idle" message="いっしょに おぼえよう" />
          </div>
          <div className="split-right">
            <TraceStep
              key={`reveal-${letter}`}
              letter={letter}
              mode="numbers"
              onDone={revealDone}
              overlay={revealMark ? <JudgeMark kind="correct" /> : null}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar
        title={`${kind === 'upper' ? 'おおもじ' : 'こもじ'}テスト${isSubset ? '（にがてなもじ）' : ''}　${index + 1} / ${order.length}`}
        back={{ name: 'alphabet' }}
      />
      <div className="split">
        <div className="split-left">
          <div className="card word-card word-card-big">
            <div className="word-card-listen">👂 きこえた {kind === 'upper' ? 'おおもじ' : 'こもじ'}を かこう</div>
            <SpeakButton text={audioName ?? ''} kind="letter" size="lg" label="もういちど きく" />
          </div>
          <p className="test-note">かきじゅんは じゆう。よめる字なら せいかいだよ。</p>
          <BuddyCorner mood={buddyMood} />
        </div>
        <div className="split-right">
          <LetterPad
            letter={letter}
            resetKey={`${index}-${tries}`}
            onJudged={handleJudged}
            disabled={mark === 'correct'}
            overlay={mark ? <JudgeMark kind={mark} /> : null}
            extraFooter={
              <Button variant="secondary" size="sm" onClick={() => void giveUp()} disabled={mark != null}>
                こたえを 見る
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
