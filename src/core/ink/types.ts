// Apple Pencil入力の型定義。
// 1画 = pointerdown → pointermove → pointerup（仕様 §3）。
// 完成画像ではなく、必ず1画ごとの軌跡・筆圧・傾きを保持する。

export interface InkPoint {
  /** キャンバスCSS px座標 */
  x: number
  y: number
  /** event.timeStamp (ms) */
  t: number
  /** 筆圧 0..1（Apple Pencilは実測値、マウスは0.5相当） */
  p: number
  tiltX: number
  tiltY: number
}

export interface InkStroke {
  id: number
  /** 'pen' | 'touch' | 'mouse' */
  pointerType: string
  points: InkPoint[]
  /** getCoalescedEvents() が利用されたか */
  usedCoalesced: boolean
  startedAt: number
  endedAt: number
  /** ストローク色（絵日記の色ペン用。未設定は描画時のpenColor） */
  color?: string
  /** ストローク基準太さ（未設定は描画時のbaseWidth） */
  width?: number
  /** 描画ツール（絵日記用）。pen=通常 / brush=太く半透明の筆 / eraser=消しゴム */
  tool?: 'pen' | 'brush' | 'eraser'
}

export interface InkDiagnostics {
  lastPointerType: string | null
  lastPressure: number
  lastTiltX: number
  lastTiltY: number
  coalescedSupported: boolean
  /** 直近のpointermoveで取得できた点数（coalesced含む） */
  lastEventPointCount: number
  currentStrokePoints: number
  strokeCount: number
  /** 手のひら・指などtouchをインク化せず弾いた回数（palm rejectionの動作確認用） */
  rejectedTouchCount: number
  /** pointercancelで破棄された画数 */
  cancelledStrokes: number
}

export function emptyDiagnostics(): InkDiagnostics {
  return {
    lastPointerType: null,
    lastPressure: 0,
    lastTiltX: 0,
    lastTiltY: 0,
    coalescedSupported:
      typeof window !== 'undefined' &&
      typeof window.PointerEvent !== 'undefined' &&
      'getCoalescedEvents' in window.PointerEvent.prototype,
    lastEventPointCount: 0,
    currentStrokePoints: 0,
    strokeCount: 0,
    rejectedTouchCount: 0,
    cancelledStrokes: 0,
  }
}
