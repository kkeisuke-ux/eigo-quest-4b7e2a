// アルファベットのハブ画面（仕様 §6, §8）。
// 大文字・小文字それぞれの26文字グリッドと習得状況、なぞり練習・テストへの入口。
import { useState } from 'react'
import { UPPERCASE, LOWERCASE } from '../data/alphabet'
import { useProfile, useAsyncData } from '../state/hooks'
import { navigate, type AlphabetKind } from '../state/store'
import { listAlphabetProgress } from '../storage/repo'
import { Button, LoadingView, SectionTitle, TopBar } from '../ui/components'

export function AlphabetHub() {
  const profile = useProfile()
  const [kind, setKind] = useState<AlphabetKind>('upper')
  const { data: progress } = useAsyncData(async () => {
    if (!profile) return null
    const all = await listAlphabetProgress(profile.id)
    return new Map(all.map((p) => [p.letter, p]))
  }, [profile?.id])

  if (!profile || !progress) return <LoadingView />

  const items = kind === 'upper' ? UPPERCASE : LOWERCASE
  const mastered = items.filter((i) => progress.get(i.letter)?.masteredAt != null).length
  const practiced = items.filter((i) => progress.get(i.letter)?.practicedAt != null).length

  return (
    <div className="screen">
      <TopBar title="アルファベット" back={{ name: 'home' }} />
      <div className="scroll-body">
        <div className="row gap tab-row">
          <Button variant={kind === 'upper' ? 'primary' : 'secondary'} onClick={() => setKind('upper')}>
            おおもじ A〜Z
          </Button>
          <Button variant={kind === 'lower' ? 'primary' : 'secondary'} onClick={() => setKind('lower')}>
            こもじ a〜z
          </Button>
        </div>
        <SectionTitle>
          {kind === 'upper' ? 'おおもじ' : 'こもじ'}　おぼえた {mastered} / 26
        </SectionTitle>
        <p className="hint-text">もじを タップすると そこから なぞりれんしゅうが はじまるよ</p>
        <div className="alpha-grid">
          {items.map((item, i) => {
            const p = progress.get(item.letter)
            const state = p?.masteredAt != null ? 'mastered' : p?.practicedAt != null ? 'practiced' : 'none'
            return (
              <button
                key={item.letter}
                className={`alpha-cell chip-${state}`}
                onClick={() => navigate({ name: 'alphabetLearn', kind, startIndex: i })}
              >
                {item.letter}
              </button>
            )
          })}
        </div>
        <div className="row gap wrap alpha-actions">
          <Button size="lg" onClick={() => navigate({ name: 'alphabetLearn', kind, startIndex: 0 })}>
            さいしょから れんしゅう
          </Button>
          <Button size="lg" variant="accent" onClick={() => navigate({ name: 'alphabetTest', kind })}>
            テストを うける（{practiced > 0 || mastered > 0 ? 'よめる字で かけるかな？' : 'れんしゅうのあとが おすすめ'}）
          </Button>
        </div>
      </div>
    </div>
  )
}
