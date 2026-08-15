// アルファベット1文字の自由筆記パッド（アルファベットテスト用。仕様 §8）。
// 書き順は問わず「最終的に文字として読めるか」だけを判定する。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { InkCanvas, strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import { judgeExpectedLetter, type ExpectedLetterJudge } from '../recognition/classify'
import { hasRefLetter, minRefStrokeCount } from '../core/refdata'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { Button } from '../ui/components'
import { RuleLines } from '../ui/LetterSvg'

export interface LetterPadProps {
  letter: string
  resetKey: string | number
  onJudged: (j: ExpectedLetterJudge, strokes: InkStroke[], boxSize: number) => void
  disabled?: boolean
  overlay?: ReactNode
  extraFooter?: ReactNode
}

export function LetterPad({ letter, resetKey, onJudged, disabled = false, overlay, extraFooter }: LetterPadProps) {
  const inkRef = useMemo<{ current: InkCanvasHandle | null }>(() => ({ current: null }), [])
  const [strokeCount, setStrokeCount] = useState(0)
  const [judged, setJudged] = useState(false)
  const judgedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const cfg = getEffectiveJudgeConfig()
  // 「書き終わったか」の判断は最小画数で見る（一筆で書く子を待たせないため。第26回）
  const refCount = hasRefLetter(letter) ? minRefStrokeCount(letter) : 1

  const cancelTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    inkRef.current?.clear()
    setJudged(false)
    judgedRef.current = false
    setStrokeCount(0)
    cancelTimer()
    return cancelTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, letter])

  const judgeNow = () => {
    if (judgedRef.current || disabled) return
    const ink = inkRef.current
    if (!ink) return
    // まだ書いている最中なら判定しない（少し待って再確認）
    if (ink.isWriting()) {
      cancelTimer()
      timerRef.current = window.setTimeout(judgeNow, 180)
      return
    }
    const strokes = ink.getStrokes()
    if (strokes.length === 0) return
    cancelTimer()
    judgedRef.current = true
    setJudged(true)
    const j = judgeExpectedLetter(strokesToPts(strokes), ink.getSize(), letter, cfg)
    onJudged(j, strokes, ink.getSize())
  }

  const handleInkChange = (all: InkStroke[]) => {
    setStrokeCount(all.length)
    cancelTimer()
    if (judgedRef.current || disabled || all.length === 0) return
    // お手本の画数に達したら短めに、足りないうち（続け書き途中など）はたっぷり待つ
    const delay = all.length >= refCount ? cfg.scoring.autoJudgeDelayMs : cfg.scoring.autoJudgeDelayMs * 3
    timerRef.current = window.setTimeout(judgeNow, delay)
  }

  return (
    <div className="writing-pad">
      <InkCanvas
        inkRef={inkRef}
        disabled={disabled || judged}
        allowTouchInk={getAppFlags().allowTouchInk}
        onStrokeStart={cancelTimer}
        onInkChange={handleInkChange}
        guide={<RuleLines className="rule-svg" />}
        overlay={overlay}
        className="pad-box"
      />
      <div className="pad-footer">
        <Button variant="ghost" size="sm" onClick={() => !judged && inkRef.current?.undo()} disabled={judged || strokeCount === 0}>
          １かくけす
        </Button>
        <Button variant="ghost" size="sm" onClick={() => !judged && inkRef.current?.clear()} disabled={judged || strokeCount === 0}>
          ぜんぶけす
        </Button>
        <Button variant="primary" size="sm" onClick={judgeNow} disabled={judged || disabled || strokeCount === 0}>
          できた！
        </Button>
        {extraFooter}
      </div>
    </div>
  )
}
