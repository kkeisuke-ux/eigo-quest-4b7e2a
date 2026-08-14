// データ取得用の共通フック。
import { useCallback, useEffect, useState } from 'react'
import { useAppState } from './store'
import { getProfile, putSetting } from '../storage/repo'
import type { Profile } from '../storage/models'

export interface AsyncData<T> {
  data: T | null
  loading: boolean
  reload: () => void
}

export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncData<T> {
  const version = useAppState((s) => s.dataVersion)
  const [tick, setTick] = useState(0)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetcher()
      .then((d) => {
        if (alive) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('useAsyncData error:', err)
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, reload }
}

export function useProfile(): Profile | null {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData<Profile | null>(
    async () => (profileId ? ((await getProfile(profileId)) ?? null) : null),
    [profileId]
  )
  return data
}

/**
 * 最後に見ていたアルファベットのタブ（おおもじ/こもじ）を記憶する（第21回追補）。
 * こもじの練習から戻るとハブが「おおもじ」タブに戻ってしまう問題の対策。
 * nullを渡している間は記憶しない（読み込み前の既定値で上書きしないため）。
 */
export function useRememberAlphabetKind(kind: 'upper' | 'lower' | null | undefined): void {
  const profileId = useAppState((s) => s.profileId)
  useEffect(() => {
    if (profileId && kind) void putSetting(`alphabetKind:${profileId}`, kind)
  }, [profileId, kind])
}
