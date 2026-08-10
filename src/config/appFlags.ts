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
  /** 設定画面で選んだ英語音声のvoiceURI（null=自動で選ぶ。第11回） */
  voiceUri: string | null
}

export const DEFAULT_FLAGS: AppFlags = {
  allowTouchInk: false,
  seOn: true,
  bgmOn: true,
  // 2026-08-08 第9回: 「発音をもっと大きく・BGMは小さくてよい」→ BGMをさらに下げて
  // 発音（TTSは既に最大音量）を相対的に際立たせる
  // 2026-08-09 第10回: 効果音も下げて発音をさらに聞き取りやすく（0.5→0.35）
  bgmVolume: 0.03,
  seVolume: 0.35,
  voiceVolume: 1.0,
  voiceUri: null,
}

let flags: AppFlags = { ...DEFAULT_FLAGS }

export async function loadAppFlags(): Promise<void> {
  try {
    // 2026-08-08フィードバック: 「発音はもっと大きく・BGMはもっと小さく」。
    // 旧デフォルト値（voice 0.9 / bgm 0.12）のまま保存されているプロフィールは
    // 新デフォルトへ引き上げ/引き下げる（手動で変えた値はそのまま尊重）
    const near = (a: number, b: number) => Math.abs(a - b) < 0.005
    let savedVoice = await getSetting<number>('voiceVolume')
    if (savedVoice != null && near(savedVoice, 0.9)) {
      savedVoice = DEFAULT_FLAGS.voiceVolume
      await putSetting('voiceVolume', savedVoice)
    }
    let savedBgm = await getSetting<number>('bgmVolume')
    if (savedBgm != null && (near(savedBgm, 0.12) || near(savedBgm, 0.06))) {
      savedBgm = DEFAULT_FLAGS.bgmVolume
      await putSetting('bgmVolume', savedBgm)
    }
    // 第10回: 旧デフォルトの効果音0.5のままなら新デフォルト0.35へ（手動変更値は尊重）
    let savedSe = await getSetting<number>('seVolume')
    if (savedSe != null && near(savedSe, 0.5)) {
      savedSe = DEFAULT_FLAGS.seVolume
      await putSetting('seVolume', savedSe)
    }
    flags = {
      allowTouchInk: (await getSetting<boolean>('allowTouchInk')) ?? DEFAULT_FLAGS.allowTouchInk,
      seOn: (await getSetting<boolean>('seOn')) ?? DEFAULT_FLAGS.seOn,
      bgmOn: (await getSetting<boolean>('bgmOn')) ?? DEFAULT_FLAGS.bgmOn,
      bgmVolume: savedBgm ?? DEFAULT_FLAGS.bgmVolume,
      seVolume: savedSe ?? DEFAULT_FLAGS.seVolume,
      voiceVolume: savedVoice ?? DEFAULT_FLAGS.voiceVolume,
      voiceUri: (await getSetting<string | null>('voiceUri')) ?? DEFAULT_FLAGS.voiceUri,
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

/** 英語音声の選択を保存（null=自動。第11回） */
export async function setVoiceUri(uri: string | null): Promise<void> {
  flags = { ...flags, voiceUri: uri }
  await putSetting('voiceUri', uri)
}

export async function setVolume(kind: 'bgm' | 'se' | 'voice', value: number): Promise<void> {
  const v = Math.min(1, Math.max(0, value))
  if (kind === 'bgm') flags = { ...flags, bgmVolume: v }
  else if (kind === 'se') flags = { ...flags, seVolume: v }
  else flags = { ...flags, voiceVolume: v }
  await putSetting(`${kind}Volume`, v)
}
