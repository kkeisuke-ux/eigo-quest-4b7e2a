// アプリ全体の軽量ストア（外部ライブラリ非依存、useSyncExternalStore利用）。
import { useSyncExternalStore } from 'react'

export type AlphabetKind = 'upper' | 'lower'

export type Route =
  | { name: 'profiles' }
  | { name: 'tutorial' }
  | { name: 'home' }
  | { name: 'alphabet' }
  | { name: 'alphabetLearn'; kind: AlphabetKind; startIndex?: number; letters?: string[] }
  | { name: 'alphabetTest'; kind: AlphabetKind; letters?: string[] }
  | { name: 'stages' }
  | { name: 'learn'; stageId: string }
  | { name: 'stageTest'; stageId: string }
  | { name: 'tests' }
  | { name: 'termTest'; termId: string }
  | { name: 'review'; mode: 'due' | 'unknown'; wordIds?: string[] }
  | { name: 'unknownList' }
  | { name: 'myWords' }
  | { name: 'diary' }
  | { name: 'diaryEdit'; dateKey: string }
  | { name: 'gacha' }
  | { name: 'friends' }
  | { name: 'dex' }
  | { name: 'minna' }
  | { name: 'settings' }
  | { name: 'pencilDiag' }
  | { name: 'judgeDebug' }

export interface ToastItem {
  id: number
  text: string
}

/** コイン獲得の演出（右上バッジへ「+N」が飛ぶ。仕様フィードバック 2026-08-08） */
export interface CoinFxItem {
  id: number
  amount: number
}

export interface PendingEvolution {
  speciesId: string
  fromStage: number
  toStage: number
  fromName: string
  toName: string
}

export interface PendingLevelUp {
  speciesId: string
  stage: number
  fromLevel: number
  toLevel: number
  name: string
}

export interface AppState {
  route: Route
  profileId: string | null
  /** データ更新の通知カウンタ（useAsyncDataの再取得トリガ） */
  dataVersion: number
  /** 音設定変更の通知カウンタ（SoundButtonの再描画用） */
  soundVersion: number
  toasts: ToastItem[]
  coinFx: CoinFxItem[]
  /** 進化演出の待ち行列。まとめてスターをあげたとき、姿が変わるたびに1つずつ見せる（第31回） */
  pendingEvolutions: PendingEvolution[]
  /** レベルアップ演出のキュー（進化がないレベルアップ用。第22回） */
  pendingLevelUp: PendingLevelUp | null
}

let state: AppState = {
  route: { name: 'profiles' },
  profileId: null,
  dataVersion: 0,
  soundVersion: 0,
  toasts: [],
  coinFx: [],
  pendingEvolutions: [],
  pendingLevelUp: null,
}

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function getState(): AppState {
  return state
}

export function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch }
  emit()
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export function navigate(route: Route) {
  setState({ route })
}

export function selectProfile(profileId: string | null) {
  setState({ profileId })
}

/** DB書き込み後に呼ぶと、useAsyncDataを使う画面が再取得する */
export function bumpData() {
  setState({ dataVersion: state.dataVersion + 1 })
}

export function bumpSound() {
  setState({ soundVersion: state.soundVersion + 1 })
}

let toastSeq = 0

export function showToast(text: string) {
  const id = ++toastSeq
  setState({ toasts: [...state.toasts, { id, text }] })
  setTimeout(() => {
    setState({ toasts: getState().toasts.filter((t) => t.id !== id) })
  }, 2600)
}

export function pushEvolutions(list: PendingEvolution[]) {
  if (list.length === 0) return
  setState({ pendingEvolutions: [...state.pendingEvolutions, ...list] })
}

/** 先頭の演出を見おわった（次があれば続けて見せる） */
export function shiftEvolution() {
  setState({ pendingEvolutions: state.pendingEvolutions.slice(1) })
}

export function clearEvolutions() {
  setState({ pendingEvolutions: [] })
}

export function setPendingLevelUp(p: PendingLevelUp | null) {
  setState({ pendingLevelUp: p })
}

let coinFxSeq = 0

/** コイン獲得の視覚演出を出す（右上に「+N」がポップして消える） */
export function showCoinFx(amount: number) {
  if (amount <= 0) return
  const id = ++coinFxSeq
  setState({ coinFx: [...state.coinFx, { id, amount }] })
  setTimeout(() => {
    setState({ coinFx: getState().coinFx.filter((c) => c.id !== id) })
  }, 1900)
}
