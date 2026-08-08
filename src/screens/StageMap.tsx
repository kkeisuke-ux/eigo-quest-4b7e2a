// 単語ステージマップ: 学習済みの場所が視覚的に分かる（仕様 §9-§10, §25）。
// レベル（ようじ・小N相当）→ 学期 → 5語ステージ の階層で表示する。
import { useState } from 'react'
import { LEVELS, getWord, playableLevels, termLabel } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { getProfile, listTestResults, listUnknownWords, listWordProgress } from '../storage/repo'
import { Button, Card, LoadingView, SectionTitle, TopBar } from '../ui/components'

type ChipState = 'none' | 'practiced' | 'mastered' | 'unknown'

export function StageMap() {
  const profileId = useAppState((s) => s.profileId)
  const [levelId, setLevelId] = useState<string | null>(null)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [progressList, unknown, results] = await Promise.all([
      listWordProgress(profileId),
      listUnknownWords(profileId),
      listTestResults(profileId),
    ])
    const stagePerfect = new Map<string, number>()
    for (const r of results) {
      if (r.kind === 'stage' && r.total > 0 && r.correct === r.total) {
        stagePerfect.set(r.targetId, (stagePerfect.get(r.targetId) ?? 0) + 1)
      }
    }
    return {
      profile,
      stagePerfect,
      progressMap: new Map(progressList.map((p) => [p.wordId, p])),
      unknownSet: new Set(unknown.map((u) => u.wordId)),
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { progressMap, unknownSet, stagePerfect } = data

  const levels = playableLevels()
  const activeLevel = levels.find((lv) => lv.id === levelId) ?? levels[0]

  const chipState = (wordId: string): ChipState => {
    if (unknownSet.has(wordId)) return 'unknown'
    const p = progressMap.get(wordId)
    if (!p) return 'none'
    if (p.masteredAt != null) return 'mastered'
    if (p.practicedAt != null) return 'practiced'
    return 'none'
  }

  return (
    <div className="screen">
      <TopBar title="たんごを れんしゅう" back={{ name: 'home' }} />
      <div className="map-scroll">
        <div className="row gap tab-row wrap">
          {LEVELS.map((lv) => (
            <Button
              key={lv.id}
              size="sm"
              variant={lv.id === activeLevel?.id ? 'primary' : 'secondary'}
              disabled={lv.terms.length === 0}
              onClick={() => setLevelId(lv.id)}
            >
              {lv.label}
              {lv.terms.length === 0 ? '（じゅんびちゅう）' : ''}
            </Button>
          ))}
        </div>
        {activeLevel?.terms.map((term) => (
          <section key={term.index} className="term-section">
            <SectionTitle>
              {activeLevel.label} {termLabel(term.index)}
            </SectionTitle>
            <div className="stage-grid">
              {term.stages.map((stage) => {
                const practicedAll = stage.wordIds.every((w) => progressMap.get(w)?.practicedAt != null)
                const perfect = stagePerfect.get(stage.id) ?? 0
                return (
                  <Card key={stage.id} className="stage-card">
                    <div className="stage-head">
                      <span className="stage-label">{stage.label}</span>
                      <span className="row gap-sm">
                        <span className={`stage-clear ${perfect === 0 ? 'stage-clear-zero' : ''}`}>ぜんもんせいかい {perfect}回</span>
                        {perfect === 0 && practicedAll && <span className="stage-done">れんしゅうずみ</span>}
                      </span>
                    </div>
                    <div className="stage-chips">
                      {stage.wordIds.map((w) => {
                        const word = getWord(w)
                        return (
                          <span key={w} className={`word-chip chip-${chipState(w)}`}>
                            {word?.en ?? w}
                          </span>
                        )
                      })}
                    </div>
                    <div className="row gap">
                      <Button size="sm" onClick={() => navigate({ name: 'learn', stageId: stage.id })}>
                        れんしゅう
                      </Button>
                      <Button
                        size="sm"
                        variant={practicedAll ? 'accent' : 'secondary'}
                        onClick={() => navigate({ name: 'stageTest', stageId: stage.id })}
                      >
                        ５もんテスト
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        ))}
        <div className="map-legend">
          <span>
            <span className="word-chip chip-none legend-chip">abc</span> まだ
          </span>
          <span>
            <span className="word-chip chip-practiced legend-chip">abc</span> れんしゅうした
          </span>
          <span>
            <span className="word-chip chip-mastered legend-chip">abc</span> マスター
          </span>
          <span>
            <span className="word-chip chip-unknown legend-chip">abc</span> わからなかった
          </span>
        </div>
      </div>
    </div>
  )
}
