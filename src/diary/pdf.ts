// 絵日記のPDF出力（仕様 §33）。
// 外部ライブラリを使わず、印刷用ウィンドウ（A4縦レイアウト）を開いて window.print() する。
// iPad Safariでは印刷ダイアログから「PDFとして保存 / 共有」ができる（README参照）。
import type { DiaryEntryRecord, StoredStroke } from '../storage/models'
import { TEXT_ROWS_LEGACY, textImageHeightRatio } from './layout'

/** 保存済みストロークをキャンバスへ再描画してPNG dataURLにする */
export function strokesToDataUrl(
  strokes: StoredStroke[],
  srcWidth: number,
  outWidth: number,
  outHeight: number,
  lineWidth = 4,
  color = '#233047'
): string {
  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outWidth, outHeight)
  const scale = outWidth / Math.max(srcWidth, 1)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    if (s.points.length === 0) continue
    const tool = s.tool ?? 'pen'
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.globalAlpha = tool === 'brush' ? 0.45 : 1
    const base = s.width ?? lineWidth
    ctx.strokeStyle = s.color ?? color
    ctx.lineWidth = (tool === 'brush' ? base * 2.6 : tool === 'eraser' ? base * 3.4 : base) * scale
    ctx.beginPath()
    ctx.moveTo(s.points[0][0] * scale, s.points[0][1] * scale)
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i][0] * scale, s.points[i][1] * scale)
    }
    if (s.points.length === 1) {
      ctx.lineTo(s.points[0][0] * scale + 0.5, s.points[0][1] * scale + 0.5)
    }
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  return canvas.toDataURL('image/png')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export interface DiaryPdfOptions {
  /** 添削後の英文もPDFへ含める（仕様 §33: 選択できる） */
  includeCorrection: boolean
  profileName: string
}

/** 1日分の絵日記を印刷用ウィンドウで開く。ユーザーはそこからPDF保存できる */
export function printDiary(entry: DiaryEntryRecord, opts: DiaryPdfOptions): boolean {
  const d = new Date(`${entry.dateKey}T00:00:00`)
  const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  const drawingH = entry.drawingSize > 0 ? 0.72 : 0.72
  const drawingUrl = strokesToDataUrl(entry.drawing, entry.drawingSize || 800, 1200, Math.round(1200 * drawingH), 4)
  // 英文エリアの高さは実際に書かれた範囲から決める（1行時代の旧データと3行データの両対応）
  let textUrl: string | null = null
  if (entry.textStrokes.length > 0) {
    const srcW = entry.textBoxWidth || 800
    const maxY = Math.max(...entry.textStrokes.flatMap((s) => s.points.map((p) => p[1])), srcW * 0.15)
    // 行数ぶんの高さまでは必ず出す（5行書いたのに3行までしか印刷されない問題の修正。第25回）
    const hRatio = textImageHeightRatio(maxY, srcW, entry.textRows ?? TEXT_ROWS_LEGACY)
    textUrl = strokesToDataUrl(entry.textStrokes, srcW, 1200, Math.round(1200 * hRatio), 3.5)
  }

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>えいご絵日記 ${esc(dateLabel)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Hiragino Maru Gothic ProN", "BIZ UDGothic", "Yu Gothic", sans-serif; color: #2c3a52; margin: 0; }
  .sheet { max-width: 182mm; margin: 0 auto; }
  h1 { font-size: 18px; border-bottom: 3px solid #1c9b7c; padding-bottom: 6px; margin: 0 0 4mm; display: flex; justify-content: space-between; align-items: baseline; }
  h1 .name { font-size: 13px; color: #6b7a90; font-weight: normal; }
  .drawing { width: 100%; border: 2px solid #cfd8e6; border-radius: 8px; }
  .textimg { width: 100%; border: 1px dashed #cfd8e6; border-radius: 8px; margin-top: 3mm; }
  .sentence { font-size: 17px; line-height: 1.7; margin: 3mm 0 0; padding: 3mm 4mm; background: #f4f8f4; border-radius: 8px; white-space: pre-wrap; }
  .label { font-size: 11px; color: #6b7a90; margin: 4mm 0 1mm; }
  .corrected { background: #fdf6e0; }
  .note { font-size: 11px; color: #8a6d2f; margin: 1mm 0 0; }
  @media print { .noprint { display: none; } }
  .noprint { text-align: center; margin: 6mm 0; }
  .noprint button { font-size: 16px; padding: 8px 22px; border-radius: 999px; border: none; background: #1c9b7c; color: #fff; }
</style>
</head>
<body>
  <div class="sheet">
    <h1><span>えいご絵日記　${esc(dateLabel)}</span><span class="name">${esc(opts.profileName)}</span></h1>
    <img class="drawing" src="${drawingUrl}" alt="えにっきの絵">
    ${textUrl ? `<div class="label">じぶんで かいた えいぶん</div><img class="textimg" src="${textUrl}" alt="てがきの英文">` : ''}
    ${entry.originalText ? `<div class="label">あなたの文</div><div class="sentence">${esc(entry.originalText)}</div>` : ''}
    ${
      opts.includeCorrection && entry.correctedText
        ? `<div class="label">こう書くと もっと自然だよ</div>
           <div class="sentence corrected">${esc(entry.correctedText)}</div>
           ${entry.correctionNotes.map((n) => `<div class="note">・${esc(n)}</div>`).join('')}`
        : ''
    }
    <div class="noprint"><button onclick="window.print()">いんさつ / PDFほぞん</button></div>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 350))</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
