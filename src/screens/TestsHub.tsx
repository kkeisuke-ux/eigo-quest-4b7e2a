// まとめテスト一覧（第24回で全面改編）。
// 旧「学期ごと1本」は語彙拡充後は長すぎるため、
// 4ステージ（最大20問）ごとの通し番号テスト「まとめテスト N」に分割した。
// レベルタブつき（れんしゅう一覧とタブ選択を共有。第21回のstageMapLevelを利用）。
import { useState } from 'react'
import { LEVELS, TERM_TESTS, playableLevels } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getSetting, getTestSession, listTestResults, listWordProgress, putSetting } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'

interface TestEntry {
  id: string
  label: string
  rangeLabel: string
  practicedCount: number
  totalCount: number
  perfectCount: number
  best: { correct: number; total: number } | null
  hasSession: boolean
}

export function TestsHub() {
  const profileId = useAppState((s) => s.profileId)
  const [levelId, setLevelId] = useState<string | null>(null)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const [progress, results, savedLevelId] = await Promise.all([
      listWordProgress(profileId),
      listTestResults(profileId),
      getSetting<string>(`stageMapLevel:${profileId}`),
    ])
    const practiced = new Set(progress.filter((p) => p.practicedAt != null).map((p) => p.wordId))
    return { practiced, results, savedLevelId: savedLevelId ?? null }
  }, [profileId])

  const { data: entries } = useAsyncData(async () => {
    if (!profileId || !data) return null
    const levels = playableLevels()
    const active = levels.find((lv) => lv.id === (levelId ?? data.savedLevelId)) ?? levels[0]
    const list: TestEntry[] = []
    for (const test of TERM_TESTS.filter((t) => t.levelId === active.id)) {
      const runs = data.results.filter((r) => r.kind === 'term' && r.targetId === test.id)
      let best: TestEntry['best'] = null
      let perfectCount = 0
      for (const r of runs) {
        if (!best || r.correct > best.correct) best = { correct: r.correct, total: r.total }
        if (r.total > 0 && r.correct === r.total) perfectCount++
      }
      const session = await getTestSession(profileId, `term:${test.id}`)
      list.push({
        id: test.id,
        label: test.label,
        rangeLabel: test.rangeLabel,
        practicedCount: test.wordIds.filter((w) => data.practiced.has(w)).length,
        totalCount: test.wordIds.length,
        perfectCount,
        best,
        hasSession: session != null && session.currentIndex > 0,
      })
    }
    return { list, activeId: active.id }
  }, [profileId, data, levelId])

  if (!data || !entries) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="まとめテスト" back={{ name: 'home' }} />
      <div className="map-scroll">
        <div className="row gap tab-row wrap">
          {LEVELS.map((lv) => (
            <Button
              key={lv.id}
              size="sm"
              variant={lv.id === entries.activeId ? 'primary' : 'secondary'}
              disabled={lv.terms.length === 0}
              onClick={() => {
                setLevelId(lv.id)
                if (profileId) void putSetting(`stageMapLevel:${profileId}`, lv.id)
              }}
            >
              {lv.label}
            </Button>
          ))}
        </div>
        <p className="tile-sub map-note">1つの テストは さいだい20問。もんだいは まいかい ランダムに でるよ</p>
        {entries.list.map((e) => (
          <Card key={e.id} className={`termtest-card ${e.perfectCount > 0 ? 'termtest-card-perfect' : ''}`}>
            <div className="termtest-head">
              <span className="termtest-title">
                {e.perfectCount > 0 && <span className="crown">👑</span>}
                {e.label}
                <span className="termtest-range">（{e.rangeLabel}）</span>
              </span>
              <span className={`stage-clear ${e.perfectCount === 0 ? 'stage-clear-zero' : ''}`}>100点 {e.perfectCount}回</span>
            </div>
            <p className="tile-sub">
              しゅつだい: {e.totalCount}問（れんしゅうずみ {e.practicedCount}語）
            </p>
            {e.best ? (
              e.best.correct === e.best.total ? (
                <p className="termtest-status termtest-status-perfect">100点 たっせい！ なんども ちょうせんして きろくを のばそう</p>
              ) : (
                <p className="termtest-status">
                  さいこう {e.best.correct}/{e.best.total}問　—　<b>100点まで あと{e.best.total - e.best.correct}問！</b>
                </p>
              )
            ) : (
              <p className="termtest-status">まだ ちょうせんしていないよ</p>
            )}
            {e.hasSession && <p className="stage-resume">とちゅうの きろくあり（つづきから できるよ）</p>}
            <Button variant={e.perfectCount > 0 ? 'secondary' : 'accent'} onClick={() => navigate({ name: 'termTest', termId: e.id })}>
              {e.best && e.best.correct !== e.best.total ? '100点に ちょうせん！' : 'ちょうせんする'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
