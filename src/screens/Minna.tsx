// みんな画面（第22回で視覚重視に刷新。かんじクエスト第37回と同型）:
// 各利用者の「おぼえたたんご」「アルファベット」「５もんテスト100点」「まとめテスト100点」「ずかん」を
// 大きな数字で見比べられるダッシュボード。称号バッジつき。
// 順位付けはしない（仕様 §30）。細かい学期別リストは廃止（情報過多のため）。
import { totalDexEntries } from '../data/species'
import { ACTIVE_STAGE_IDS, LEVELS, TERM_TEST_TOTAL, perfectTermTestIds } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import { alphabetMasteryCounts, listDex, listProfiles, listTestResults, listWordProgress } from '../storage/repo'
import { Card, LoadingView, TopBar } from '../ui/components'
import { rankCountFor } from '../game/ranks'
import { RankChip } from '../ui/RankBadge'

interface ProfileDash {
  id: string
  name: string
  color: string
  words: number
  alphabet: number
  stageCleared: number
  termCleared: number
  dexCount: number
  /** 100点をとったまとめテストの本数（称号ランク） */
  perfectCount: number
}

export function Minna() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData<{
    dash: ProfileDash[]
    totals: { words: number; alphabet: number; stages: number; terms: number; dex: number }
  } | null>(async () => {
    const profiles = await listProfiles()
    const totals = {
      words: LEVELS.flatMap((lv) => lv.terms.flatMap((t) => t.stages)).flatMap((s) => s.wordIds).length,
      alphabet: 52,
      stages: ACTIVE_STAGE_IDS.size,
      terms: TERM_TEST_TOTAL,
      dex: totalDexEntries(),
    }
    const dash = await Promise.all(
      profiles.map(async (p) => {
        const [progress, results, alpha, dex] = await Promise.all([
          listWordProgress(p.id),
          listTestResults(p.id),
          alphabetMasteryCounts(p.id),
          listDex(p.id),
        ])
        const stagePerfect = new Set<string>()
        for (const r of results) {
          if (r.kind === 'stage' && r.total > 0 && r.correct === r.total && ACTIVE_STAGE_IDS.has(r.targetId)) {
            stagePerfect.add(r.targetId)
          }
        }
        const termPerfect = perfectTermTestIds(results)
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          words: progress.filter((x) => x.masteredAt != null).length,
          alphabet: alpha.upper + alpha.lower,
          stageCleared: stagePerfect.size,
          termCleared: termPerfect.size,
          dexCount: dex.length,
          perfectCount: rankCountFor(termPerfect.size, alpha.upper, alpha.lower),
        }
      })
    )
    return { dash, totals }
  }, [profileId])

  if (!data) return <LoadingView />
  const { dash, totals } = data

  const stat = (icon: string, label: string, value: number, total: number, unit = '') => (
    <div className="stat-card minna-stat">
      <span className="stat-label">
        {icon} {label}
      </span>
      <span className="stat-num">
        {value}
        <small>
          {' '}
          / {total}
          {unit}
        </small>
      </span>
      <div className="masterbar">
        <div className="masterbar-fill" style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  )

  return (
    <div className="screen">
      <TopBar title="みんな" back={{ name: 'home' }} />
      <div className="map-scroll">
        <p className="tile-sub minna-note">じゅんいは ないよ。みんな それぞれの ペースで がんばろう！</p>
        <div className="minna-dash">
          {dash.map((d) => (
            <Card key={d.id} className="minna-profile-card">
              <div className="minna-head">
                <span className="avatar" style={{ background: d.color }}>
                  {d.name.slice(0, 1)}
                </span>
                <p className="minna-name">
                  {d.name}
                  <RankChip perfectCount={d.perfectCount} />
                </p>
              </div>
              <div className="stat-row minna-stat-row">
                {stat('📖', 'おぼえた たんご', d.words, totals.words, '語')}
                {stat('🔤', 'アルファベット', d.alphabet, totals.alphabet, '字')}
                {stat('✏️', '５もんテスト 100点', d.stageCleared, totals.stages, 'ステージ')}
                {stat('💮', 'まとめテスト 100点', d.termCleared, totals.terms, 'テスト')}
                {stat('📔', 'ずかん', d.dexCount, totals.dex, 'しゅるい')}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
