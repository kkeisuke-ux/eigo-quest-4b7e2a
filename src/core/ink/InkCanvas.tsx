// 手書き入力キャンバス（最重要コンポーネント。仕様 §3）
// - pointerType === 'pen'（＋開発用に 'mouse'）を基本にインク化する
// - 'touch'（指・手のひら）は既定でインク化しない（palm rejection）。設定で指も許可できる
// - getCoalescedEvents() が使えるブラウザではApple Pencilの細かな軌跡を取得
// - 1画 = pointerdown → pointermove → pointerup
// - 指でキャンバスをなぞったときはページスクロールにする（第25回）
//
// === 2026-08-15 第28回: かんじクエストのペン改善を移植 =====================
// 実機iPadでペンだけ反応が悪くなる主因は、ペン使用時に手のひらが画面に触れること。
// 手のひらのtouchを「線にしない」だけではSafariのジェスチャ認識は動き続けるため、
// スクロール等と判断された瞬間に、書いている最中のペンへ pointercancel が飛ぶ。
//   (1) ペンで書いている間は touch の既定動作を document 全体で止める（cancelの原因を断つ）
//       ただし**ボタン等の操作要素の上では絶対に止めない**（タップが死ぬため）
//   (2) cancelされても画を捨てず300ms保留 → 同じ位置から書き直したら同じ画として連結
//   (3) pointerdown を取りこぼしても、接触中のpointermoveを検知したら画を開始する（復帰）
//   (4) pointermove/up/cancel は window で受ける（キャプチャが外れても画が切れない）
//   (5) 筆圧が0/極小でも線が細くなりすぎない太さカーブ＋筆圧の平滑化＋中点ベジェで滑らかに
//   (6) 書きかけの画が放置されたら自動確定するウォッチドッグ（UIが固まらない保険）
// ==========================================================================
import { useEffect, useRef } from 'react'
import type React from 'react'
import type { Pt } from '../geometry'
import { emptyDiagnostics, type InkDiagnostics, type InkPoint, type InkStroke } from './types'

/** ペンを使った直後この時間はtouchを無視する（手のひら誤爆防止） */
const PEN_LOCK_MS = 1500
/** ペンのイベントがこの時間途切れたら「もう書いていない」とみなす（touch抑止を必ず解除する） */
const PEN_STALE_MS = 1200
/** 書きかけの画がこの時間放置されたら自動で確定させる */
const STROKE_WATCHDOG_MS = 2000
/** cancel後この時間内に近くから書き直したら同じ画として継続する */
const RESUME_MS = 300
/** 上記の「近く」の距離（CSS px） */
const RESUME_DIST = 34
/** 筆圧の平滑化係数 */
const PRESSURE_ALPHA = 0.35
/** タップを絶対に邪魔しない要素 */
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], .btn, .card-tap, .tile, .chip, .badge, .modal-back, .modal-panel, .tool-btn, .pen-swatch, .pen-size'

export interface InkCanvasHandle {
  clear(): void
  undo(): InkStroke | null
  getStrokes(): InkStroke[]
  /** 保存済みストロークを復元する（絵日記の続き描き用） */
  setStrokes(strokes: InkStroke[]): void
  /** キャンバスの一辺=幅（CSS px） */
  getSize(): number
  /** いま書いている最中か（ペンが触れている間true。自動判定の抑止に使う） */
  isWriting(): boolean
}

interface Props {
  disabled?: boolean
  /** trueにするとtouchでも書ける（既定false＝指では書けない）。trueでもペン使用中はtouchを無視する */
  allowTouchInk?: boolean
  penColor?: string
  baseWidth?: number
  /** 描画ツール（絵日記用）。brushは太く半透明、eraserは消しゴム */
  penTool?: 'pen' | 'brush' | 'eraser'
  /** 高さ/幅の比。1=正方形（既定）。絵日記の横長キャンバス等で使用 */
  aspectRatio?: number
  /** 十字リーダー付きのマス目を表示 */
  showGrid?: boolean
  /** インクの下に敷くガイド（お手本SVG等） */
  guide?: React.ReactNode
  /** インクの上に重ねるオーバーレイ（採点表示等） */
  overlay?: React.ReactNode
  /** 1画の書き始めに呼ぶ */
  onStrokeStart?: () => void
  onStrokeEnd?: (stroke: InkStroke, all: InkStroke[]) => void
  onInkChange?: (all: InkStroke[]) => void
  onDiag?: (diag: InkDiagnostics) => void
  inkRef?: React.MutableRefObject<InkCanvasHandle | null>
  className?: string
}

export function strokesToPts(strokes: InkStroke[]): Pt[][] {
  return strokes.map((s) => s.points.map((p) => ({ x: p.x, y: p.y })))
}

interface XY {
  x: number
  y: number
}
const mid = (a: XY, b: XY): XY => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export function InkCanvas(props: Props) {
  const {
    disabled = false,
    allowTouchInk = false,
    penColor = '#233047',
    baseWidth = 5,
    penTool = 'pen',
    aspectRatio = 1,
    showGrid = false,
    guide,
    overlay,
    onStrokeStart,
    onStrokeEnd,
    onInkChange,
    onDiag,
    inkRef,
    className,
  } = props

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const strokesRef = useRef<InkStroke[]>([])
  /** clear()で消した直前の内容（undo()での復元用） */
  const clearedRef = useRef<InkStroke[] | null>(null)
  const currentRef = useRef<InkStroke | null>(null)
  /** cancelされて確定保留中の画 */
  const pendingRef = useRef<InkStroke | null>(null)
  const pendingTimerRef = useRef<number | null>(null)
  const watchdogRef = useRef<number | null>(null)
  const activeIdRef = useRef<number | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const sizeRef = useRef(300)
  const nextIdRef = useRef(1)
  const diagRef = useRef<InkDiagnostics>(emptyDiagnostics())
  const diagScheduledRef = useRef(false)
  const lastPenTsRef = useRef(-1e9)
  const emaRef = useRef(0.5)
  /** 指でキャンバスをなぞった時のページスクロール */
  const panRef = useRef<{ id: number; y0: number; top0: number; el: Element; lastY: number; lastT: number; v: number } | null>(
    null
  )

  const cbRef = useRef({ onStrokeStart, onStrokeEnd, onInkChange, onDiag, penColor, baseWidth, penTool, disabled, allowTouchInk })
  cbRef.current = { onStrokeStart, onStrokeEnd, onInkChange, onDiag, penColor, baseWidth, penTool, disabled, allowTouchInk }

  const getCtx = (): CanvasRenderingContext2D | null => {
    if (ctxRef.current) return ctxRef.current
    const canvas = canvasRef.current
    if (!canvas) return null
    ctxRef.current = canvas.getContext('2d', { desynchronized: true }) as CanvasRenderingContext2D | null
    return ctxRef.current
  }

  // ---- 描画 -------------------------------------------------------------
  // 筆圧0（＝筆圧が取れない環境）でも指と同じ太さになるようにする。
  // 極端に細くならないよう下限を持たせ、変化幅も控えめにして「かすれ」感を無くす。
  const widthFor = (pressure: number, pointerType: string, base: number): number => {
    if (pointerType !== 'pen') return base * 1.05
    const raw = pressure > 0 ? pressure : 0.5
    const p = Math.min(1, Math.max(0.15, raw))
    return base * (0.8 + 0.5 * p)
  }

  const smoothedPressures = (points: InkPoint[]): number[] => {
    const out: number[] = []
    let ema = points.length > 0 && points[0].p > 0 ? points[0].p : 0.5
    for (const pt of points) {
      const v = pt.p > 0 ? pt.p : 0.5
      ema = ema + PRESSURE_ALPHA * (v - ema)
      out.push(ema)
    }
    return out
  }

  const strokeStyleOf = (
    s: Pick<InkStroke, 'color' | 'width' | 'tool'>
  ): { color: string; base: number; tool: 'pen' | 'brush' | 'eraser' } => {
    const tool = s.tool ?? 'pen'
    const base = s.width ?? cbRef.current.baseWidth
    return {
      color: s.color ?? cbRef.current.penColor,
      // ふでブラシは太く、消しゴムはさらに太く
      base: tool === 'brush' ? base * 2.6 : tool === 'eraser' ? base * 3.4 : base,
      tool,
    }
  }

  const applyTool = (ctx: CanvasRenderingContext2D, tool: 'pen' | 'brush' | 'eraser') => {
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.globalAlpha = tool === 'brush' ? 0.45 : 1
  }

  const resetTool = (ctx: CanvasRenderingContext2D) => {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  const beginPathStyle = (ctx: CanvasRenderingContext2D, stroke: InkStroke, w: number) => {
    const st = strokeStyleOf(stroke)
    applyTool(ctx, st.tool)
    ctx.strokeStyle = st.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = w
  }

  const drawLine = (ctx: CanvasRenderingContext2D, stroke: InkStroke, a: XY, b: XY, w: number) => {
    beginPathStyle(ctx, stroke, w)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    resetTool(ctx)
  }

  const drawCurve = (ctx: CanvasRenderingContext2D, stroke: InkStroke, from: XY, ctrl: XY, to: XY, w: number) => {
    beginPathStyle(ctx, stroke, w)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y)
    ctx.stroke()
    resetTool(ctx)
  }

  const drawDot = (ctx: CanvasRenderingContext2D, p: InkPoint, stroke: InkStroke) => {
    const st = strokeStyleOf(stroke)
    applyTool(ctx, st.tool)
    ctx.fillStyle = st.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, widthFor(p.p, stroke.pointerType, st.base) / 2, 0, Math.PI * 2)
    ctx.fill()
    resetTool(ctx)
  }

  /** 画の途中（index i の点を足した直後）を滑らかに描く */
  const drawTip = (ctx: CanvasRenderingContext2D, s: InkStroke, i: number, w: number) => {
    const pts = s.points
    if (i === 1) drawLine(ctx, s, pts[0], mid(pts[0], pts[1]), w)
    else if (i >= 2) drawCurve(ctx, s, mid(pts[i - 2], pts[i - 1]), pts[i - 1], mid(pts[i - 1], pts[i]), w)
  }

  const drawStrokeFull = (ctx: CanvasRenderingContext2D, s: InkStroke) => {
    const pts = s.points
    if (pts.length === 0) return
    if (pts.length === 1) {
      drawDot(ctx, pts[0], s)
      return
    }
    const base = strokeStyleOf(s).base
    const ws = smoothedPressures(pts).map((p) => widthFor(p, s.pointerType, base))
    for (let i = 1; i < pts.length; i++) drawTip(ctx, s, i, ws[i])
    const n = pts.length
    drawLine(ctx, s, mid(pts[n - 2], pts[n - 1]), pts[n - 1], ws[n - 1])
  }

  const ensureTransform = (ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const redrawAll = () => {
    const ctx = getCtx()
    if (!ctx) return
    ensureTransform(ctx)
    ctx.clearRect(0, 0, sizeRef.current, sizeRef.current * aspectRatio + 1)
    for (const s of strokesRef.current) drawStrokeFull(ctx, s)
    if (pendingRef.current) drawStrokeFull(ctx, pendingRef.current)
    if (currentRef.current) drawStrokeFull(ctx, currentRef.current)
  }

  const flushDiag = () => {
    if (diagScheduledRef.current) return
    diagScheduledRef.current = true
    requestAnimationFrame(() => {
      diagScheduledRef.current = false
      cbRef.current.onDiag?.({ ...diagRef.current })
    })
  }

  // ---- 画の確定・継続 ---------------------------------------------------
  const clearPendingTimer = () => {
    if (pendingTimerRef.current != null) {
      window.clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
  }

  const clearWatchdog = () => {
    if (watchdogRef.current != null) {
      window.clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }

  const armWatchdog = () => {
    clearWatchdog()
    watchdogRef.current = window.setTimeout(() => {
      watchdogRef.current = null
      if (currentRef.current) finishStroke(false)
    }, STROKE_WATCHDOG_MS)
  }

  const commitStroke = (s: InkStroke) => {
    strokesRef.current = [...strokesRef.current, s]
    clearedRef.current = null // 新しく書き始めたら「けす前」への復元はしない
    diagRef.current.strokeCount = strokesRef.current.length
    cbRef.current.onInkChange?.(strokesRef.current)
    cbRef.current.onStrokeEnd?.(s, strokesRef.current)
    flushDiag()
  }

  const flushPending = () => {
    clearPendingTimer()
    const p = pendingRef.current
    if (!p) return
    pendingRef.current = null
    commitStroke(p)
  }

  /** 画を終える。fromCancel のときはすぐ確定せず、書き直しに備えて少しだけ保留する */
  const finishStroke = (fromCancel: boolean) => {
    clearWatchdog()
    const cur = currentRef.current
    currentRef.current = null
    activeIdRef.current = null
    const d = diagRef.current
    d.currentStrokePoints = 0
    if (!cur) return
    cur.endedAt = Date.now()
    // 最後の点まで線を伸ばす（liveでは中点までしか描いていないため）
    const ctx = getCtx()
    if (ctx && cur.points.length >= 2) {
      const pts = cur.points
      const n = pts.length
      const base = strokeStyleOf(cur).base
      const ws = smoothedPressures(pts).map((p) => widthFor(p, cur.pointerType, base))
      drawLine(ctx, cur, mid(pts[n - 2], pts[n - 1]), pts[n - 1], ws[n - 1])
    }
    if (fromCancel) {
      d.cancelledStrokes++
      if (cur.points.length === 0) {
        redrawAll()
        flushDiag()
        return
      }
      flushPending()
      pendingRef.current = cur
      clearPendingTimer()
      pendingTimerRef.current = window.setTimeout(() => {
        pendingTimerRef.current = null
        flushPending()
      }, RESUME_MS)
      flushDiag()
      return
    }
    flushPending()
    commitStroke(cur)
  }

  // ---- 座標 -------------------------------------------------------------
  const refreshRect = () => {
    const canvas = canvasRef.current
    if (canvas) rectRef.current = canvas.getBoundingClientRect()
    return rectRef.current
  }

  const toPoint = (ev: PointerEvent): InkPoint => {
    const rect = rectRef.current
    const left = rect ? rect.left : 0
    const top = rect ? rect.top : 0
    return {
      x: ev.clientX - left,
      y: ev.clientY - top,
      t: ev.timeStamp,
      p: ev.pressure,
      tiltX: ev.tiltX ?? 0,
      tiltY: ev.tiltY ?? 0,
    }
  }

  const insideCanvas = (ev: PointerEvent): boolean => {
    const rect = refreshRect()
    if (!rect) return false
    const m = 2
    return (
      ev.clientX >= rect.left - m && ev.clientX <= rect.right + m && ev.clientY >= rect.top - m && ev.clientY <= rect.bottom + m
    )
  }

  const updateDiagFrom = (ev: PointerEvent) => {
    const d = diagRef.current
    d.lastPointerType = ev.pointerType
    d.lastPressure = ev.pressure
    d.lastTiltX = ev.tiltX ?? 0
    d.lastTiltY = ev.tiltY ?? 0
  }

  /** いまペンで実際に書いている最中か（イベントが途切れたら自動で false に戻る） */
  const penIsDrawing = (): boolean =>
    currentRef.current?.pointerType === 'pen' && performance.now() - lastPenTsRef.current < PEN_STALE_MS

  const isInteractiveTarget = (t: EventTarget | null): boolean =>
    t instanceof Element ? t.closest(INTERACTIVE_SELECTOR) != null : false

  // ---- スクロール（指） -------------------------------------------------
  const findScrollParent = (start: HTMLElement | null): Element | null => {
    let n: HTMLElement | null = start
    while (n) {
      const st = window.getComputedStyle(n)
      if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 2) return n
      n = n.parentElement
    }
    const doc = document.scrollingElement
    return doc && doc.scrollHeight > doc.clientHeight + 2 ? doc : null
  }

  const endPan = () => {
    const pan = panRef.current
    panRef.current = null
    if (!pan) return
    let v = pan.v
    if (Math.abs(v) < 0.05) return
    const el = pan.el
    const step = () => {
      el.scrollTop -= v * 16
      v *= 0.94
      if (Math.abs(v) > 0.02) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // ---- 画の開始 ---------------------------------------------------------
  const beginStroke = (ev: PointerEvent, recovered: boolean) => {
    const type = ev.pointerType
    refreshRect()
    activeIdRef.current = ev.pointerId
    try {
      canvasRef.current?.setPointerCapture(ev.pointerId)
    } catch {
      // capture不可でも続行（window側で拾う）
    }
    const ctx = getCtx()
    if (ctx) ensureTransform(ctx)
    const pt = toPoint(ev)

    // cancelされた直後に同じ場所から書き直した → 同じ画の続きとして扱う
    const pending = pendingRef.current
    if (
      pending &&
      pending.pointerType === type &&
      pending.points.length > 0 &&
      Date.now() - pending.endedAt < RESUME_MS &&
      Math.hypot(pt.x - pending.points[pending.points.length - 1].x, pt.y - pending.points[pending.points.length - 1].y) <
        RESUME_DIST
    ) {
      clearPendingTimer()
      pendingRef.current = null
      currentRef.current = pending
      armWatchdog()
      diagRef.current.resumedStrokes++
      emaRef.current = smoothedPressures(pending.points)[pending.points.length - 1]
      pushPoint(ev, pt)
      return
    }

    flushPending()
    currentRef.current = {
      id: nextIdRef.current++,
      pointerType: type,
      points: [pt],
      usedCoalesced: false,
      startedAt: Date.now(),
      endedAt: 0,
      color: cbRef.current.penColor,
      width: cbRef.current.baseWidth,
      tool: cbRef.current.penTool,
    }
    emaRef.current = pt.p > 0 ? pt.p : 0.5
    armWatchdog()
    diagRef.current.currentStrokePoints = 1
    if (recovered) diagRef.current.recoveredStrokes++
    if (ctx) drawDot(ctx, pt, currentRef.current)
    cbRef.current.onStrokeStart?.()
  }

  const pushPoint = (ev: PointerEvent, pt?: InkPoint) => {
    const cur = currentRef.current
    if (!cur) return
    const point = pt ?? toPoint(ev)
    cur.points.push(point)
    const v = point.p > 0 ? point.p : 0.5
    emaRef.current = emaRef.current + PRESSURE_ALPHA * (v - emaRef.current)
    const ctx = getCtx()
    if (ctx) drawTip(ctx, cur, cur.points.length - 1, widthFor(emaRef.current, cur.pointerType, strokeStyleOf(cur).base))
    armWatchdog()
    diagRef.current.currentStrokePoints = cur.points.length
  }

  // ---- リサイズ対応 -----------------------------------------------------
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const apply = () => {
      const s = Math.round(wrap.clientWidth)
      if (s <= 0) return
      const h = Math.round(s * aspectRatio)
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = s
      if (canvas.width !== Math.round(s * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(s * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = `${s}px`
        canvas.style.height = `${h}px`
        redrawAll()
      }
      refreshRect()
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    window.addEventListener('scroll', refreshRect, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', refreshRect, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 外部操作ハンドル -------------------------------------------------
  useEffect(() => {
    if (!inkRef) return
    inkRef.current = {
      clear() {
        // 「ぜんぶけす」を押しまちがえても undo() で戻せるように退避する（第20回）
        clearPendingTimer()
        pendingRef.current = null
        if (strokesRef.current.length > 0) clearedRef.current = strokesRef.current
        strokesRef.current = []
        currentRef.current = null
        activeIdRef.current = null
        clearWatchdog()
        diagRef.current.strokeCount = 0
        diagRef.current.currentStrokePoints = 0
        redrawAll()
        cbRef.current.onInkChange?.([])
        flushDiag()
      },
      undo() {
        flushPending()
        // 空のときは、直前のclear()があればその内容を丸ごと復元する
        if (strokesRef.current.length === 0 && clearedRef.current) {
          strokesRef.current = clearedRef.current
          clearedRef.current = null
          diagRef.current.strokeCount = strokesRef.current.length
          redrawAll()
          cbRef.current.onInkChange?.(strokesRef.current)
          flushDiag()
          return null
        }
        const popped = strokesRef.current.pop() ?? null
        strokesRef.current = [...strokesRef.current]
        diagRef.current.strokeCount = strokesRef.current.length
        redrawAll()
        cbRef.current.onInkChange?.(strokesRef.current)
        flushDiag()
        return popped
      },
      getStrokes() {
        // 保留中の画があれば確定してから返す（判定直後の取りこぼし防止）
        flushPending()
        return strokesRef.current
      },
      setStrokes(strokes: InkStroke[]) {
        clearPendingTimer()
        pendingRef.current = null
        clearWatchdog()
        strokesRef.current = [...strokes]
        clearedRef.current = null
        currentRef.current = null
        activeIdRef.current = null
        nextIdRef.current = Math.max(0, ...strokes.map((s) => s.id)) + 1
        diagRef.current.strokeCount = strokes.length
        redrawAll()
        flushDiag()
      },
      getSize() {
        return sizeRef.current
      },
      isWriting() {
        return activeIdRef.current !== null || pendingRef.current != null
      },
    }
    return () => {
      if (inkRef) inkRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inkRef])

  // ---- 入力（ネイティブリスナ）-----------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (ev: PointerEvent) => {
      if (cbRef.current.disabled) return
      const type = ev.pointerType
      updateDiagFrom(ev)
      if (type === 'pen') lastPenTsRef.current = performance.now()

      if (type === 'touch') {
        // palm rejection: 指モードOFFなら常に無視。ONでもペン使用直後は手のひらとみなす。
        if (!cbRef.current.allowTouchInk || performance.now() - lastPenTsRef.current < PEN_LOCK_MS) {
          diagRef.current.rejectedTouchCount++
          // 線にはしないが、代わりに指でページをスクロールできるようにする（第25回）
          const el = findScrollParent(wrapRef.current)
          if (el && activeIdRef.current === null) {
            panRef.current = { id: ev.pointerId, y0: ev.clientY, top0: el.scrollTop, el, lastY: ev.clientY, lastT: ev.timeStamp, v: 0 }
            try {
              canvas.setPointerCapture(ev.pointerId)
            } catch {
              // capture不可でも続行
            }
          }
          ev.preventDefault()
          flushDiag()
          return
        }
      }

      // ペンが下りたら、書きかけのtouch（＝手のひら）は線ごと捨てる（ペン優先）
      if (type === 'pen' && currentRef.current?.pointerType === 'touch') {
        currentRef.current = null
        activeIdRef.current = null
        clearWatchdog()
        diagRef.current.palmDropped++
        redrawAll()
      }
      // 前の画が開きっぱなし（pointerupの取りこぼし等）ならここで確定させる
      if (activeIdRef.current !== null) finishStroke(false)

      beginStroke(ev, false)
      ev.preventDefault()
      flushDiag()
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType === 'pen') lastPenTsRef.current = performance.now()
      // 指スワイプによるスクロール中
      const pan = panRef.current
      if (pan && ev.pointerId === pan.id) {
        const y = ev.clientY
        pan.el.scrollTop = pan.top0 - (y - pan.y0)
        const dt = ev.timeStamp - pan.lastT
        if (dt >= 4) pan.v = Math.max(-2.5, Math.min(2.5, (y - pan.lastY) / dt))
        pan.lastY = y
        pan.lastT = ev.timeStamp
        ev.preventDefault()
        return
      }

      const cur = currentRef.current
      if (!cur || ev.pointerId !== activeIdRef.current) {
        // pointerdownを取りこぼしたまま接触して動いている場合の復帰（ペン/マウスのみ）
        if (
          !cur &&
          !cbRef.current.disabled &&
          (ev.pointerType === 'pen' || ev.pointerType === 'mouse') &&
          (ev.buttons & 1) === 1 &&
          insideCanvas(ev)
        ) {
          updateDiagFrom(ev)
          beginStroke(ev, true)
          ev.preventDefault()
          flushDiag()
          return
        }
        if (ev.pointerType === 'pen') {
          updateDiagFrom(ev)
          flushDiag()
        }
        return
      }

      let events: PointerEvent[]
      if (typeof ev.getCoalescedEvents === 'function') {
        const list = ev.getCoalescedEvents()
        if (list.length > 0) {
          events = list
          cur.usedCoalesced = true
        } else {
          events = [ev]
        }
      } else {
        events = [ev]
      }
      for (const e of events) pushPoint(e)
      diagRef.current.lastEventPointCount = events.length
      updateDiagFrom(ev)
      ev.preventDefault()
      flushDiag()
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerType === 'pen') lastPenTsRef.current = performance.now()
      if (panRef.current?.id === ev.pointerId) {
        endPan()
        return
      }
      if (ev.pointerId !== activeIdRef.current) return
      if (currentRef.current) pushPoint(ev)
      finishStroke(false)
      ev.preventDefault()
      flushDiag()
    }

    const onCancel = (ev: PointerEvent) => {
      if (panRef.current?.id === ev.pointerId) {
        panRef.current = null
        return
      }
      if (ev.pointerId !== activeIdRef.current) return
      finishStroke(true)
      flushDiag()
    }

    // ペンで書いている最中は、手のひら等のtouchを既定動作ごと止める（cancelの根本原因を断つ）。
    // ボタン等の操作要素の上では絶対に止めない（タップが死ぬため）。
    const blockTouch = (ev: TouchEvent) => {
      if (isInteractiveTarget(ev.target)) return
      if (penIsDrawing()) {
        ev.preventDefault()
        return
      }
      if (ev.type === 'touchmove' && ev.target instanceof Node && wrapRef.current?.contains(ev.target) === true) {
        ev.preventDefault()
      }
    }

    const onBlur = () => {
      if (currentRef.current) finishStroke(false)
    }

    canvas.addEventListener('pointerdown', onDown, { passive: false })
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp, { passive: false })
    window.addEventListener('pointercancel', onCancel, { passive: false })
    document.addEventListener('touchstart', blockTouch, { passive: false })
    document.addEventListener('touchmove', blockTouch, { passive: false })
    window.addEventListener('blur', onBlur)

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('touchstart', blockTouch)
      document.removeEventListener('touchmove', blockTouch)
      window.removeEventListener('blur', onBlur)
      clearPendingTimer()
      clearWatchdog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={wrapRef}
      className={`ink-wrap ${className ?? ''}`}
      style={{ position: 'relative', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showGrid && (
        <svg className="ink-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect x="0.6" y="0.6" width="98.8" height="98.8" fill="none" stroke="#d8cfc0" strokeWidth="1.2" rx="3" />
          <line x1="50" y1="2" x2="50" y2="98" stroke="#e4dccd" strokeWidth="0.7" strokeDasharray="3 2.4" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#e4dccd" strokeWidth="0.7" strokeDasharray="3 2.4" />
        </svg>
      )}
      {guide && <div className="ink-layer">{guide}</div>}
      <canvas
        ref={canvasRef}
        className="ink-canvas"
        style={{ position: 'relative', display: 'block', width: '100%', touchAction: 'none' }}
      />
      {overlay && <div className="ink-layer ink-layer-top">{overlay}</div>}
    </div>
  )
}
