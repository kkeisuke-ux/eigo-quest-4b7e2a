// ホーム画面（仕様 §58）: 今日の学習・復習・実績4枠（たんご/５もん/まとめ/称号）・仲間・コイン。
import { useEffect, useState } from 'react'
import { getSpecies } from '../data/species'
import { ACTIVE_STAGE_IDS, TERM_TEST_TOTAL, perfectTermTestIds, playableLevels } from '../data/words'
import { rankCountFor, rankForCount } from '../game/ranks'
import { RankBadge, RankListModal } from '../ui/RankBadge'
import { evolutionInfo, normalizeOwned } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import {
  alphabetMasteryCounts,
  backfillStudyDays,
  getProfile,
  getSetting,
  listOwned,
  listStudyDays,
  listTestResults,
  listUnknownWords,
  listWordProgress,
  takePendingStreakBonus,
} from '../storage/repo'
import type { StreakBonus } from '../game/streak'
import { Button, Card, ExpBar, LoadingView, StatusChips } from '../ui/components'
import { StreakBonusModal } from '../ui/StreakBonusModal'
import { StudyCalendar } from '../ui/StudyCalendar'
import { SoundButton } from '../ui/SoundButton'

export function Home() {
  const profileId = useAppState((s) => s.profileId)
  const [showRanks, setShowRanks] = useState(false)
  // れんぞくボーナスは練習中に割り込まず、ホームに戻ってきたときに受け取り演出を出す（第30回）
  const [bonuses, setBonuses] = useState<StreakBonus[]>([])
  useEffect(() => {
    if (!profileId) return
    void takePendingStreakBonus(profileId).then((list) => {
      if (list.length > 0) setBonuses(list)
    })
  }, [profileId])
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    // カレンダー導入前の記録から べんきょうした日を1度だけ復元する（第30回）
    await backfillStudyDays(profileId)
    const [unknown, progressList, owned, results, alpha, studyDays] = await Promise.all([
      listUnknownWords(profileId),
      listWordProgress(profileId),
      listOwned(profileId),
      listTestResults(profileId),
      alphabetMasteryCounts(profileId),
      listStudyDays(profileId),
    ])
    const buddy = profile.buddyId != null ? (owned.find((o) => o.id === profile.buddyId) ?? null) : null
    if (buddy) normalizeOwned(buddy)
    const mastered = progressList.filter((p) => p.masteredAt != null).length
    const stagePerfectSet = new Set(
      results
        .filter((r) => r.kind === 'stage' && r.total > 0 && r.correct === r.total && ACTIVE_STAGE_IDS.has(r.targetId))
        .map((r) => r.targetId)
    )
    const termPerfectSet = perfectTermTestIds(results)
    // 「きょうの がくしゅう」は第22回で削除（かんじクエスト第35回と同方針）
    const totalPlayable = playableLevels()
      .flatMap((level) => level.terms.flatMap((t) => t.stages))
      .flatMap((st) => st.wordIds).length
    return {
      profile,
      studyDays,
      unknown,
      mastered,
      buddy,
      alpha,
      totalPlayable,
      // 実績4枠（第22回。第24回で20問テスト基準に）
      stagePerfectCount: stagePerfectSet.size,
      termPerfectCount: termPerfectSet.size,
      achievementCount: rankCountFor(termPerfectSet.size, alpha.upper, alpha.lower),
      totalStages: ACTIVE_STAGE_IDS.size,
      totalTerms: TERM_TEST_TOTAL,
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const {
    profile,
    studyDays,
    unknown,
    mastered,
    buddy,
    alpha,
    totalPlayable,
    stagePerfectCount,
    termPerfectCount,
    achievementCount,
    totalStages,
    totalTerms,
  } = data

  const buddySpecies = buddy ? getSpecies(buddy.speciesId) : null
  const buddyInfo = buddy ? evolutionInfo(buddy) : null

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <button className="home-profile" onClick={() => navigate({ name: 'profiles' })}>
          <span className="avatar avatar-sm" style={{ background: profile.color }}>
            {profile.name.slice(0, 1)}
          </span>
          <span>{profile.name}</span>
        </button>
        <div className="home-badges">
          <StatusChips />
          <SoundButton />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate({ name: 'settings' })}>
            せってい
          </button>
        </div>
      </header>

      <div className="home-main">
        <div className="home-left">
          <div className="home-actions">
            <button className="action-btn action-alphabet" onClick={() => navigate({ name: 'alphabet' })}>
              <span className="action-icon">🔤</span>
              <span className="action-label">アルファベット</span>
              <span className="action-sub">
                おおもじ {alpha.upper}/26　こもじ {alpha.lower}/26
              </span>
            </button>
            <button className="action-btn action-practice" onClick={() => navigate({ name: 'stages' })}>
              <span className="action-icon">✏️</span>
              <span className="action-label">たんご</span>
              <span className="action-sub">きいて・なぞって・かいて おぼえよう</span>
            </button>
            <button className="action-btn action-test" onClick={() => navigate({ name: 'tests' })}>
              <span className="action-icon">💮</span>
              <span className="action-label">まとめテスト</span>
              <span className="action-sub">さいこうきろくを めざそう</span>
            </button>
            <button className="action-btn action-diary" onClick={() => navigate({ name: 'diary' })}>
              <span className="action-icon">📔</span>
              <span className="action-label">えいご絵日記</span>
              <span className="action-sub">えと えいごで きょうを のこそう</span>
            </button>
          </div>
          {/* べんきょうカレンダー（第30回）: 学習の入口のすぐ下に置いて「きょうも やろう」を促す */}
          <StudyCalendar records={studyDays} stamp="🌸" />
          <div className="tile-row">
            <Card className="tile" onClick={() => navigate({ name: 'unknownList' })}>
              <h3>わからなかった ことば</h3>
              <p className="tile-num">{unknown.length}語</p>
              {unknown.length === 0 && <p className="tile-sub">いまは ゼロ！ すごい！</p>}
            </Card>
            <Card className="tile" onClick={() => navigate({ name: 'myWords' })}>
              <h3>ことばを調べる・わたしの単語帳</h3>
              <p className="tile-sub">絵日記で つかいたい ことばを さがせるよ</p>
            </Card>
          </div>
          <div className="tile-row">
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'gacha' })}>
              なかまガチャ
            </Card>
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'dex' })}>
              なかまずかん
            </Card>
            <Card className="tile tile-sm" onClick={() => navigate({ name: 'minna' })}>
              みんな
            </Card>
          </div>
          {/* 実績4枠: たんご・５もんテスト・まとめテスト・称号（第22回。かんじクエスト第37〜39回と同型） */}
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-label">📖 おぼえた たんご</span>
              <span className="stat-num">
                {mastered}
                <small> / {totalPlayable}語</small>
              </span>
              <div className="masterbar">
                <div className="masterbar-fill" style={{ width: `${totalPlayable > 0 ? (mastered / totalPlayable) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">✏️ ５もんテスト 100点</span>
              <span className="stat-num">
                {stagePerfectCount}
                <small> / {totalStages}ステージ</small>
              </span>
              <div className="masterbar">
                <div className="masterbar-fill" style={{ width: `${totalStages > 0 ? (stagePerfectCount / totalStages) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-label">💮 まとめテスト 100点</span>
              <span className="stat-num">
                {termPerfectCount}
                <small> / {totalTerms}テスト</small>
              </span>
              <div className="masterbar">
                <div className="masterbar-fill" style={{ width: `${totalTerms > 0 ? (termPerfectCount / totalTerms) * 100 : 0}%` }} />
              </div>
            </div>
            <button className="stat-card stat-card-btn" onClick={() => setShowRanks(true)}>
              <span className="stat-label">🏅 しょうごう</span>
              {(() => {
                const rank = rankForCount(achievementCount)
                return rank ? (
                  <span className="stat-rank">
                    <RankBadge rank={rank} size={38} />
                    <span className="stat-rank-label">{rank.label}</span>
                  </span>
                ) : (
                  <span className="stat-rank">
                    <span className="stat-rank-none">まだ なし</span>
                  </span>
                )
              })()}
              <span className="stat-rank-hint">タップで いちらん</span>
            </button>
          </div>
        </div>

        <div className="home-right">
          <Card className="buddy-card" onClick={() => navigate({ name: 'friends' })}>
            {buddy && buddySpecies ? (
              <>
                <div className="buddy-sprite-box">
                  <CharacterSprite speciesId={buddy.speciesId} stage={buddy.stage} size={140} />
                </div>
                <div className="buddy-info">
                  <p className="buddy-name">{buddySpecies.stages[buddy.stage].name}</p>
                  <p className="buddy-level">
                    Lv.{buddy.level}　（しんか {buddy.stage + 1} / {buddySpecies.stages.length}）
                  </p>
                  <ExpBar level={buddy.level} exp={buddy.exp} />
                  {buddyInfo && !buddyInfo.maxed && (
                    <p className="tile-sub">
                      しんかまで スター あと<b>{buddyInfo.starsLeft}こ</b>
                    </p>
                  )}
                  {buddyInfo?.maxed && <p className="friend-maxed">🌟 さいごまで しんかした！</p>}
                  {buddyInfo?.tease && <p className="buddy-tease">もうすぐ なにかが おこりそう……</p>}
                  <p className="tile-sub">いっしょに べんきょうちゅう</p>
                </div>
              </>
            ) : (
              <>
                <div className="buddy-empty">？</div>
                <p>まだ なかまが いないよ</p>
                <Button onClick={() => navigate({ name: 'gacha' })}>ガチャで なかまを むかえよう</Button>
              </>
            )}
          </Card>
        </div>
      </div>
      <StreakBonusModal profileId={profileId} bonuses={bonuses} onClose={() => setBonuses([])} />
      <RankListModal open={showRanks} perfectCount={achievementCount} onClose={() => setShowRanks(false)} />
    </div>
  )
}
