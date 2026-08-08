// ゲームロジック: ガチャ・EXP・レベル・進化（仕様 §18〜§28）。
// 数値はすべて gameConfig.ts で調整する。課金要素はない。
import { GAME_CONFIG } from '../config/gameConfig'
import { SPECIES, getSpecies, speciesByRarity, type Rarity } from '../data/species'
import type { OwnedCharacterRecord, Profile } from '../storage/models'
import {
  addActivity,
  addCoins,
  addGachaHistory,
  addOwnedCharacter,
  discoverDex,
  getOwned,
  getProfile,
  getSetting,
  listOwned,
  putSetting,
  saveOwned,
  saveProfile,
} from '../storage/repo'
import { showToast } from '../state/store'

export interface ExpGrantEvents {
  /** 進化した段階数 */
  levelsGained: number
  /** 新しいだんかい（stage + 1） */
  newLevel: number
  /** 進化した場合のみ */
  evolvedFrom: string | null
  evolvedTo: string | null
  newStage: number | null
  speciesId: string
}

/** つぎの進化までに必要なEXP（レベル=進化段階。2026-08-08 第7回で刷新） */
export function expToNext(stage: number): number {
  const arr = GAME_CONFIG.levels.stageExp
  return arr[Math.min(Math.max(stage, 0), arr.length - 1)]
}

export interface EvolutionInfo {
  /** つぎの進化まであと何EXPか（最終段階ならnull） */
  expLeft: number | null
  /** スターに換算してあと何個か（最終段階ならnull） */
  starsLeft: number | null
  /** 「もうすぐ何かが起こりそう…」表示 */
  tease: boolean
  /** 最終段階まで進化しきったか */
  maxed: boolean
}

/** つぎの進化までの残り（スター換算つき。仕様 §49 + 2026-08-08 第7回） */
export function evolutionInfo(owned: OwnedCharacterRecord): EvolutionInfo {
  const sp = getSpecies(owned.speciesId)
  if (!sp) return { expLeft: null, starsLeft: null, tease: false, maxed: false }
  if (owned.stage >= sp.stages.length - 1) return { expLeft: null, starsLeft: null, tease: false, maxed: true }
  const need = expToNext(owned.stage)
  const left = Math.max(0, need - owned.exp)
  return {
    expLeft: left,
    starsLeft: Math.max(1, Math.ceil(left / GAME_CONFIG.star.exp)),
    tease: owned.exp / need >= GAME_CONFIG.levels.evolveTeaseAt,
    maxed: false,
  }
}

export async function grantExpToOwned(profile: Profile, owned: OwnedCharacterRecord, amount: number): Promise<ExpGrantEvents> {
  const species = getSpecies(owned.speciesId)
  if (!species) throw new Error(`unknown species: ${owned.speciesId}`)
  const maxStage = species.stages.length - 1

  const oldStage = owned.stage
  const oldStageName = species.stages[oldStage]?.name ?? '?'
  let exp = owned.exp + amount
  let stage = owned.stage
  while (stage < maxStage && exp >= expToNext(stage)) {
    exp -= expToNext(stage)
    stage++
  }
  // 最終段階ではEXPをためない（あふれは切り捨ててバー表示を満タンに）
  if (stage >= maxStage) exp = Math.min(exp, expToNext(maxStage))

  const stageChanged = stage !== oldStage
  owned.exp = exp
  owned.stage = stage
  owned.level = stage + 1
  await saveOwned(owned)

  let evolvedTo: string | null = null
  if (stageChanged) {
    evolvedTo = species.stages[stage].name
    for (let s = oldStage + 1; s <= stage; s++) {
      await discoverDex(profile.id, owned.speciesId, s)
    }
    await addActivity(profile.id, profile.name, 'evolve', `${profile.name}の ${oldStageName}が ${evolvedTo}に しんかした！`)
  }

  return {
    levelsGained: stage - oldStage,
    newLevel: stage + 1,
    evolvedFrom: stageChanged ? oldStageName : null,
    evolvedTo,
    newStage: stageChanged ? stage : null,
    speciesId: owned.speciesId,
  }
}

export interface StudyReward {
  profile: Profile
  coinsAdded: number
  expEvents: ExpGrantEvents | null
}

function dayKeyOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 連続学習ボーナス（仕様 §40）: 前日も学習していたら1日1回コインを追加する */
async function grantStreakBonus(profileId: string): Promise<void> {
  const bonus = GAME_CONFIG.coins.streakBonus
  if (bonus <= 0) return
  const key = `lastStudy:${profileId}`
  const today = dayKeyOf(new Date())
  const last = await getSetting<string>(key)
  if (last === today) return
  await putSetting(key, today)
  const yesterday = dayKeyOf(new Date(Date.now() - 24 * 60 * 60 * 1000))
  if (last === yesterday) {
    await addCoins(profileId, bonus, 'れんぞく学習ボーナス')
    showToast(`きのうも 勉強したから +${bonus}コイン！`)
  }
}

/** 学習の報酬: コイン＋（バディがいれば）EXP。仕様 §66「勉強した結果としてゲームが進む」 */
export async function awardStudy(profileId: string, coins: number, exp: number, reason: string): Promise<StudyReward> {
  await grantStreakBonus(profileId)
  const profile = await addCoins(profileId, coins, reason)
  let expEvents: ExpGrantEvents | null = null
  if (exp > 0 && profile.buddyId != null) {
    const owned = await getOwned(profile.buddyId)
    if (owned) expEvents = await grantExpToOwned(profile, owned, exp)
  }
  return { profile, coinsAdded: coins, expEvents }
}

function pickRarity(): Rarity {
  const rates = GAME_CONFIG.gacha.rarityRates
  const roll = Math.random()
  let acc = 0
  for (const r of ['common', 'rare', 'epic'] as Rarity[]) {
    acc += rates[r] ?? 0
    if (roll < acc) return r
  }
  return 'common'
}

export type GachaOutcome =
  | { outcome: 'noCoins' }
  | { outcome: 'miss'; profile: Profile }
  | { outcome: 'new'; profile: Profile; speciesId: string; name: string; becameBuddy: boolean }
  | { outcome: 'dup'; profile: Profile; speciesId: string; stage: number; name: string; friendExp: number; expEvents: ExpGrantEvents }

/** なかまガチャ（仕様 §20〜§22）。必ず出るとは限らない。 */
export async function rollGacha(profileId: string): Promise<GachaOutcome> {
  const cfg = GAME_CONFIG.gacha
  let profile = await getProfile(profileId)
  if (!profile) throw new Error('profile not found')
  if (profile.coins < cfg.gachaCost) return { outcome: 'noCoins' }

  profile = await addCoins(profileId, -cfg.gachaCost, 'なかまガチャ')
  const guaranteed =
    (cfg.firstGachaGuaranteed && profile.gachaCount === 0) ||
    (cfg.pityStreak > 0 && profile.gachaMissStreak >= cfg.pityStreak)
  const encountered = guaranteed || Math.random() < cfg.encounterRate
  profile.gachaCount++

  if (!encountered) {
    profile.gachaMissStreak++
    await saveProfile(profile)
    await addGachaHistory({ profileId, cost: cfg.gachaCost, resultSpeciesId: null, duplicated: false, at: Date.now() })
    return { outcome: 'miss', profile }
  }

  profile.gachaMissStreak = 0
  const pool = speciesByRarity(pickRarity())
  const sp = pool[Math.floor(Math.random() * pool.length)] ?? SPECIES[0]
  const owned = await listOwned(profileId)
  const existing = owned.find((o) => o.speciesId === sp.id)

  if (existing) {
    // すでにいる仲間 → なかよしEXPへ変換（仕様 §22）
    existing.friendExp += cfg.duplicateFriendExp
    const expEvents = await grantExpToOwned(profile, existing, cfg.duplicateFriendExp)
    await saveProfile(profile)
    await addGachaHistory({ profileId, cost: cfg.gachaCost, resultSpeciesId: sp.id, duplicated: true, at: Date.now() })
    return {
      outcome: 'dup',
      profile,
      speciesId: sp.id,
      stage: existing.stage,
      name: getSpecies(sp.id)?.stages[existing.stage]?.name ?? sp.stages[0].name,
      friendExp: cfg.duplicateFriendExp,
      expEvents,
    }
  }

  const rec: Omit<OwnedCharacterRecord, 'id'> = {
    profileId,
    speciesId: sp.id,
    stage: 0,
    level: 1,
    exp: 0,
    friendExp: 0,
    obtainedAt: Date.now(),
  }
  const id = await addOwnedCharacter(rec)
  let becameBuddy = false
  if (profile.buddyId == null) {
    profile.buddyId = id
    becameBuddy = true
  }
  await saveProfile(profile)
  await discoverDex(profileId, sp.id, 0)
  await addActivity(profileId, profile.name, 'gacha', `${profile.name}に あたらしい なかま「${sp.stages[0].name}」が ふえました`)
  await addGachaHistory({ profileId, cost: cfg.gachaCost, resultSpeciesId: sp.id, duplicated: false, at: Date.now() })
  return { outcome: 'new', profile, speciesId: sp.id, name: sp.stages[0].name, becameBuddy }
}

export async function buyStar(profileId: string): Promise<{ ok: boolean; profile?: Profile }> {
  const profile = await getProfile(profileId)
  if (!profile || profile.coins < GAME_CONFIG.star.cost) return { ok: false }
  const updated = await addCoins(profileId, -GAME_CONFIG.star.cost, 'スターをかった')
  updated.stars++
  await saveProfile(updated)
  return { ok: true, profile: updated }
}

export async function useStar(profileId: string, ownedId: number): Promise<{ ok: boolean; profile?: Profile; expEvents?: ExpGrantEvents }> {
  const profile = await getProfile(profileId)
  if (!profile || profile.stars <= 0) return { ok: false }
  const owned = await getOwned(ownedId)
  if (!owned) return { ok: false }
  profile.stars--
  await saveProfile(profile)
  const expEvents = await grantExpToOwned(profile, owned, GAME_CONFIG.star.exp)
  return { ok: true, profile, expEvents }
}

/** マスター字数のマイルストーン通知（みんな画面用。順位付けはしない） */
export async function checkMilestones(profile: Profile, before: number, after: number): Promise<void> {
  for (const m of GAME_CONFIG.milestones) {
    if (before < m && after >= m) {
      await addActivity(profile.id, profile.name, 'milestone', `${profile.name}が えいたんごを ${m}語 マスターしました！`)
    }
  }
}
