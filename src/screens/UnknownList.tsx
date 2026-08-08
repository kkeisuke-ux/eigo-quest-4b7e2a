// わからなかった単語リスト（仕様 §22）。
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { listUnknownWords } from '../storage/repo'
import { getWord } from '../data/words'
import { WordIllustrationView } from '../learn/WordCard'
import { Button, Card, LoadingView, TopBar } from '../ui/components'

export function UnknownList() {
  const profileId = useAppState((s) => s.profileId)
  const { data: list } = useAsyncData(async () => (profileId ? listUnknownWords(profileId) : []), [profileId])

  if (!list) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="わからなかった ことば" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Card>
          <p>
            テストで「こたえを 見る」を おしたり まちがえたりした ことばが ここに あつまるよ。
            <b>つぎの テストで せいかいすると じどうで きえる</b>んだ。
          </p>
          <Button onClick={() => navigate({ name: 'review', mode: 'unknown' })} disabled={list.length === 0}>
            ぜんぶ ふくしゅうする（{list.length}語）
          </Button>
        </Card>
        {list.length === 0 ? (
          <Card>
            <p className="result-score">いまは ゼロ！ すごい！</p>
          </Card>
        ) : (
          <div className="unknown-grid">
            {list.map((u) => {
              const word = getWord(u.wordId)
              if (!word) return null
              const sourceLabel =
                u.source === 'stage' ? '５もんテスト' : u.source === 'term' ? 'まとめテスト' : u.source === 'review' ? 'ふくしゅう' : 'テスト'
              return (
                <Card key={u.wordId} className="unknown-card">
                  <span className={`unknown-source unknown-source-${u.source ?? 'other'}`}>{sourceLabel}</span>
                  <WordIllustrationView value={word.illustration.value} size="sm" />
                  <span className="unknown-word">{word.en}</span>
                  <span className="unknown-ja">{word.ja}</span>
                  <span className="unknown-reason">
                    {u.reason === 'unknown' ? 'こたえを 見た' : 'まちがえた'}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => navigate({ name: 'review', mode: 'unknown', wordIds: [u.wordId] })}>
                    この ことばを れんしゅう
                  </Button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
