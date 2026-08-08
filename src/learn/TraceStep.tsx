// アルファベットのなぞり練習（仕様 §6 + 2026-08-08フィードバック反映）。
// 書き順ガイドは「見る」ためのもので、1画ずつの正誤判定はしない。
// 画数分書き終えたら文字全体の字形で判定し、読める形なら○（形があっていればよい）。
// モード:
//   guided : 書き順ガイドつき（つぎの画を薄く＋始点●＋方向アニメ）
//   numbers: 全画うすいグレー＋書き順の数字
//   gray   : 全画うすいグレーのみ
import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { InkCanvas, strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import { judgeExpectedLetter } from '../recognition/classify'
import { getRefLetter, hasRefLetter } from '../core/refdata'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { playStrokePop, playWrong } from '../audio/sound'
import { LetterSvg, RuleLines } from '../ui/LetterSvg'
import { Button } from '../ui/components'

export type TraceMode = 'guided' | 'numbers' | 'gray'

export function TraceStep({
  letter,
  mode = 'guided',
  onDone,
  overlay,
}: {
  letter: string
  mode?: TraceMode
  onDone: () => void
  overlay?: React.ReactNode
}) {
  const [strokeCount, setStrokeCount] = useState(0)
  const [hint, setHint] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const inkRef = useMemo<{ current: InkCanvasHandle | null }>(() => ({ current: null }), [])
  const doneRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const cancelTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    setStrokeCount(0)
    setHint(null)
    doneRef.current = false
    inkRef.current?.clear()
    cancelTimer()
    return cancelTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter, mode])

  const available = hasRefLetter(letter)
  const ref = available ? getRefLetter(letter) : null

  if (!ref) return <div className="loading-view">「{letter}」のお手本データがありません</div>

  const judgeNow = () => {
    if (doneRef.current) return
    const ink = inkRef.current
    if (!ink) return
    const strokes = ink.getStrokes()
    if (strokes.length === 0) return
    cancelTimer()
    const res = judgeExpectedLetter(strokesToPts(strokes), ink.getSize(), letter, getEffectiveJudgeConfig())
    if (res.correct) {
      doneRef.current = true
      setHint(null)
      onDone()
    } else {
      playWrong()
      setHint('おしい！ うすい字に そって もういちど なぞってみよう')
      setShake(true)
      window.setTimeout(() => {
        inkRef.current?.clear()
        setStrokeCount(0)
        setShake(false)
      }, 500)
    }
  }

  const handleInkChange = (all: InkStroke[]) => {
    if (doneRef.current) return
    const n = all.length
    setStrokeCount(n)
    cancelTimer()
    if (n === 0) return
    if (n < ref.strokeCount) {
      playStrokePop()
      return
    }
    // 画数分そろったら少し待って字形判定（書き順・向きは問わない）
    timerRef.current = window.setTimeout(judgeNow, 500)
  }

  const currentStroke = Math.min(strokeCount, ref.strokeCount - 1)

  const guide = (
    <>
      <RuleLines className="rule-svg" />
      {mode === 'guided' ? (
        <LetterSvg
          letter={letter}
          upTo={currentStroke}
          current={currentStroke}
          showRest
          className="guide-svg"
        />
      ) : (
        <LetterSvg
          letter={letter}
          upTo={0}
          showRest
          restColor="#ccd4e2"
          numbers={mode === 'numbers'}
          className="guide-svg"
        />
      )}
    </>
  )

  return (
    <div className={`trace-wrap ${shake ? 'shake' : ''}`}>
      <InkCanvas
        inkRef={inkRef}
        allowTouchInk={getAppFlags().allowTouchInk}
        onInkChange={handleInkChange}
        className="pad-box"
        guide={guide}
        overlay={overlay}
      />
      <div className="trace-status">
        <span className="trace-count">
          {Math.min(strokeCount + 1, ref.strokeCount)}かくめ / ぜんぶで{ref.strokeCount}かく
        </span>
        {hint && <span className="trace-hint">{hint}</span>}
        <span className="trace-actions">
          <Button variant="ghost" size="sm" onClick={() => { inkRef.current?.clear(); setStrokeCount(0); cancelTimer() }} disabled={strokeCount === 0}>
            かきなおす
          </Button>
          <Button variant="primary" size="sm" onClick={judgeNow} disabled={strokeCount === 0}>
            できた！
          </Button>
        </span>
      </div>
    </div>
  )
}
