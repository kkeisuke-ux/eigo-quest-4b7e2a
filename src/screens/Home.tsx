// ホーム画面（仕様 §58）: 今日の学習・復習・大文字/小文字進捗・覚えた単語数・仲間・コイン。
import { getSpecies } from '../data/species'
import { playableLevels, termId, termTestTitle, type WordStageDef } from '../data/words'
import { evolutionInfo } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { navigate, useAppState } from '../state/store'
import {
  alphabetMasteryCounts,
  dueReviewWordIds,
  getProfile,
  listOwned,
  listTestResults,
  listUnknownWords,
  listWordProgress,
} from '../storage/repo'
import { Button, Card, ExpBar, LoadingView, StatusChips } from '../ui/components'
import { SoundButton } from '../ui/SoundButton'

export function Home() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const [due, unknown, progressList, owned, results, alpha] = await Promise.all([
      dueReviewWordIds(profileId),
      listUnknownWords(profileId),
      listWordProgress(profileId),
      listOwned(profileId),
      listTestResults(profileId),
      alphabetMasteryCounts(profileId),
    ])
    const buddy = profile.buddyId != null ? (owned.find((o) => o.id === profile.buddyId) ?? null) : null
    const mastered = progressList.filter((p) => p.masteredAt != null).length
    const practicedSet = new Set(progressList.filter((p) => p.practicedAt != null).map((p) => p.wordId))
    const stagePerfectSet = new Set(
      results.filter((r) => r.kind === 'stage' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
    )
    const termPerfectSet = new Set(
      results.filter((r) => r.kind === 'term' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
    )
    // おすすめ: ①アルファベット未習得 → ②練習が終わっていないステージ → ③全問正解がまだの5問テスト → ④まとめテスト
    let nextPractice: WordStageDef | null = null
    let nextStageTest: WordStageDef | null = null
    let nextTerm: { id: string; title: string } | null = null
    let totalPlayable = 0
    for (const level of playableLevels()) {
      for (const term of level.terms) {
        for (const st of term.stages) {
          totalPlayable += st.wordIds.length
          const allPracticed = st.wordIds.every((w) => practicedSet.has(w))
          if (!allPracticed && !nextPractice) nextPractice = st
          if (allPracticed && !stagePerfectSet.has(st.id) && !nextStageTest) nextStageTest = st
        }
        const tid = termId(level.id, term.index)
        if (term.stages.length > 0 && !termPerfectSet.has(tid) && !nextTerm) {
          nextTerm = { id: tid, title: termTestTitle(level.id, term.index) }
        }
      }
    }
    const alphabetDone = alpha.upper + alpha.lower >= 40
    return {
      profile,
      due,
      unknown,
      mastered,
      buddy,
      alpha,
      totalPlayable,
      alphabetDone,
      nextPractice,
      nextStageTest,
      nextTerm,
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, due, unknown, mastered, buddy, alpha, totalPlayable, alphabetDone, nextPractice, nextStageTest, nextTerm } = data

  const recommend = !alphabetDone && alpha.upper < 26
    ? { text: `アルファベットの おおもじを れんしゅうしよう（いま ${alpha.upper}/26）`, route: { name: 'alphabet' } as const }
    : !alphabetDone && alpha.lower < 26
      ? { text: `アルファベットの こもじを れんしゅうしよう（いま ${alpha.lower}/26）`, route: { name: 'alphabet' } as const }
      : nextPractice
        ? { text: `たんご「${nextPractice.label}」の れんしゅうを すすめよう`, route: { name: 'learn', stageId: nextPractice.id } as const }
        : nextStageTest
          ? { text: `「${nextStageTest.label}」の ５もんテストで ぜんもんせいかいを めざそう！`, route: { name: 'stageTest', stageId: nextStageTest.id } as const }
          : nextTerm
            ? { text: `${nextTerm.title}に ちょうせん！`, route: { name: 'termTest', termId: nextTerm.id } as const }
            : { text: 'ぜんぶ クリア！ すごい！ ふくしゅうで キープしよう', route: { name: 'review', mode: 'due' } as const }
  const buddySpecies = buddy ? getSpecies(buddy.speciesId) : null
  const tease = buddy ? evolutionInfo(buddy).tease : false

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
          <Card className="tile tile-study" onClick={() => navigate(recommend.route)}>
            <h2>きょうの がくしゅう</h2>
            <p className="tile-big">{recommend.text}</p>
          </Card>
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
          <div className="tile-row">
            <Card className="tile" onClick={() => due.length > 0 && navigate({ name: 'review', mode: 'due' })}>
              <h3>きょうの ふくしゅう</h3>
              <p className="tile-num">{due.length}語</p>
              {due.length === 0 && <p className="tile-sub">いまは なし！</p>}
            </Card>
            <Card className="tile" onClick={() => navigate({ name: 'unknownList' })}>
              <h3>わからなかった ことば</h3>
              <p className="tile-num">{unknown.length}語</p>
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
          <div className="progress-line">
            <span>
              おぼえた たんご　{mastered} / {totalPlayable}語
            </span>
            <div className="masterbar">
              <div className="masterbar-fill" style={{ width: `${totalPlayable > 0 ? (mastered / totalPlayable) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="home-right">
          <Card className="buddy-card" onClick={() => navigate({ name: 'friends' })}>
            {buddy && buddySpecies ? (
              <>
                <CharacterSprite speciesId={buddy.speciesId} stage={buddy.stage} size={140} />
                <p className="buddy-name">{buddySpecies.stages[buddy.stage].name}</p>
                <p className="buddy-level">Lv.{buddy.level}</p>
                <ExpBar level={buddy.level} exp={buddy.exp} />
                {tease && <p className="buddy-tease">もうすぐ なにかが おこりそう……</p>}
                <p className="tile-sub">いっしょに べんきょうちゅう</p>
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
    </div>
  )
}
