// 手書き入力キャンバス（最重要コンポーネント。仕様 §3）
// - pointerType === 'pen'（＋開発用に 'mouse'）のみインク化する
// - 'touch'（指・手のひら）は既定でインク化しない（palm rejection）
// - getCoalescedEvents() が使えるブラウザではApple Pencilの細かな軌跡を取得
// - 1画 = pointerdown → pointermove → pointerup
import { useEffect, useRef } from 'react'
import type React from 'react'
import { polylineLength, type Pt } from '../geometry'
import { emptyDiagnostics, type InkDiagnostics, type InkPoint, type InkStroke } from './types'

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
  /** trueにするとtouchでも書ける（開発検証用。既定false＝指では書けない） */
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
  /** 1画の書き始め（pointerdownでインク化が始まった瞬間）に呼ぶ */
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
  const strokesRef = useRef<InkStroke[]>([])
  /** clear()で消した直前の内容（undo()での復元用。新しい画を書いたら破棄。第20回） */
  const clearedRef = useRef<InkStroke[] | null>(null)
  const currentRef = useRef<InkStroke | null>(null)
  const activeIdRef = useRef<number | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const sizeRef = useRef(300)
  const nextIdRef = useRef(1)
  const diagRef = useRef<InkDiagnostics>(emptyDiagnostics())
  const diagScheduledRef = useRef(false)

  const cbRef = useRef({ onStrokeStart, onStrokeEnd, onInkChange, onDiag, penColor, baseWidth, penTool, disabled, allowTouchInk })
  cbRef.current = { onStrokeStart, onStrokeEnd, onInkChange, onDiag, penColor, baseWidth, penTool, disabled, allowTouchInk }

  // 2Dコンテキストは1回だけ取得してキャッシュ（pointermoveごとのgetContextをやめて
  // 書き味を軽くする。第13回）
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const getCtx = (): CanvasRenderingContext2D | null => {
    if (ctxRef.current) return ctxRef.current
    const canvas = canvasRef.current
    if (!canvas) return null
    ctxRef.current = canvas.getContext('2d', { desynchronized: true }) as CanvasRenderingContext2D | null
    return ctxRef.current
  }

  const widthFor = (pressure: number, pointerType: string, base: number): number => {
    const p = pointerType === 'pen' ? Math.min(1, Math.max(0.08, pressure)) : 0.5
    return base * (0.55 + 0.9 * p)
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

  const drawSegment = (ctx: CanvasRenderingContext2D, a: InkPoint, b: InkPoint, stroke: InkStroke) => {
    const st = strokeStyleOf(stroke)
    applyTool(ctx, st.tool)
    ctx.strokeStyle = st.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = widthFor((a.p + b.p) / 2, stroke.pointerType, st.base)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
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

  const redrawAll = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, sizeRef.current, sizeRef.current * aspectRatio + 1)
    for (const s of strokesRef.current) {
      if (s.points.length === 1) {
        drawDot(ctx, s.points[0], s)
      } else {
        for (let i = 1; i < s.points.length; i++) drawSegment(ctx, s.points[i - 1], s.points[i], s)
      }
    }
  }

  const flushDiag = () => {
    if (diagScheduledRef.current) return
    diagScheduledRef.current = true
    requestAnimationFrame(() => {
      diagScheduledRef.current = false
      cbRef.current.onDiag?.({ ...diagRef.current })
    })
  }

  // リサイズ対応（正方形はCSS aspect-ratioで担保）
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
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 外部操作ハンドル
  useEffect(() => {
    if (!inkRef) return
    inkRef.current = {
      clear() {
        // 「ぜんぶけす」を押しまちがえても undo() で戻せるように退避する（第20回）
        if (strokesRef.current.length > 0) clearedRef.current = strokesRef.current
        strokesRef.current = []
        currentRef.current = null
        activeIdRef.current = null
        diagRef.current.strokeCount = 0
        diagRef.current.currentStrokePoints = 0
        redrawAll()
        cbRef.current.onInkChange?.([])
        flushDiag()
      },
      undo() {
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
        return strokesRef.current
      },
      setStrokes(strokes: InkStroke[]) {
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
        return activeIdRef.current !== null
      },
    }
    return () => {
      if (inkRef) inkRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inkRef])

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

  const updateHoverDiag = (e: React.PointerEvent) => {
    const d = diagRef.current
    d.lastPointerType = e.pointerType
    d.lastPressure = e.nativeEvent.pressure
    d.lastTiltX = e.nativeEvent.tiltX ?? 0
    d.lastTiltY = e.nativeEvent.tiltY ?? 0
    flushDiag()
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (cbRef.current.disabled) return
    const type = e.pointerType
    const d = diagRef.current
    d.lastPointerType = type
    d.lastPressure = e.nativeEvent.pressure
    d.lastTiltX = e.nativeEvent.tiltX ?? 0
    d.lastTiltY = e.nativeEvent.tiltY ?? 0

    // ===== palm rejection: touchはインク化しない（仕様 §3） =====
    if (type === 'touch' && !cbRef.current.allowTouchInk) {
      d.rejectedTouchCount++
      flushDiag()
      return
    }
    // すでに他のポインタで書いている最中は無視（2本目のペン・指を弾く）
    if (activeIdRef.current !== null) return

    activeIdRef.current = e.pointerId
    rectRef.current = canvasRef.current!.getBoundingClientRect()
    try {
      canvasRef.current!.setPointerCapture(e.pointerId)
    } catch {
      // capture不可でも続行
    }
    const pt = toPoint(e.nativeEvent)
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
    d.currentStrokePoints = 1
    const ctx = getCtx()
    if (ctx) drawDot(ctx, pt, currentRef.current)
    cbRef.current.onStrokeStart?.()
    e.preventDefault()
    flushDiag()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cur = currentRef.current
    if (!cur || e.pointerId !== activeIdRef.current) {
      // 書いていない時もホバー情報だけ診断向けに更新（Apple Pencilホバー対応機で有効）
      if (e.pointerType === 'pen') updateHoverDiag(e)
      return
    }
    const native = e.nativeEvent
    let events: PointerEvent[]
    if (typeof native.getCoalescedEvents === 'function') {
      const list = native.getCoalescedEvents()
      if (list.length > 0) {
        events = list
        cur.usedCoalesced = true
      } else {
        events = [native]
      }
    } else {
      events = [native]
    }
    const ctx = getCtx()
    for (const ev of events) {
      const pt = toPoint(ev)
      const last = cur.points[cur.points.length - 1]
      cur.points.push(pt)
      if (ctx) drawSegment(ctx, last, pt, cur)
    }
    const d = diagRef.current
    d.lastEventPointCount = events.length
    d.currentStrokePoints = cur.points.length
    d.lastPressure = native.pressure
    d.lastTiltX = native.tiltX ?? 0
    d.lastTiltY = native.tiltY ?? 0
    e.preventDefault()
    flushDiag()
  }

  const finishStroke = (fromCancel: boolean) => {
    const cur = currentRef.current
    currentRef.current = null
    activeIdRef.current = null
    const d = diagRef.current
    d.currentStrokePoints = 0
    if (!cur) return
    cur.endedAt = Date.now()
    if (fromCancel) {
      d.cancelledStrokes++
      const len = polylineLength(cur.points)
      // システムジェスチャ等でcancelされた場合、実質的な線でなければ破棄
      if (cur.points.length < 3 || len < 4) {
        redrawAll()
        flushDiag()
        return
      }
    }
    strokesRef.current = [...strokesRef.current, cur]
    clearedRef.current = null // 新しく書き始めたら「けす前」への復元はしない
    d.strokeCount = strokesRef.current.length
    cbRef.current.onInkChange?.(strokesRef.current)
    cbRef.current.onStrokeEnd?.(cur, strokesRef.current)
    flushDiag()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activeIdRef.current) return
    finishStroke(false)
    e.preventDefault()
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activeIdRef.current) return
    finishStroke(true)
  }

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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ position: 'relative', display: 'block', width: '100%', touchAction: 'none' }}
      />
      {overlay && <div className="ink-layer ink-layer-top">{overlay}</div>}
    </div>
  )
}
