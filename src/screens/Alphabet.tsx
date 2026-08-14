// アルファベットのハブ画面（仕様 §6, §8）。
// 大文字・小文字それぞれの26文字グリッドと習得状況、なぞり練習・テストへの入口。
import { useState } from 'react'
import { UPPERCASE, LOWERCASE } from '../data/alphabet'
import { useProfile, useAsyncData, useRememberAlphabetKind } from '../state/hooks'
import { navigate, type AlphabetKind } from '../state/store'
import { getSetting, listAlphabetProgress } from '../storage/repo'
import { Button, LoadingView, SectionTitle, TopBar } from '../ui/components'

export function AlphabetHub() {
  const profile = useProfile()
  const [kindOverride, setKind] = useState<AlphabetKind | null>(null)
  const { data } = useAsyncData(async () => {
    if (!profile) return null
    const [all, savedKind] = await Promise.all([
      listAlphabetProgress(profile.id),
      // 第21回追補: 最後に見ていたタブ（おおもじ/こもじ）を覚えておく
      getSetting<AlphabetKind>(`alphabetKind:${profile.id}`),
    ])
    return { progress: new Map(all.map((p) => [p.letter, p])), savedKind: savedKind ?? null }
  }, [profile?.id])

  const kind: AlphabetKind = kindOverride ?? data?.savedKind ?? 'upper'
  useRememberAlphabetKind(data ? kind : null)

  if (!profile || !data) return <LoadingView />
  const progress = data.progress

  const items = kind === 'upper' ? UPPERCASE : LOWERCASE
  const mastered = items.filter((i) => progress.get(i.letter)?.masteredAt != null).length
  const practiced = items.filter((i) => progress.get(i.letter)?.practicedAt != null).length
  // にがてなもじ = テストで一度でも「こたえを見る」を使った（＝間違えた）が、
  // その後まだ習得しなおしていない字（仕様2026-08-10フィードバック: 毎回26字ぜんぶは
  // 大変すぎる → 苦手な字だけに しぼれるようにする）。練習だけした字はここに含めない
  // （練習には失敗判定が無いため「間違えた」に当たらない）
  const weakLetters = items
    .filter((i) => {
      const p = progress.get(i.letter)
      return p != null && p.masteredAt == null && p.wrong > 0
    })
    .map((i) => i.letter)

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
        {weakLetters.length > 0 && (
          <div className="row gap wrap alpha-actions">
            <Button size="lg" variant="secondary" onClick={() => navigate({ name: 'alphabetLearn', kind, letters: weakLetters })}>
              にがてな {weakLetters.length}もじだけ れんしゅう
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate({ name: 'alphabetTest', kind, letters: weakLetters })}>
              にがてな {weakLetters.length}もじだけ テスト
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
