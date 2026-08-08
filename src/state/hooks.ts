// データ取得用の共通フック。
import { useCallback, useEffect, useState } from 'react'
import { useAppState } from './store'
import { getProfile } from '../storage/repo'
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
