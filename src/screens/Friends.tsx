// なかま一覧・育成（仕様 §23, §24）。スター購入と使用、バディ切り替え。
import { GAME_CONFIG } from '../config/gameConfig'
import { getSpecies } from '../data/species'
import { buyStars, evolutionInfo, normalizeOwned, useStars } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { getProfile, listOwned, saveProfile } from '../storage/repo'
import { Button, Card, ExpBar, LoadingView, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'
import { queueLevelUpFromEvents } from '../ui/LevelUpFx'

export function Friends() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const owned = await listOwned(profileId)
    owned.forEach(normalizeOwned)
    owned.sort((a, b) => a.obtainedAt - b.obtainedAt)
    return { profile, owned }
  }, [profileId])

  if (!data) return <LoadingView />
  const { profile, owned } = data

  const setBuddy = async (id: number) => {
    profile.buddyId = id
    await saveProfile(profile)
    bumpData()
    showToast('いっしょに べんきょうする なかまを かえたよ')
  }

  const onBuyStars = async (count: number) => {
    const res = await buyStars(profile.id, count)
    bumpData()
    showToast(res.ok ? (count === 1 ? 'スターを かった！' : `スターを ${count}こ かった！`) : 'コインが たりないよ')
  }

  // count=1で1こ、count=5でまとめて（持っている数まで。第22回）
  const onUseStar = async (ownedId: number, count: number) => {
    const res = await useStars(profile.id, ownedId, count)
    bumpData()
    if (!res.ok) {
      showToast('スターを もっていないよ')
      return
    }
    showToast(`スター${res.used}こ → EXP +${GAME_CONFIG.star.exp * (res.used ?? 0)}！`)
    if (res.expEvents?.evolvedTo) {
      queueEvolutionFromEvents(res.expEvents)
    } else {
      const rec = owned.find((o) => o.id === ownedId)
      if (rec) queueLevelUpFromEvents(res.expEvents, rec.stage)
    }
  }

  return (
    <div className="screen">
      <TopBar title="なかま" back={{ name: 'home' }} />
      <div className="map-scroll">
        <Card className="star-shop">
          <div>
            <h3>スター</h3>
            <p className="tile-sub">スター1つで なかまの EXPが +{GAME_CONFIG.star.exp}。コインは ためておいても いいよ。</p>
          </div>
          <div className="row gap-sm wrap">
            <Button onClick={() => void onBuyStars(1)} disabled={profile.coins < GAME_CONFIG.star.cost}>
              1こ かう（{GAME_CONFIG.star.cost}コイン）
            </Button>
            <Button variant="secondary" onClick={() => void onBuyStars(5)} disabled={profile.coins < GAME_CONFIG.star.cost * 5}>
              5こ かう（{GAME_CONFIG.star.cost * 5}コイン）
            </Button>
          </div>
        </Card>
        {owned.length === 0 ? (
          <Card>
            <p>まだ なかまが いないよ。</p>
            <Button onClick={() => navigate({ name: 'gacha' })}>ガチャへ いく</Button>
          </Card>
        ) : (
          <div className="friends-grid">
            {owned.map((o) => {
              const sp = getSpecies(o.speciesId)
              if (!sp || o.id == null) return null
              const info = evolutionInfo(o)
              const isBuddy = profile.buddyId === o.id
              return (
                <Card key={o.id} className={`friend-card ${isBuddy ? 'friend-buddy' : ''}`}>
                  <CharacterSprite speciesId={o.speciesId} stage={o.stage} size={110} />
                  <div className="friend-info">
                    <p className="friend-name">
                      {sp.stages[o.stage].name}　<b className="friend-level">Lv.{o.level}</b>
                    </p>
                    <p className="friend-line">
                      {sp.lineName}　しんか {o.stage + 1} / {sp.stages.length}
                    </p>
                    <p className="friend-desc">{sp.stages[o.stage].desc}</p>
                    <ExpBar level={o.level} exp={o.exp} />
                    {info.maxed ? (
                      <p className="friend-maxed">🌟 さいごまで しんかした！（レベルは Lv.{GAME_CONFIG.levels.maxLevel}まで あがるよ）</p>
                    ) : (
                      <p className="friend-next">
                        つぎの しんかまで EXP {info.expLeft}（スター あと<b>{info.starsLeft}こ</b>）
                      </p>
                    )}
                    {info.tease && <p className="buddy-tease">もうすぐ なにかが おこりそう……</p>}
                    <div className="row gap-sm wrap">
                      {isBuddy ? (
                        <span className="buddy-mark">いっしょに べんきょうちゅう</span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => void setBuddy(o.id!)}>
                          いっしょに べんきょうする
                        </Button>
                      )}
                      <Button size="sm" variant="accent" onClick={() => void onUseStar(o.id!, 1)} disabled={profile.stars <= 0}>
                        スターを つかう
                      </Button>
                      <Button size="sm" variant="accent" onClick={() => void onUseStar(o.id!, 5)} disabled={profile.stars < 5}>
                        5こ まとめて
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
