// みんな画面（仕様 §53）: 兄弟姉妹の到達状況を横並びで比較（順位付けはしない）。
// - 覚えた大文字数/26・小文字数/26・覚えた英単語数
// - 各学年相当・各学期まとめテストの最高点
// - 図鑑の仲間数
import { totalDexEntries } from '../data/species'
import { playableLevels, termClearLevelLabel, termId, termLabel } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import {
  alphabetMasteryCounts,
  listDex,
  listProfiles,
  listTestResults,
  listWordProgress,
} from '../storage/repo'
import { Card, LoadingView, TopBar } from '../ui/components'

interface ProfileDash {
  id: string
  name: string
  color: string
  /** まとめテスト100点の最高到達レベル（第13回） */
  termLevel: string | null
  upper: number
  lower: number
  words: number
  dexCount: number
  terms: { label: string; best: { correct: number; total: number } | null; perfectCount: number }[]
}

export function Minna() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    const profiles = await listProfiles()
    const dash: ProfileDash[] = await Promise.all(
      profiles.map(async (p) => {
        const [progress, results, alpha, dex] = await Promise.all([
          listWordProgress(p.id),
          listTestResults(p.id),
          alphabetMasteryCounts(p.id),
          listDex(p.id),
        ])
        const termBest = new Map<string, { correct: number; total: number }>()
        const termPerfect = new Map<string, number>()
        for (const r of results) {
          if (r.kind !== 'term') continue
          const best = termBest.get(r.targetId)
          if (!best || r.correct > best.correct) termBest.set(r.targetId, { correct: r.correct, total: r.total })
          if (r.total > 0 && r.correct === r.total) termPerfect.set(r.targetId, (termPerfect.get(r.targetId) ?? 0) + 1)
        }
        const terms: ProfileDash['terms'] = []
        for (const level of playableLevels()) {
          for (const term of level.terms) {
            if (term.stages.length === 0) continue
            const tid = termId(level.id, term.index)
            terms.push({
              label: `${level.label}${termLabel(term.index)}`,
              best: termBest.get(tid) ?? null,
              perfectCount: termPerfect.get(tid) ?? 0,
            })
          }
        }
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          termLevel: termClearLevelLabel(termPerfect.keys()),
          upper: alpha.upper,
          lower: alpha.lower,
          words: progress.filter((x) => x.masteredAt != null).length,
          dexCount: dex.length,
          terms,
        }
      })
    )
    return { dash, dexTotal: totalDexEntries() }
  }, [profileId])

  if (!data) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="みんな" back={{ name: 'home' }} />
      <div className="map-scroll">
        <p className="tile-sub minna-note">じゅんいは ないよ。みんな それぞれの ペースで がんばろう！</p>
        <div className="minna-dash">
          {data.dash.map((d) => (
            <Card key={d.id} className="minna-profile-card">
              <div className="minna-head">
                <span className="avatar" style={{ background: d.color }}>
                  {d.name.slice(0, 1)}
                </span>
                <p className="minna-name">
                  {d.name}
                  {d.termLevel && <span className="level-badge">Lv {d.termLevel}</span>}
                </p>
              </div>
              <div className="minna-stats">
                <div className="minna-stat">
                  <span className="minna-stat-label">おおもじ</span>
                  <b>{d.upper}</b> / 26
                </div>
                <div className="minna-stat">
                  <span className="minna-stat-label">こもじ</span>
                  <b>{d.lower}</b> / 26
                </div>
                <div className="minna-stat">
                  <span className="minna-stat-label">たんご</span>
                  <b>{d.words}</b>語
                </div>
                <div className="minna-stat">
                  <span className="minna-stat-label">ずかん</span>
                  <b>{d.dexCount}</b> / {data.dexTotal}
                </div>
              </div>
              <div className="minna-terms">
                {d.terms.map((t) => (
                  <div key={t.label} className="minna-term-row">
                    <span className="minna-term-label">{t.label}</span>
                    <span className="minna-term-best">
                      {t.best ? `さいこう ${t.best.correct}/${t.best.total}` : 'ー'}
                    </span>
                    {t.perfectCount > 0 && <span className="stage-clear">👑100点 {t.perfectCount}回</span>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
