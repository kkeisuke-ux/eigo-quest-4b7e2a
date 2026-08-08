// ことばを調べる ＋ わたしの単語帳（仕様 §34）。
// 絵日記で「この単語を書きたい」ときに日本語から英単語を探し、単語帳へ追加できる。
import { useState } from 'react'
import { searchByJa, type Word } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { bumpData, showToast, useAppState } from '../state/store'
import { addMyWord, listMyWords, removeMyWord } from '../storage/repo'
import { WordIllustrationView } from '../learn/WordCard'
import { Button, Card, LoadingView, SectionTitle, TopBar } from '../ui/components'
import { SpeakButton } from '../ui/SpeakButton'

export function MyWords() {
  const profileId = useAppState((s) => s.profileId)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Word[]>([])
  const { data: myWords, reload } = useAsyncData(async () => (profileId ? listMyWords(profileId) : []), [profileId])

  if (!profileId || !myWords) return <LoadingView />

  const search = () => {
    setResults(searchByJa(query).slice(0, 20))
  }

  const add = async (w: Word) => {
    await addMyWord({ profileId, wordId: w.id, en: w.en, ja: w.ja, addedAt: Date.now(), source: 'lookup' })
    showToast(`「${w.en}」を たんごちょうに いれたよ`)
    bumpData()
    reload()
  }

  const inList = new Set(myWords.map((m) => m.wordId))

  return (
    <div className="screen">
      <TopBar title="ことばを調べる・わたしの単語帳" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Card>
          <SectionTitle>ことばを調べる</SectionTitle>
          <p className="tile-sub">日本語（例:「こうえん」）か えいご（例: park）で さがせるよ</p>
          <div className="row gap">
            <input
              className="text-input search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="しらべたい ことば"
            />
            <Button onClick={search} disabled={!query.trim()}>
              さがす
            </Button>
          </div>
          {results.length > 0 && (
            <ul className="lookup-list">
              {results.map((w) => (
                <li key={w.id} className="lookup-item">
                  <WordIllustrationView value={w.illustration.value} size="sm" />
                  <b className="lookup-en">{w.en}</b>
                  <span className="lookup-ja">{w.ja}</span>
                  <SpeakButton text={w.en} kind="word" size="sm" />
                  <Button size="sm" variant="secondary" onClick={() => void add(w)} disabled={inList.has(w.id)}>
                    {inList.has(w.id) ? 'いれてある' : 'たんごちょうへ'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {results.length === 0 && query.trim() && <p className="tile-sub">みつからなかったら、べつの いいかたで さがしてみてね</p>}
        </Card>

        <Card>
          <SectionTitle>わたしの単語帳（{myWords.length}語）</SectionTitle>
          {myWords.length === 0 ? (
            <p className="tile-sub">しらべた ことばを ここに あつめられるよ</p>
          ) : (
            <ul className="lookup-list">
              {myWords.map((m) => (
                <li key={m.wordId} className="lookup-item">
                  <b className="lookup-en">{m.en}</b>
                  <span className="lookup-ja">{m.ja}</span>
                  <SpeakButton text={m.en} kind="word" size="sm" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void removeMyWord(profileId, m.wordId).then(() => reload())}
                  >
                    けす
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
