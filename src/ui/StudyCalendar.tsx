// べんきょうカレンダー（第45回）。れんしゅう・テスト・ふくしゅうのどれかを1つやった日にスタンプが付く。
// 「きょうも やった」が一目で分かることと、連続日数が見えることが目的なので、
// 何をやったかの内訳は出さない（子どもが読む画面なので情報を増やしすぎない）。
import { useState } from 'react'
import {
  dailyStreakCoins,
  monthGrid,
  monthKeyOf,
  monthLabel,
  nextBonus,
  nextDailyStepUp,
  shiftMonth,
  studySummary,
} from '../game/streak'
import type { StudyDayRecord } from '../storage/models'

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

interface Props {
  records: StudyDayRecord[]
  /** スタンプの絵文字（アプリごとに変えられる） */
  stamp?: string
  /** 月送りを出すか（ホームは出す、みんな画面のミニ表示は出さない） */
  navigable?: boolean
  compact?: boolean
  title?: string
}

export function StudyCalendar({ records, stamp = '💮', navigable = true, compact = false, title = 'べんきょうカレンダー' }: Props) {
  const [monthKey, setMonthKey] = useState(monthKeyOf())
  const sum = studySummary(records, monthKey)
  const cells = monthGrid(monthKey, sum.days)
  const thisMonth = monthKey === monthKeyOf()

  return (
    <div className={`studycal${compact ? ' studycal-compact' : ''}`}>
      <div className="studycal-cal">
        <div className="studycal-head">
          {navigable ? (
            <button className="studycal-nav" onClick={() => setMonthKey(shiftMonth(monthKey, -1))} aria-label="まえの月">
              ◀
            </button>
          ) : (
            <span className="studycal-nav studycal-nav-empty" />
          )}
          <span className="studycal-month">{compact ? monthLabel(monthKey).replace(/^\d+年 /, '') : monthLabel(monthKey)}</span>
          {navigable ? (
            <button
              className="studycal-nav"
              onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
              disabled={thisMonth}
              aria-label="つぎの月"
            >
              ▶
            </button>
          ) : (
            <span className="studycal-nav studycal-nav-empty" />
          )}
        </div>
        <div className="studycal-grid">
          {WEEK.map((w, i) => (
            <span key={w} className={`studycal-wd${i === 0 ? ' sun' : ''}${i === 6 ? ' sat' : ''}`}>
              {w}
            </span>
          ))}
          {cells.map((c, i) =>
            c.blank ? (
              <span key={`b${i}`} className="studycal-cell studycal-blank" />
            ) : (
              <span
                key={c.ymd}
                className={
                  'studycal-cell' +
                  (c.stamped ? ' stamped' : '') +
                  (c.isToday ? ' today' : '') +
                  (c.future ? ' future' : '')
                }
              >
                <span className="studycal-day">{c.day}</span>
                {c.stamped && <span className="studycal-stamp">{stamp}</span>}
              </span>
            )
          )}
        </div>
      </div>

      <div className="studycal-stats">
        <div className="studycal-stat studycal-streak">
          <span className="studycal-stat-label">🔥 れんぞく</span>
          <span className="studycal-stat-num">
            {sum.streak}
            <small> 日</small>
          </span>
        </div>
        <div className="studycal-stat">
          <span className="studycal-stat-label">📅 {Number(monthKey.slice(5))}月</span>
          <span className="studycal-stat-num">
            {sum.monthCount}
            <small> 日</small>
          </span>
        </div>
        <div className="studycal-stat">
          <span className="studycal-stat-label">⭐ ぜんぶで</span>
          <span className="studycal-stat-num">
            {sum.total}
            <small> 日</small>
          </span>
        </div>
        {!compact && (
          <div className="studycal-hint">
            {(() => {
              // きょうやると いくらもらえるか（＝やらないと いくら損か）を いちばん前に出す。
              // 節目だけだと、節目の あいだの日に やる理由が うすくなる
              const todayStreak = sum.studiedToday ? sum.streak : sum.streak + 1
              const todayCoins = dailyStreakCoins(todayStreak)
              const step = nextDailyStepUp(todayStreak)
              const nb = nextBonus(sum.streak)
              const more = nb ? (sum.studiedToday ? nb.inDays : nb.inDays - 1) : 0
              return (
                <>
                  <p className="studycal-hint-main">
                    {sum.studiedToday
                      ? `きょうの れんぞくボーナス ＋${todayCoins}コイン ゲット！`
                      : `きょう やると れんぞく${todayStreak}日め ＋${todayCoins}コイン！`}
                  </p>
                  {nb && (
                    <p className="studycal-hint-sub">
                      {more <= 0
                        ? `しかも きょうは ${nb.bonus.label}！ さらに ＋${nb.bonus.coins}コイン`
                        : `あと ${more}日で ${nb.bonus.label}（さらに ＋${nb.bonus.coins}コイン）`}
                    </p>
                  )}
                  {step && (
                    <p className="studycal-hint-sub">
                      {`${step.atStreak}日つづけると 1日ぶんが ＋${step.coins}コインに ふえるよ`}
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

/** みんな画面・プロフィール選択で使う一行サマリ */
export function StudyStreakChip({ records }: { records: StudyDayRecord[] }) {
  const sum = studySummary(records, monthKeyOf())
  if (sum.total === 0) return null
  return (
    <span className="badge streak-chip" title={`こんげつ ${sum.monthCount}日 / ぜんぶで ${sum.total}日`}>
      🔥 れんぞく {sum.streak}日
    </span>
  )
}
