// まとめテスト専用ページ（仕様 §25-§26）。
// - 各学年相当×学期の まとめテストを一覧表示
// - 最高得点・ぜんもんせいかい回数・途中保存の有無を表示。再挑戦で記録を更新できる
import { GAME_CONFIG } from '../config/gameConfig'
import { playableLevels, termId, termLabel, termTestTitle, termWordIds } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getTestSession, listTestResults, listWordProgress } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'

interface TermEntry {
  termId: string
  title: string
  practicedCount: number
  totalCount: number
  perfectCount: number
  best: { correct: number; total: number } | null
  hasSession: boolean
}

export function TestsHub() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const [progress, results] = await Promise.all([listWordProgress(profileId), listTestResults(profileId)])
    const practiced = new Set(progress.filter((p) => p.practicedAt != null).map((p) => p.wordId))
    const entries: TermEntry[] = []
    for (const level of playableLevels()) {
      for (const term of level.terms) {
        if (term.stages.length === 0) continue
        const tid = termId(level.id, term.index)
        const all = termWordIds(level.id, term.index)
        const termResults = results.filter((r) => r.kind === 'term' && r.targetId === tid)
        let best: TermEntry['best'] = null
        let perfectCount = 0
        for (const r of termResults) {
          if (!best || r.correct > best.correct) best = { correct: r.correct, total: r.total }
          if (r.total > 0 && r.correct === r.total) perfectCount++
        }
        const session = await getTestSession(profileId, `term:${tid}`)
        entries.push({
          termId: tid,
          title: termTestTitle(level.id, term.index),
          practicedCount: all.filter((w) => practiced.has(w)).length,
          totalCount: all.length,
          perfectCount,
          best,
          hasSession: session != null && session.currentIndex > 0,
        })
      }
    }
    return { entries }
  }, [profileId])

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="まとめテスト" back={{ name: 'home' }} />
      <div className="map-scroll">
        <p className="tile-sub map-note">
          その学期の たんごが ぜんぶ つづけて でるよ。とちゅうで やめても つづきから できる。100点は スペシャルボーナス +
          {GAME_CONFIG.coins.termTestPerfectBonus}コイン！
        </p>
        {data.entries.map((e) => (
          <Card key={e.termId} className={`termtest-card ${e.perfectCount > 0 ? 'termtest-card-perfect' : ''}`}>
            <div className="termtest-head">
              <span className="termtest-title">
                {e.perfectCount > 0 && <span className="crown">👑</span>}
                {e.title}
              </span>
              <span className={`stage-clear ${e.perfectCount === 0 ? 'stage-clear-zero' : ''}`}>100点 {e.perfectCount}回</span>
            </div>
            <p className="tile-sub">
              はんい: {e.totalCount}語（れんしゅうずみ {e.practicedCount}語）
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
            <Button
              variant={e.perfectCount > 0 ? 'secondary' : 'accent'}
              onClick={() => navigate({ name: 'termTest', termId: e.termId })}
            >
              {e.best && e.best.correct !== e.best.total ? '100点に ちょうせん！' : 'ちょうせんする'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
