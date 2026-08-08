// アプリ全体のフラグ・音量設定（設定画面から変更、IndexedDBに保存）。
// 音量は3系統独立（仕様 §37）: BGM=かなり小さめ / 効果音=中程度 / 英語音声=大きめ
import { getSetting, putSetting } from '../storage/repo'
import { bumpData } from '../state/store'

export interface AppFlags {
  /** 指（touch）でも書けるようにする。既定false＝Apple Pencil/マウスのみ（仕様 §4） */
  allowTouchInk: boolean
  /** 効果音 ON/OFF */
  seOn: boolean
  /** BGM ON/OFF（仕様 §36） */
  bgmOn: boolean
  /** BGM音量 0..1（初期値: かなり小さめ） */
  bgmVolume: number
  /** 効果音音量 0..1（初期値: 中程度） */
  seVolume: number
  /** 英語音声音量 0..1（初期値: 大きめ） */
  voiceVolume: number
}

export const DEFAULT_FLAGS: AppFlags = {
  allowTouchInk: false,
  seOn: true,
  bgmOn: true,
  bgmVolume: 0.12,
  seVolume: 0.5,
  voiceVolume: 0.9,
}

let flags: AppFlags = { ...DEFAULT_FLAGS }

export async function loadAppFlags(): Promise<void> {
  try {
    flags = {
      allowTouchInk: (await getSetting<boolean>('allowTouchInk')) ?? DEFAULT_FLAGS.allowTouchInk,
      seOn: (await getSetting<boolean>('seOn')) ?? DEFAULT_FLAGS.seOn,
      bgmOn: (await getSetting<boolean>('bgmOn')) ?? DEFAULT_FLAGS.bgmOn,
      bgmVolume: (await getSetting<number>('bgmVolume')) ?? DEFAULT_FLAGS.bgmVolume,
      seVolume: (await getSetting<number>('seVolume')) ?? DEFAULT_FLAGS.seVolume,
      voiceVolume: (await getSetting<number>('voiceVolume')) ?? DEFAULT_FLAGS.voiceVolume,
    }
  } catch {
    flags = { ...DEFAULT_FLAGS }
  }
}

export function getAppFlags(): AppFlags {
  return flags
}

export async function setAllowTouchInk(value: boolean): Promise<void> {
  flags = { ...flags, allowTouchInk: value }
  await putSetting('allowTouchInk', value)
  bumpData()
}

export async function setSeOn(value: boolean): Promise<void> {
  flags = { ...flags, seOn: value }
  await putSetting('seOn', value)
}

export async function setBgmOn(value: boolean): Promise<void> {
  flags = { ...flags, bgmOn: value }
  await putSetting('bgmOn', value)
}

export async function setVolume(kind: 'bgm' | 'se' | 'voice', value: number): Promise<void> {
  const v = Math.min(1, Math.max(0, value))
  if (kind === 'bgm') flags = { ...flags, bgmVolume: v }
  else if (kind === 'se') flags = { ...flags, seVolume: v }
  else flags = { ...flags, voiceVolume: v }
  await putSetting(`${kind}Volume`, v)
}
