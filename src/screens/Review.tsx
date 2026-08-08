// 復習モード（仕様 §18, §21-§22）。
// - mode 'due': 今日の復習（間隔反復。子どもには仕組みを見せない）
// - mode 'unknown': わからなかった単語の復習（復習で正解してもリストからは消えない。
//   正式なテストで正解したときだけ自動で消える）
// - 復習では「音を聞いて書く」問題も混ざる（仕様 §18）
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { dueReviewWordIds, listUnknownWords } from '../storage/repo'
import { getWord } from '../data/words'
import { TestRunner } from '../learn/TestRunner'
import { Button, LoadingView, TopBar } from '../ui/components'

export function Review({ mode, wordIds: idsParam }: { mode: 'due' | 'unknown'; wordIds?: string[] }) {
  const profileId = useAppState((s) => s.profileId)
  // リストは初回に一度だけ確定させる（復習中に変動させない）
  const { data: list } = useAsyncData(async () => {
    if (!profileId) return null
    if (idsParam && idsParam.length > 0) return idsParam.filter((id) => getWord(id) != null)
    if (mode === 'due') return dueReviewWordIds(profileId)
    return (await listUnknownWords(profileId)).map((u) => u.wordId).filter((id) => getWord(id) != null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, mode])

  if (!profileId || !list) return <LoadingView />

  const title = mode === 'due' ? 'きょうの ふくしゅう' : 'わからなかった ことばの ふくしゅう'

  if (list.length === 0) {
    return (
      <div className="screen">
        <TopBar title={title} back={{ name: 'home' }} />
        <div className="center-panel">
          <div className="card result-main">
            <p className="result-score">いまは ふくしゅうする ことばが ないよ！</p>
            <Button onClick={() => navigate({ name: 'home' })}>ホームへ</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TestRunner
      kind="review"
      targetId={mode}
      wordIds={list}
      title={title}
      backRoute={{ name: 'home' }}
      listenRatio={0.35}
    />
  )
}
