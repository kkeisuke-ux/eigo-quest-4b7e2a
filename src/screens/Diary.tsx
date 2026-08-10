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
  // 年も表示する（第13回）
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${youbi}）`
}

/** 手書き英文サムネの高さ（書かれた範囲に合わせる。pdf.tsと同じ考え方） */
function textThumbHeight(e: { textStrokes: { points: [number, number][] }[]; textBoxWidth: number }, outWidth: number): number {
  const srcW = e.textBoxWidth || 800
  const maxY = Math.max(...e.textStrokes.flatMap((s) => s.points.map((p) => p[1])), srcW * 0.12)
  const hRatio = Math.min(0.45, (maxY + srcW * 0.03) / srcW)
  return Math.round(outWidth * hRatio)
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
                {/* かいた英文もサムネに出す（第13回） */}
                {e.textStrokes.length > 0 ? (
                  <img
                    className="diary-thumb diary-thumb-text"
                    src={strokesToDataUrl(e.textStrokes, e.textBoxWidth || 800, 360, textThumbHeight(e, 360), 2.6)}
                    alt={`${e.dateKey}の英文`}
                  />
                ) : (
                  <div className="diary-tile-text">（えいごは まだ）</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
