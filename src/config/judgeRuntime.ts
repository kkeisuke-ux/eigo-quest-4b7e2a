// 判定設定のランタイム管理: 既定値 + 端末に保存した上書き（判定デバッグ画面で調整）
// + プロフィールごとの「きびしさ」設定。
import {
  DEFAULT_JUDGE_CONFIG,
  DEFAULT_STRICTNESS,
  applyStrictness,
  mergeJudgeConfig,
  type JudgeConfig,
  type JudgeConfigPatch,
} from './judgeConfig'
import { getSetting, putSetting } from '../storage/repo'
import { bumpData } from '../state/store'

const SETTING_KEY = 'judgeOverrides'

let overrides: JudgeConfigPatch | null = null
let merged: JudgeConfig = DEFAULT_JUDGE_CONFIG
let strictness = DEFAULT_STRICTNESS

/** プロフィール選択時・設定変更時に呼ぶ */
export function setStrictnessRuntime(level: number | undefined | null): void {
  strictness = Math.min(5, Math.max(1, Math.round(level ?? DEFAULT_STRICTNESS)))
}

export function getStrictnessRuntime(): number {
  return strictness
}

/** 実プレイで使う判定設定（きびしさ設定を反映済み） */
export function getEffectiveJudgeConfig(): JudgeConfig {
  return applyStrictness(merged, strictness)
}

/** アプリ起動時に一度呼ぶ */
export async function loadJudgeOverrides(): Promise<void> {
  try {
    overrides = (await getSetting<JudgeConfigPatch>(SETTING_KEY)) ?? null
  } catch {
    overrides = null
  }
  merged = mergeJudgeConfig(DEFAULT_JUDGE_CONFIG, overrides)
}

export function getJudgeConfig(): JudgeConfig {
  return merged
}

export function getJudgeOverrides(): JudgeConfigPatch | null {
  return overrides
}

export async function saveJudgeOverrides(patch: JudgeConfigPatch | null): Promise<void> {
  overrides = patch
  merged = mergeJudgeConfig(DEFAULT_JUDGE_CONFIG, overrides)
  await putSetting(SETTING_KEY, patch)
  bumpData()
}
