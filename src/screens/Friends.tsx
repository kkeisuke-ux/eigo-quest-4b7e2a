// なかま一覧・育成（仕様 §23, §24）。スター購入と使用、バディ切り替え。
import { GAME_CONFIG } from '../config/gameConfig'
import { getSpecies } from '../data/species'
import { buyStar, evolutionInfo, useStar } from '../game/logic'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { getProfile, listOwned, saveProfile } from '../storage/repo'
import { Button, Card, CoinBadge, ExpBar, LoadingView, StarBadge, TopBar } from '../ui/components'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

export function Friends() {
  const profileId = useAppState((s) => s.profileId)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const profile = await getProfile(profileId)
    if (!profile) return null
    const owned = await listOwned(profileId)
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

  const onBuyStar = async () => {
    const res = await buyStar(profile.id)
    bumpData()
    showToast(res.ok ? 'スターを かった！' : 'コインが たりないよ')
  }

  const onUseStar = async (ownedId: number) => {
    const res = await useStar(profile.id, ownedId)
    bumpData()
    if (!res.ok) {
      showToast('スターを もっていないよ')
      return
    }
    showToast(`EXP +${GAME_CONFIG.star.exp}！`)
    queueEvolutionFromEvents(res.expEvents)
  }

  return (
    <div className="screen">
      <TopBar
        title="なかま"
        back={{ name: 'home' }}
        right={
          <span className="row gap-sm">
            <CoinBadge coins={profile.coins} />
            <StarBadge stars={profile.stars} />
          </span>
        }
      />
      <div className="map-scroll">
        <Card className="star-shop">
          <div>
            <h3>スター</h3>
            <p className="tile-sub">スター1つで なかまの EXPが +{GAME_CONFIG.star.exp}。コインは ためておいても いいよ。</p>
          </div>
          <Button onClick={() => void onBuyStar()} disabled={profile.coins < GAME_CONFIG.star.cost}>
            スターを かう（{GAME_CONFIG.star.cost}コイン）
          </Button>
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
                    <p className="friend-name">{sp.stages[o.stage].name}</p>
                    <p className="friend-line">
                      {sp.lineName}　だんかい {o.stage + 1} / {sp.stages.length}
                    </p>
                    <p className="friend-desc">{sp.stages[o.stage].desc}</p>
                    {!info.maxed && <ExpBar stage={o.stage} exp={o.exp} />}
                    {info.maxed ? (
                      <p className="friend-maxed">🌟 さいごまで しんかした！</p>
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
                      <Button size="sm" variant="accent" onClick={() => void onUseStar(o.id!)} disabled={profile.stars <= 0}>
                        スターを つかう
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
