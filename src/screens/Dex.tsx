// なかまずかん（仕様 §26, §27）。未発見はシルエット＋？？？。進化先は先に見せない。
import { useState } from 'react'
import { RARITY_LABEL, SPECIES, getSpecies, totalDexEntries } from '../data/species'
import { CharacterSprite } from '../game/sprites'
import { useAsyncData } from '../state/hooks'
import { useAppState } from '../state/store'
import { listDex, listOwned } from '../storage/repo'
import { Button, Card, LoadingView, Modal, TopBar } from '../ui/components'

export function Dex() {
  const profileId = useAppState((s) => s.profileId)
  const [detail, setDetail] = useState<{ speciesId: string; stage: number } | null>(null)
  const { data } = useAsyncData(async () => {
    if (!profileId) return null
    const [dex, owned] = await Promise.all([listDex(profileId), listOwned(profileId)])
    return {
      discovered: new Set(dex.map((d) => `${d.speciesId}:${d.stage}`)),
      dexAt: new Map(dex.map((d) => [`${d.speciesId}:${d.stage}`, d.discoveredAt])),
      ownedMap: new Map(owned.map((o) => [o.speciesId, o])),
    }
  }, [profileId])

  if (!data) return <LoadingView />
  const { discovered, dexAt, ownedMap } = data
  const total = totalDexEntries()
  const count = discovered.size

  const detailSpecies = detail ? getSpecies(detail.speciesId) : null
  const detailStage = detailSpecies && detail ? detailSpecies.stages[detail.stage] : null
  const detailOwned = detail ? ownedMap.get(detail.speciesId) : undefined

  return (
    <div className="screen">
      <TopBar title="なかまずかん" back={{ name: 'home' }} right={<span className="dex-count">{count} / {total}</span>} />
      <div className="map-scroll">
        {SPECIES.map((sp) => (
          <Card key={sp.id} className="dex-row">
            <div className="dex-line-head">
              <span className="dex-line-name">{sp.lineName}</span>
              <span className={`rarity rarity-${sp.rarity}`}>{RARITY_LABEL[sp.rarity]}</span>
            </div>
            <div className="dex-stages">
              {sp.stages.map((st, stageIdx) => {
                const key = `${sp.id}:${stageIdx}`
                const found = discovered.has(key)
                return (
                  <div
                    key={key}
                    className={`dex-cell ${found ? 'dex-found card-tap' : 'dex-hidden'}`}
                    onClick={found ? () => setDetail({ speciesId: sp.id, stage: stageIdx }) : undefined}
                  >
                    <CharacterSprite speciesId={sp.id} stage={stageIdx} size={72} silhouette={!found} />
                    <span className="dex-name">{found ? st.name : '？？？'}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={detail != null} onClose={() => setDetail(null)}>
        {detailSpecies && detailStage && detail && (
          <div className="dex-detail">
            <CharacterSprite speciesId={detail.speciesId} stage={detail.stage} size={150} />
            <h2>{detailStage.name}</h2>
            <p className="dex-desc">{detailStage.desc}</p>
            <p className="tile-sub">
              {detailSpecies.lineName}　しんかだんかい {detail.stage + 1} / {detailSpecies.stages.length}　（
              {RARITY_LABEL[detailSpecies.rarity]}）
            </p>
            {detailOwned && detailOwned.stage === detail.stage && <p className="tile-sub">いまの レベル: Lv.{detailOwned.level}</p>}
            {dexAt.get(`${detail.speciesId}:${detail.stage}`) != null && (
              <p className="tile-sub">はじめて あった日: {new Date(dexAt.get(`${detail.speciesId}:${detail.stage}`)!).toLocaleDateString('ja-JP')}</p>
            )}
            <Button onClick={() => setDetail(null)}>とじる</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
