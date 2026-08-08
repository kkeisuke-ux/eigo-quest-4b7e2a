// えいご絵日記の一覧（仕様 §32）。1日1ページ、日付別に保存・見返しできる。
import { strokesToDataUrl } from '../diary/pdf'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import { listDiaryEntries } from '../storage/repo'
import { Button, Card, LoadingView, TopBar } from '../ui/components'

function todayKey(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function labelOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`)
  const youbi = ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日（${youbi}）`
}

export function Diary() {
  const profileId = useAppState((s) => s.profileId)
  const { data: entries } = useAsyncData(async () => (profileId ? listDiaryEntries(profileId) : []), [profileId])

  if (!entries) return <LoadingView />

  const today = todayKey()
  const hasToday = entries.some((e) => e.dateKey === today)

  return (
    <div className="screen">
      <TopBar title="えいご絵日記" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Card className="diary-intro">
          <p>
            きょうの できごとを <b>えと えいご</b>で のこそう！ 1日 1ページ。
          </p>
          <Button size="lg" variant="accent" onClick={() => navigate({ name: 'diaryEdit', dateKey: today })}>
            {hasToday ? 'きょうの にっきを ひらく' : 'きょうの にっきを かく'}
          </Button>
        </Card>
        {entries.length === 0 ? (
          <Card>
            <p>まだ にっきが ないよ。さいしょの 1ページを かいてみよう！</p>
          </Card>
        ) : (
          <div className="diary-grid">
            {entries.map((e) => (
              <Card key={e.dateKey} className="diary-tile" onClick={() => navigate({ name: 'diaryEdit', dateKey: e.dateKey })}>
                <div className="diary-tile-date">{labelOf(e.dateKey)}</div>
                {e.drawing.length > 0 ? (
                  <img
                    className="diary-thumb"
                    src={strokesToDataUrl(e.drawing, e.drawingSize || 800, 360, Math.round(360 * 0.62), 3)}
                    alt={`${e.dateKey}の絵`}
                  />
                ) : (
                  <div className="diary-thumb diary-thumb-empty">えは まだ</div>
                )}
                <div className="diary-tile-text">{e.originalText || '（えいごは まだ）'}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
