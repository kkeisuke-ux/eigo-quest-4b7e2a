// ============================================================
// 文字判定しきい値の設定ファイル（仕様 §14-§16）
// 実機（iPad + Apple Pencil）の子どもの筆記データを使って調整する。
// 「判定デバッグ」画面から一時的に上書きでき、設定として保存もできる。
//
// 座標系:
// - box系   … 練習ボックス（viewBox 100）を1.0に正規化。4線ガイド上の
//              「位置・大きさの帯」を保持する（c と C のサイズ帯の区別に使う）
// - shape系 … 書いた文字のbboxを1.0に正規化。位置・大きさ不問の純粋な字形比較
// 最終コスト = boxCostWeight * box系 + (1 - boxCostWeight) * shape系
// ============================================================

export interface JudgeWeights {
  /** DTW距離（形状＋位置）の重み */
  dtw: number
  /** 離散フレシェ距離の重み */
  frechet: number
  /** 始点距離の重み */
  start: number
  /** 終点距離の重み */
  end: number
  /** 弦方向の角度差（0..1に正規化）の重み */
  angle: number
  /** ストローク長の比率差の重み */
  length: number
  /** 重心距離の重み */
  centroid: number
}

export interface JudgeConfig {
  /** 1画あたりの再サンプリング点数 */
  resampleN: number
  /** DTWのバンド幅（Sakoe-Chiba） */
  dtwBand: number
  /** これより短い入力ストローク（viewBox100系）はゴミとして無視する。iの点があるため小さめ */
  minStrokeLen: number
  weights: JudgeWeights
  /** box系コストの混合比（0..1）。残りがshape系 */
  boxCostWeight: number
  /** 期待文字の平均コスト合格上限（「読める字形」判定。仕様 §14） */
  letterPassCost: number
  /**
   * 「明らかに別の文字を書いている」判定（仕様 §16）:
   * 最良候補が別文字で、そのコストが期待文字より distinctMargin 以上小さく、
   * かつ期待文字コストが letterPassCost * distinctRatio を超えるとき不正解にする。
   */
  distinctMargin: number
  distinctRatio: number
  /** 分類時の画数差ペナルティ（候補との画数差1あたりコスト加算） */
  strokeCountPenalty: number
  /** 「逆方向に書いた」と判定するためのコスト差マージン */
  reverseMargin: number
  /** なぞり練習（1画ずつ）の判定 */
  trace: {
    /** 1画の合格コスト上限（文字bbox正規化空間） */
    passCost: number
    /** 始点はこの半径内から書き始める必要がある（文字bbox正規化空間） */
    startRadius: number
  }
  scoring: {
    /** 書き終わったあと自動判定するまでの待ち時間(ms) */
    autoJudgeDelayMs: number
  }
  samples: {
    /** 端末に保存する筆記サンプル（しきい値調整用）の上限件数 */
    keepMax: number
  }
}

export const DEFAULT_JUDGE_CONFIG: JudgeConfig = {
  resampleN: 28,
  dtwBand: 9,
  minStrokeLen: 2.0,
  weights: {
    dtw: 1.0,
    frechet: 0.35,
    start: 0.4,
    end: 0.4,
    angle: 0.7,
    length: 0.25,
    centroid: 0.5,
  },
  // 2026-08-08 実機フィードバックで大幅に緩和（「文字識別が辛すぎる」）。旧: 0.46/0.6/0.22
  // distinctRatioは緩和とセットで締める（U→O・h→K等の「別の文字を書いたのに正解」を防ぐ）
  // 第31回: 「別の文字や大文字/小文字の取り違えでも○になる」との指摘で締め直した。
  // 許容字形バリアント（ALT_STROKES）の導入で正しい字のコストが大きく下がった（0.15〜0.35）ため、
  // 合格ラインを下げても正しい字は落ちない。boxCostWeightを上げて4線上の大きさ・位置（＝大文字/小文字の
  // 区別）をより重く見る。旧: 0.45 / 0.56
  boxCostWeight: 0.55,
  letterPassCost: 0.5,
  distinctMargin: 0.12,
  distinctRatio: 0.4,
  strokeCountPenalty: 0.18,
  reverseMargin: 0.04,
  trace: {
    passCost: 0.8,
    startRadius: 0.42,
  },
  scoring: {
    // 第26回: 判定までの待ちが地味にストレスとの指摘。書き終わり→○までをさらに短く（旧450→250）
    autoJudgeDelayMs: 250,
  },
  samples: {
    keepMax: 400,
  },
}

// ============================================================
// 文字の判定のきびしさ（仕様 §15）: やさしい / ふつう / きびしい の3段階。
// 初期設定は「やさしい」= きれいさより「読めること」を優先。
// 合格コストしきい値に係数を掛ける。
// ============================================================
// 2026-08-08 実機フィードバックで全段階を甘い方向へ（旧: 1.4 / 1.1 / 0.82）
export const STRICTNESS_FACTORS: Record<number, number> = {
  1: 1.55,
  2: 1.2,
  3: 0.9,
}

export const STRICTNESS_LABELS = ['やさしい', 'ふつう', 'きびしい']

export const DEFAULT_STRICTNESS = 1

export function applyStrictness(cfg: JudgeConfig, level: number): JudgeConfig {
  const lv = Math.min(3, Math.max(1, Math.round(level || DEFAULT_STRICTNESS)))
  const f = STRICTNESS_FACTORS[lv] ?? 1
  if (f === 1) return cfg
  // なぞりは位置ガイドが見えているので緩めすぎない（隣の画への誤マッチ防止）
  const traceF = Math.min(1.15, Math.max(0.85, f))
  return {
    ...cfg,
    letterPassCost: cfg.letterPassCost * f,
    trace: {
      passCost: cfg.trace.passCost * traceF,
      startRadius: cfg.trace.startRadius,
    },
  }
}

export type JudgeConfigPatch = {
  [K in keyof JudgeConfig]?: JudgeConfig[K] extends object ? Partial<JudgeConfig[K]> : JudgeConfig[K]
}

export function mergeJudgeConfig(base: JudgeConfig, patch?: JudgeConfigPatch | null): JudgeConfig {
  if (!patch) return base
  return {
    ...base,
    ...patch,
    weights: { ...base.weights, ...(patch.weights ?? {}) },
    trace: { ...base.trace, ...(patch.trace ?? {}) },
    scoring: { ...base.scoring, ...(patch.scoring ?? {}) },
    samples: { ...base.samples, ...(patch.samples ?? {}) },
  } as JudgeConfig
}
