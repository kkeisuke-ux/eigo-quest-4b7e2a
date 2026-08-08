// 学習・テスト画面に常駐するバディ（いっしょに勉強している仲間）。
// 正解すると喜び、クリアではしゃぐ。
import { getSpecies } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import { getOwned, getProfile } from '../storage/repo'

export type BuddyMood = 'idle' | 'happy' | 'celebrate'

export function BuddyCorner({
  mood = 'idle',
  size = 76,
  message,
}: {
  mood?: BuddyMood
  size?: number
  message?: string
}) {
  const profileId = useAppState((s) => s.profileId)
  const { data: buddy } = useAsyncData(async () => {
    if (!profileId) return null
    const p = await getProfile(profileId)
    if (!p || p.buddyId == null) return null
    return (await getOwned(p.buddyId)) ?? null
  }, [profileId])

  if (!buddy) return null
  const sp = getSpecies(buddy.speciesId)
  if (!sp) return null

  return (
    <div className={`buddy-corner buddy-mood-${mood}`}>
      {message && <span className="buddy-bubble">{message}</span>}
      <div className="buddy-corner-sprite">
        <CharacterSprite speciesId={buddy.speciesId} stage={buddy.stage} size={size} />
      </div>
      <span className="buddy-corner-name">{sp.stages[buddy.stage].name}</span>
    </div>
  )
}
