// 単語筆記パッド: 1文字=1ボックスを単語の文字数分ならべて書く（仕様 §13, §16, §17）。
// - ghost=true でお手本の薄い文字を敷く（なぞり用）
// - 全ボックスに書けたら少し待って自動判定。「できた！」ボタンでいつでも判定
// - 判定は1文字ずつ認識→結合→単語比較（recognition/classify.ts）
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { InkCanvas, strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import type { Pt } from '../core/geometry'
import { judgeWord, type WordJudgeResult } from '../recognition/classify'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { Button } from '../ui/components'
import { LetterSvg, RuleLines } from '../ui/LetterSvg'

export interface WordPadProps {
  word: string
  /** お手本の薄い文字を敷く（なぞり練習用） */
  ghost?: boolean
  /** 変わるとキャンバスをリセット */
  resetKey: string | number
  onJudged: (res: WordJudgeResult, perBox: Pt[][][], allStrokes: InkStroke[], boxSize: number) => void
  disabled?: boolean
  /** パッド全体に重ねる表示（○×マーク等） */
  overlay?: ReactNode
  extraFooter?: ReactNode
  /** 判定後に各ボックスへ出す○×（null=マークなし） */
  perLetterMarks?: (boolean | null)[] | null
}

interface BoxRef {
  current: InkCanvasHandle | null
}

export function WordPad({
  word,
  ghost = false,
  resetKey,
  onJudged,
  disabled = false,
  overlay,
  extraFooter,
  perLetterMarks = null,
}: WordPadProps) {
  const letters = useMemo(() => [...word], [word])
  const boxRefs = useMemo<BoxRef[]>(() => letters.map(() => ({ current: null })), [letters])
  const orderRef = useRef<number[]>([])
  const timerRef = useRef<number | null>(null)
  const judgedRef = useRef(false)
  const [judged, setJudged] = useState(false)
  const [counts, setCounts] = useState<number[]>(() => letters.map(() => 0))
  const cfg = getEffectiveJudgeConfig()

  const cancelTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    boxRefs.forEach((r) => r.current?.clear())
    orderRef.current = []
    judgedRef.current = false
    setJudged(false)
    setCounts(letters.map(() => 0))
    cancelTimer()
    return cancelTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, word])

  const judgeNow = () => {
    if (judgedRef.current || disabled) return
    const perBox: Pt[][][] = letters.map((_, i) => strokesToPts(boxRefs[i].current?.getStrokes() ?? []))
    if (perBox.every((b) => b.length === 0)) return
    cancelTimer()
    judgedRef.current = true
    setJudged(true)
    const boxSize = boxRefs.find((r) => r.current != null)?.current?.getSize() ?? 300
    const allStrokes = letters.flatMap((_, i) => boxRefs[i].current?.getStrokes() ?? [])
    const res = judgeWord(perBox, boxSize, word, cfg)
    onJudged(res, perBox, allStrokes, boxSize)
  }

  const handleInkChange = (boxIdx: number, all: InkStroke[]) => {
    setCounts((prev) => {
      const next = [...prev]
      next[boxIdx] = all.length
      return next
    })
    cancelTimer()
    if (judgedRef.current || disabled) return
    const everyFilled = letters.every(
      (_, i) => (i === boxIdx ? all.length : (boxRefs[i].current?.getStrokes().length ?? 0)) > 0
    )
    if (everyFilled) {
      timerRef.current = window.setTimeout(judgeNow, cfg.scoring.autoJudgeDelayMs)
    }
  }

  const undoLast = () => {
    if (judged) return
    const order = orderRef.current
    while (order.length > 0) {
      const last = order[order.length - 1]
      const ink = boxRefs[last]?.current
      if (ink && ink.getStrokes().length > 0) {
        ink.undo()
        order.pop()
        setCounts((prev) => {
          const next = [...prev]
          next[last] = ink.getStrokes().length
          return next
        })
        return
      }
      order.pop()
    }
  }

  const clearAll = () => {
    if (judged) return
    boxRefs.forEach((r) => r.current?.clear())
    orderRef.current = []
    setCounts(letters.map(() => 0))
    cancelTimer()
  }

  const totalStrokes = counts.reduce((a, b) => a + b, 0)
  const nextEmpty = counts.findIndex((c) => c === 0)

  return (
    <div className="word-pad">
      <div className={`word-pad-row ${letters.length > 7 ? 'word-pad-row-many' : ''}`}>
        {letters.map((ch, i) => (
          <div key={`${word}-${i}`} className={`word-box ${!judged && i === nextEmpty ? 'word-box-next' : ''}`}>
            <InkCanvas
              inkRef={boxRefs[i]}
              disabled={disabled || judged}
              allowTouchInk={getAppFlags().allowTouchInk}
              onInkChange={(all) => handleInkChange(i, all)}
              onStrokeEnd={() => orderRef.current.push(i)}
              baseWidth={4.2}
              guide={
                <>
                  <RuleLines className="rule-svg" />
                  {ghost && <LetterSvg letter={ch} full color="#c5cede" className="guide-svg" />}
                </>
              }
              overlay={
                perLetterMarks && perLetterMarks[i] != null ? (
                  <span className={`letter-mark ${perLetterMarks[i] ? 'letter-mark-ok' : 'letter-mark-ng'}`}>
                    {perLetterMarks[i] ? '○' : '×'}
                  </span>
                ) : null
              }
              className="pad-box word-pad-box"
            />
          </div>
        ))}
      </div>
      {overlay && <div className="word-pad-overlay">{overlay}</div>}
      <div className="pad-footer">
        <Button variant="ghost" size="sm" onClick={undoLast} disabled={judged || totalStrokes === 0}>
          １かくけす
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll} disabled={judged || totalStrokes === 0}>
          ぜんぶけす
        </Button>
        <Button variant="primary" size="sm" onClick={judgeNow} disabled={judged || disabled || totalStrokes === 0}>
          できた！
        </Button>
        {extraFooter}
      </div>
    </div>
  )
}
