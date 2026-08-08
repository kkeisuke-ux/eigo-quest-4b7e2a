// アプリ全体の軽量ストア（外部ライブラリ非依存、useSyncExternalStore利用）。
import { useSyncExternalStore } from 'react'

export type AlphabetKind = 'upper' | 'lower'

export type Route =
  | { name: 'profiles' }
  | { name: 'home' }
  | { name: 'alphabet' }
  | { name: 'alphabetLearn'; kind: AlphabetKind; startIndex?: number }
  | { name: 'alphabetTest'; kind: AlphabetKind }
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

export interface PendingEvolution {
  speciesId: string
  fromStage: number
  toStage: number
  fromName: string
  toName: string
}

export interface AppState {
  route: Route
  profileId: string | null
  /** データ更新の通知カウンタ（useAsyncDataの再取得トリガ） */
  dataVersion: number
  /** 音設定変更の通知カウンタ（SoundButtonの再描画用） */
  soundVersion: number
  toasts: ToastItem[]
  pendingEvolution: PendingEvolution | null
}

let state: AppState = {
  route: { name: 'profiles' },
  profileId: null,
  dataVersion: 0,
  soundVersion: 0,
  toasts: [],
  pendingEvolution: null,
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

export function setPendingEvolution(p: PendingEvolution | null) {
  setState({ pendingEvolution: p })
}
