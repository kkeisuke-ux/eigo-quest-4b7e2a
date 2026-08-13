// 単語筆記パッド: 1文字=1ボックスを単語の文字数分ならべて書く（仕様 §13, §16, §17）。
// - ghost=true でお手本の薄い文字を敷く（なぞり用）
// - 全ボックスに書けたら少し待って自動判定。「できた！」ボタンでいつでも判定
// - 判定は1文字ずつ認識→結合→単語比較（recognition/classify.ts）
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { InkCanvas, strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import type { InkStroke } from '../core/ink/types'
import type { Pt } from '../core/geometry'
import { judgeWord, type WordJudgeResult } from '../recognition/classify'
import { getEffectiveJudgeConfig } from '../config/judgeRuntime'
import { getAppFlags } from '../config/appFlags'
import { getRefLetter, hasRefLetter } from '../core/refdata'
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
  /**
   * 変わると「直前の判定で×だった文字のボックスだけ」を消して書き直しモードにする
   * （○だった文字はそのまま残る。仕様フィードバック 2026-08-08）
   */
  retryToken?: number
  /** 大文字・小文字のどちらで書いても正解にする（テスト用） */
  caseInsensitive?: boolean
}

interface BoxRef {
  current: InkCanvasHandle | null
}

/**
 * 全ボックス共通の一辺(px)と行数を決める（第19回）。
 * 以前は flex:1 1 0 + wrap だったため、7文字以上で折り返すと
 * 「1行目は小さい6個・2行目は大きい1個」のようにサイズが不揃いになっていた。
 * 行数を1→3と増やしながら「1辺がMIN_COMFORT以上」になる最少行数を選び、
 * 全ボックスを同じ固定サイズにする（どのデバイス・行数でも全ボックス同サイズ）。
 * どの行数でも届かない時は、一辺が最大になる行数を選ぶ。
 * - containerW: パッドの幅。行内に perRow 個並べたときの幅上限を決める
 * - availH: 使える高さ（縦向きは下へスクロールできるので Infinity を渡す）
 */
export function computeBoxLayout(
  containerW: number,
  availH: number,
  n: number,
  gap = 8
): { size: number; rows: number } {
  const MAX_BOX = 215 // これ以上大きくしても書きやすさは変わらない上限
  const MIN_COMFORT = 110 // これ未満だと「狭くて書きづらい」ので行を増やす
  const ABS_MIN = 56
  let best = { size: ABS_MIN, rows: 1 }
  for (let rows = 1; rows <= 3; rows++) {
    const perRow = Math.ceil(n / rows)
    const sW = (containerW - gap * (perRow - 1)) / perRow
    const sH = (availH - gap * (rows - 1)) / rows
    const s = Math.min(MAX_BOX, sW, sH)
    if (s >= MIN_COMFORT) return { size: Math.floor(s), rows }
    if (s > best.size) best = { size: Math.floor(s), rows }
  }
  return best
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
  retryToken = 0,
  caseInsensitive = false,
}: WordPadProps) {
  const letters = useMemo(() => [...word], [word])
  const boxRefs = useMemo<BoxRef[]>(() => letters.map(() => ({ current: null })), [letters])
  const orderRef = useRef<number[]>([])
  const timerRef = useRef<number | null>(null)
  const judgedRef = useRef(false)
  const lastJudgeRef = useRef<WordJudgeResult | null>(null)
  const [judged, setJudged] = useState(false)
  const [counts, setCounts] = useState<number[]>(() => letters.map(() => 0))
  const padRef = useRef<HTMLDivElement | null>(null)
  const [layout, setLayout] = useState<{ size: number; rows: number } | null>(null)
  const cfg = getEffectiveJudgeConfig()

  // ボックスサイズの再計算（初回・パッド幅の変化・画面回転で更新）
  useEffect(() => {
    const el = padRef.current
    if (!el) return
    const compute = () => {
      // clientWidthは四捨五入されるため（660.8→661）、計算上ぴったりのサイズが
      // 実幅を1px超えて意図しない折り返しを起こす。切り捨て-1pxの安全側で計算する
      const w = Math.floor(el.getBoundingClientRect().width) - 1
      if (w <= 0) return
      // 縦向きは画面を下へスクロールできるので幅だけで決める。
      // 横向き（スマホ横持ち等）は画面の高さにも収まるようにする
      const portrait = window.matchMedia('(orientation: portrait)').matches
      const splitH = el.closest('.split')?.clientHeight ?? window.innerHeight
      const availH = portrait ? Number.POSITIVE_INFINITY : Math.max(120, splitH - 90)
      setLayout(computeBoxLayout(w, availH, Math.max(1, letters.length)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
  }, [letters.length])

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
    lastJudgeRef.current = null
    setJudged(false)
    setCounts(letters.map(() => 0))
    cancelTimer()
    return cancelTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, word])

  // 「まちがえた文字だけ かきなおす」: ×だったボックスだけ消して再開する
  useEffect(() => {
    if (retryToken === 0) return
    const last = lastJudgeRef.current
    if (!last) return
    const wrongIdx = new Set<number>()
    letters.forEach((_, i) => {
      if (!(last.letters[i]?.correct ?? false)) wrongIdx.add(i)
    })
    wrongIdx.forEach((i) => boxRefs[i]?.current?.clear())
    orderRef.current = orderRef.current.filter((i) => !wrongIdx.has(i))
    judgedRef.current = false
    setJudged(false)
    setCounts(letters.map((_, i) => (wrongIdx.has(i) ? 0 : (boxRefs[i]?.current?.getStrokes().length ?? 0))))
    cancelTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken])

  const judgeNow = (fromButton = false) => {
    if (judgedRef.current || disabled) return
    // どこかのボックスでまだ書いている最中なら判定しない（少し待って再確認）
    if (boxRefs.some((r) => r.current?.isWriting())) {
      if (!fromButton) {
        cancelTimer()
        timerRef.current = window.setTimeout(() => judgeNow(false), 400)
      }
      return
    }
    const perBox: Pt[][][] = letters.map((_, i) => strokesToPts(boxRefs[i].current?.getStrokes() ?? []))
    if (perBox.every((b) => b.length === 0)) return
    cancelTimer()
    judgedRef.current = true
    setJudged(true)
    const boxSize = boxRefs.find((r) => r.current != null)?.current?.getSize() ?? 300
    const allStrokes = letters.flatMap((_, i) => boxRefs[i].current?.getStrokes() ?? [])
    const res = judgeWord(perBox, boxSize, word, cfg, { caseInsensitive })
    lastJudgeRef.current = res
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
    const strokesOf = (i: number) => (i === boxIdx ? all.length : (boxRefs[i].current?.getStrokes().length ?? 0))
    const everyFilled = letters.every((_, i) => strokesOf(i) > 0)
    if (!everyFilled) return
    // 書き終わりを待ってから判定する（2026-08-08フィードバック: gの2画目を書く前に×が出ない
    // ように）。お手本の画数に足りないボックスが残っている間は、たっぷり待つ
    const everyComplete = letters.every(
      (ch, i) => !hasRefLetter(ch) || strokesOf(i) >= getRefLetter(ch).strokeCount
    )
    const delay = everyComplete ? cfg.scoring.autoJudgeDelayMs : cfg.scoring.autoJudgeDelayMs * 4
    timerRef.current = window.setTimeout(() => judgeNow(false), delay)
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

  // 行数ぶんに均等分割する（7文字2行=4+3、5文字2行=3+2。flexの自動折り返し任せだと
  // 4+1のように偏るため明示的に分ける。第19回）
  const rowCount = layout?.rows ?? 1
  const perRow = Math.ceil(letters.length / rowCount)
  const letterRows: { ch: string; i: number }[][] = []
  for (let r = 0; r * perRow < letters.length; r++) {
    letterRows.push(letters.slice(r * perRow, (r + 1) * perRow).map((ch, k) => ({ ch, i: r * perRow + k })))
  }

  return (
    <div
      className="word-pad"
      ref={padRef}
      style={layout != null ? ({ '--wb': `${layout.size}px` } as CSSProperties) : undefined}
    >
      {letterRows.map((row, r) => (
        <div key={r} className="word-pad-row">
          {row.map(({ ch, i }) => (
            <div key={`${word}-${i}`} className={`word-box ${!judged && i === nextEmpty ? 'word-box-next' : ''}`}>
              <InkCanvas
                inkRef={boxRefs[i]}
                disabled={disabled || judged}
                allowTouchInk={getAppFlags().allowTouchInk}
                onStrokeStart={cancelTimer}
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
      ))}
      {overlay && <div className="word-pad-overlay">{overlay}</div>}
      <div className="pad-footer">
        <Button variant="ghost" size="sm" onClick={undoLast} disabled={judged || totalStrokes === 0}>
          １かくけす
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAll} disabled={judged || totalStrokes === 0}>
          ぜんぶけす
        </Button>
        <Button variant="primary" size="sm" onClick={() => judgeNow(true)} disabled={judged || disabled || totalStrokes === 0}>
          できた！
        </Button>
        {extraFooter}
      </div>
    </div>
  )
}
