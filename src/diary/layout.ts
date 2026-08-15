// 絵日記のレイアウト定数（編集画面・一覧サムネ・PDFで共有する）。
// 英文エリアは「1行=幅の TEXT_ROW_ASPECT 倍」の高さで、行数ぶん積み上げる。
// ここを共有していないと、5行書いたのに一覧やPDFでは3行までしか出ない、といったズレが起きる。

/** 英文エリアの1行あたりの高さ/幅比（3行時代の 0.42/3 を維持） */
export const TEXT_ROW_ASPECT = 0.14
/** 英文エリアの既定行数（第20回で3→5）。旧データは textRows 未保存＝3行 */
export const TEXT_ROWS_DEFAULT = 5
/** 旧データ（textRows未保存）の行数 */
export const TEXT_ROWS_LEGACY = 3

/** 英文エリア全体の高さ/幅比（行数ぶん＋わずかな余白） */
export function textAreaAspect(rows: number): number {
  return TEXT_ROW_ASPECT * rows
}

/**
 * 一覧サムネ・PDFで使う英文エリアの高さ比。
 * 実際に書かれた範囲に合わせつつ、**行数ぶんの高さ**までは必ず出せるようにする。
 */
export function textImageHeightRatio(maxY: number, srcWidth: number, rows: number): number {
  const cap = textAreaAspect(rows) + 0.02
  const used = (maxY + srcWidth * 0.03) / Math.max(srcWidth, 1)
  return Math.min(cap, Math.max(used, 0.15))
}
