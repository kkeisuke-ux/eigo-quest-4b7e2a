// データアクセス層。画面からはこのモジュール経由で読み書きする。
import { GAME_CONFIG } from '../config/gameConfig'
import {
  dbAdd,
  dbClear,
  dbCount,
  dbDelete,
  dbGet,
  dbGetAll,
  dbIndexAll,
  dbIndexKeys,
  dbPut,
} from './db'
import type {
  ActivityRecord,
  AlphabetProgress,
  AnswerOutcome,
  CoinHistoryRecord,
  DexEntryRecord,
  DiaryEntryRecord,
  GachaHistoryRecord,
  MyWordRecord,
  OwnedCharacterRecord,
  PracticeSessionRecord,
  Profile,
  SettingsRecord,
  StrokeSampleRecord,
  TestResultRecord,
  TestSessionRecord,
  UnknownWordRecord,
  WordProgress,
} from './models'

export const PROFILE_COLORS = ['#e0645f', '#4a67d8', '#3f9d63', '#e79a2e', '#8a5bd6']
export const MAX_PROFILES = 5

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfTomorrow(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() + DAY_MS
}

// ---------------- Profiles ----------------
export async function listProfiles(): Promise<Profile[]> {
  const all = await dbGetAll<Profile>('profiles')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export function getProfile(id: string): Promise<Profile | undefined> {
  return dbGet<Profile>('profiles', id)
}

export async function saveProfile(p: Profile): Promise<void> {
  await dbPut('profiles', p)
}

export async function createProfile(name: string, grade: number): Promise<Profile> {
  const existing = await listProfiles()
  if (existing.length >= MAX_PROFILES) throw new Error('プロフィールは5人までです')
  const profile: Profile = {
    id: uuid(),
    name,
    grade,
    color: PROFILE_COLORS[existing.length % PROFILE_COLORS.length],
    coins: GAME_CONFIG.coins.initialGift,
    stars: 0,
    buddyId: null,
    gachaCount: 0,
    gachaMissStreak: 0,
    judgeStrictness: 1,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  }
  await dbPut('profiles', profile)
  await dbAdd('coinHistory', {
    profileId: profile.id,
    delta: GAME_CONFIG.coins.initialGift,
    reason: 'はじめてのプレゼント',
    balanceAfter: profile.coins,
    at: Date.now(),
  } satisfies Omit<CoinHistoryRecord, 'id'>)
  await addActivity(profile.id, profile.name, 'join', `${profile.name}が えいごクエストを はじめました`)
  try {
    void navigator.storage?.persist?.()
  } catch {
    // 永続化リクエスト失敗は無視
  }
  return profile
}

export async function deleteProfileDeep(profileId: string): Promise<void> {
  const byProfileStores = [
    'alphabetProgress',
    'wordProgress',
    'strokeSamples',
    'testResults',
    'testSessions',
    'practiceSessions',
    'unknownWords',
    'coinHistory',
    'ownedCharacters',
    'dexEntries',
    'gachaHistory',
    'diaryEntries',
    'myWords',
  ] as const
  for (const store of byProfileStores) {
    const keys = await dbIndexKeys(store, 'byProfile', profileId)
    for (const key of keys) await dbDelete(store, key)
  }
  const feed = await dbGetAll<ActivityRecord>('activityFeed')
  for (const item of feed) {
    if (item.profileId === profileId && item.id != null) await dbDelete('activityFeed', item.id)
  }
  await dbDelete('profiles', profileId)
}

// ---------------- AlphabetProgress（仕様 §8） ----------------
export function defaultAlphabetProgress(profileId: string, letter: string): AlphabetProgress {
  return {
    profileId,
    letter,
    traceDone: 0,
    writes: 0,
    correct: 0,
    wrong: 0,
    practicedAt: null,
    masteredAt: null,
    lastSeenAt: null,
  }
}

export async function getAlphabetProgress(profileId: string, letter: string): Promise<AlphabetProgress> {
  const found = await dbGet<AlphabetProgress>('alphabetProgress', [profileId, letter])
  return found ?? defaultAlphabetProgress(profileId, letter)
}

export async function saveAlphabetProgress(p: AlphabetProgress): Promise<void> {
  await dbPut('alphabetProgress', p)
}

export function listAlphabetProgress(profileId: string): Promise<AlphabetProgress[]> {
  return dbIndexAll<AlphabetProgress>('alphabetProgress', 'byProfile', profileId)
}

/** 大文字・小文字それぞれの習得数（例: 大文字 18 / 26） */
export async function alphabetMasteryCounts(profileId: string): Promise<{ upper: number; lower: number }> {
  const all = await listAlphabetProgress(profileId)
  let upper = 0
  let lower = 0
  for (const p of all) {
    if (p.masteredAt == null) continue
    if (p.letter >= 'A' && p.letter <= 'Z') upper++
    else if (p.letter >= 'a' && p.letter <= 'z') lower++
  }
  return { upper, lower }
}

// ---------------- WordProgress / SRS ----------------
export function defaultWordProgress(profileId: string, wordId: string): WordProgress {
  return {
    profileId,
    wordId,
    correct: 0,
    wrong: 0,
    unknown: 0,
    traceDone: 0,
    copyDone: 0,
    recallDone: 0,
    practicedAt: null,
    masteredAt: null,
    srsLevel: 0,
    nextReviewAt: null,
    lastSeenAt: null,
  }
}

export async function getWordProgress(profileId: string, wordId: string): Promise<WordProgress> {
  const found = await dbGet<WordProgress>('wordProgress', [profileId, wordId])
  return found ?? defaultWordProgress(profileId, wordId)
}

export async function saveWordProgress(p: WordProgress): Promise<void> {
  await dbPut('wordProgress', p)
}

export function listWordProgress(profileId: string): Promise<WordProgress[]> {
  return dbIndexAll<WordProgress>('wordProgress', 'byProfile', profileId)
}

export interface OutcomeOptions {
  context: 'test' | 'review' | 'practice'
}

/** 正誤結果を進捗とSRSへ反映する */
export async function applyWordOutcome(
  profileId: string,
  wordId: string,
  outcome: AnswerOutcome,
  opts: OutcomeOptions
): Promise<WordProgress> {
  const p = await getWordProgress(profileId, wordId)
  const now = Date.now()
  p.lastSeenAt = now
  if (outcome === 'correct') p.correct++
  else if (outcome === 'wrong') p.wrong++
  else p.unknown++

  const intervals = GAME_CONFIG.review.intervalsDays
  if (opts.context === 'test' || opts.context === 'review') {
    if (outcome === 'correct') {
      p.srsLevel = Math.min(p.srsLevel + 1, intervals.length - 1)
      p.nextReviewAt = now + intervals[p.srsLevel] * DAY_MS
    } else {
      p.srsLevel = 0
      p.nextReviewAt = startOfTomorrow()
    }
    if (opts.context === 'test') {
      if (outcome === 'correct') p.masteredAt = p.masteredAt ?? now
      else p.masteredAt = null
    }
  } else if (p.nextReviewAt == null) {
    // 練習で初めて触れた単語は明日復習に出す
    p.nextReviewAt = startOfTomorrow()
  }
  await saveWordProgress(p)
  return p
}

export async function dueReviewWordIds(profileId: string): Promise<string[]> {
  const all = await listWordProgress(profileId)
  const now = Date.now()
  return all
    .filter((p) => p.nextReviewAt != null && p.nextReviewAt <= now && (p.correct + p.wrong + p.unknown + p.traceDone > 0))
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .slice(0, GAME_CONFIG.review.dailyMax)
    .map((p) => p.wordId)
}

/** 覚えた単語数（テストで正解して習得扱いの語数） */
export async function masteredWordCount(profileId: string): Promise<number> {
  const all = await listWordProgress(profileId)
  return all.filter((p) => p.masteredAt != null).length
}

// ---------------- Unknown list（わからなかった単語。仕様 §22） ----------------
export async function addUnknownWord(profileId: string, wordId: string, reason: 'unknown' | 'wrong'): Promise<void> {
  const existing = await dbGet<UnknownWordRecord>('unknownWords', [profileId, wordId])
  const now = Date.now()
  if (existing) {
    existing.lastFailedAt = now
    existing.reason = reason
    await dbPut('unknownWords', existing)
  } else {
    await dbPut('unknownWords', { profileId, wordId, addedAt: now, reason, lastFailedAt: now } satisfies UnknownWordRecord)
  }
}

/** 正式なテストで正解したら自動でリストから消す（復習1回の正解では消さない。仕様 §22） */
export async function clearUnknownWord(profileId: string, wordId: string): Promise<boolean> {
  const existing = await dbGet<UnknownWordRecord>('unknownWords', [profileId, wordId])
  if (!existing) return false
  await dbDelete('unknownWords', [profileId, wordId])
  return true
}

export function listUnknownWords(profileId: string): Promise<UnknownWordRecord[]> {
  return dbIndexAll<UnknownWordRecord>('unknownWords', 'byProfile', profileId)
}

// ---------------- Coins ----------------
export async function addCoins(profileId: string, delta: number, reason: string): Promise<Profile> {
  const profile = await getProfile(profileId)
  if (!profile) throw new Error('profile not found')
  profile.coins = Math.max(0, profile.coins + delta)
  profile.lastActiveAt = Date.now()
  await dbPut('profiles', profile)
  await dbAdd('coinHistory', {
    profileId,
    delta,
    reason,
    balanceAfter: profile.coins,
    at: Date.now(),
  } satisfies Omit<CoinHistoryRecord, 'id'>)
  return profile
}

export function listCoinHistory(profileId: string): Promise<CoinHistoryRecord[]> {
  return dbIndexAll<CoinHistoryRecord>('coinHistory', 'byProfile', profileId)
}

// ---------------- Stroke samples（認識しきい値調整用） ----------------
export async function addStrokeSample(rec: Omit<StrokeSampleRecord, 'id'>): Promise<number> {
  const id = (await dbAdd('strokeSamples', rec)) as number
  const count = await dbCount('strokeSamples')
  const max = 400
  if (count > max) {
    const all = await dbGetAll<StrokeSampleRecord>('strokeSamples')
    const removable = all.filter((s) => s.humanLabel == null).sort((a, b) => a.at - b.at)
    for (const s of removable.slice(0, count - max)) {
      if (s.id != null) await dbDelete('strokeSamples', s.id)
    }
  }
  return id
}

export async function listStrokeSamples(target?: string): Promise<StrokeSampleRecord[]> {
  const all = await dbGetAll<StrokeSampleRecord>('strokeSamples')
  const filtered = target ? all.filter((s) => s.target === target) : all
  return filtered.sort((a, b) => b.at - a.at)
}

export async function labelStrokeSample(id: number, label: 'correct' | 'incorrect' | null): Promise<void> {
  const rec = await dbGet<StrokeSampleRecord>('strokeSamples', id)
  if (!rec) return
  rec.humanLabel = label
  await dbPut('strokeSamples', rec)
}

// ---------------- Tests ----------------
export async function addTestResult(rec: Omit<TestResultRecord, 'id'>): Promise<number> {
  return (await dbAdd('testResults', rec)) as number
}

export function listTestResults(profileId: string): Promise<TestResultRecord[]> {
  return dbIndexAll<TestResultRecord>('testResults', 'byProfile', profileId)
}

/** まとめテストの最高得点（仕様 §26） */
export async function bestTermScore(profileId: string, termId: string): Promise<{ correct: number; total: number } | null> {
  const all = await listTestResults(profileId)
  const term = all.filter((r) => r.kind === 'term' && r.targetId === termId)
  if (term.length === 0) return null
  let best = term[0]
  for (const r of term) {
    if (r.total <= 0) continue
    if (best.total <= 0 || r.correct / r.total > best.correct / best.total) best = r
  }
  return { correct: best.correct, total: best.total }
}

export function getTestSession(profileId: string, testKey: string): Promise<TestSessionRecord | undefined> {
  return dbGet<TestSessionRecord>('testSessions', [profileId, testKey])
}

export async function saveTestSession(rec: TestSessionRecord): Promise<void> {
  await dbPut('testSessions', rec)
}

export async function deleteTestSession(profileId: string, testKey: string): Promise<void> {
  await dbDelete('testSessions', [profileId, testKey])
}

// ---------------- れんしゅうの途中保存 ----------------
export function getPracticeSession(profileId: string, stageId: string): Promise<PracticeSessionRecord | undefined> {
  return dbGet<PracticeSessionRecord>('practiceSessions', [profileId, stageId])
}

export async function savePracticeSession(rec: PracticeSessionRecord): Promise<void> {
  await dbPut('practiceSessions', rec)
}

export async function deletePracticeSession(profileId: string, stageId: string): Promise<void> {
  await dbDelete('practiceSessions', [profileId, stageId])
}

// ---------------- Characters ----------------
export function listOwned(profileId: string): Promise<OwnedCharacterRecord[]> {
  return dbIndexAll<OwnedCharacterRecord>('ownedCharacters', 'byProfile', profileId)
}

export function getOwned(id: number): Promise<OwnedCharacterRecord | undefined> {
  return dbGet<OwnedCharacterRecord>('ownedCharacters', id)
}

export async function addOwnedCharacter(rec: Omit<OwnedCharacterRecord, 'id'>): Promise<number> {
  return (await dbAdd('ownedCharacters', rec)) as number
}

export async function saveOwned(rec: OwnedCharacterRecord): Promise<void> {
  await dbPut('ownedCharacters', rec)
}

export async function discoverDex(profileId: string, speciesId: string, stage: number): Promise<boolean> {
  const existing = await dbGet<DexEntryRecord>('dexEntries', [profileId, speciesId, stage])
  if (existing) return false
  await dbPut('dexEntries', { profileId, speciesId, stage, discoveredAt: Date.now() } satisfies DexEntryRecord)
  return true
}

export function listDex(profileId: string): Promise<DexEntryRecord[]> {
  return dbIndexAll<DexEntryRecord>('dexEntries', 'byProfile', profileId)
}

export async function addGachaHistory(rec: Omit<GachaHistoryRecord, 'id'>): Promise<void> {
  await dbAdd('gachaHistory', rec)
}

// ---------------- えいご絵日記（仕様 §29-§33） ----------------
export function getDiaryEntry(profileId: string, dateKey: string): Promise<DiaryEntryRecord | undefined> {
  return dbGet<DiaryEntryRecord>('diaryEntries', [profileId, dateKey])
}

export async function saveDiaryEntry(rec: DiaryEntryRecord): Promise<void> {
  await dbPut('diaryEntries', rec)
}

export async function listDiaryEntries(profileId: string): Promise<DiaryEntryRecord[]> {
  const all = await dbIndexAll<DiaryEntryRecord>('diaryEntries', 'byProfile', profileId)
  return all.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
}

export async function deleteDiaryEntry(profileId: string, dateKey: string): Promise<void> {
  await dbDelete('diaryEntries', [profileId, dateKey])
}

// ---------------- わたしの単語帳（仕様 §34） ----------------
export async function addMyWord(rec: MyWordRecord): Promise<void> {
  await dbPut('myWords', rec)
}

export function listMyWords(profileId: string): Promise<MyWordRecord[]> {
  return dbIndexAll<MyWordRecord>('myWords', 'byProfile', profileId)
}

export async function removeMyWord(profileId: string, wordId: string): Promise<void> {
  await dbDelete('myWords', [profileId, wordId])
}

// ---------------- Activity feed（みんな画面。仕様 §54） ----------------
export async function addActivity(
  profileId: string,
  profileName: string,
  type: ActivityRecord['type'],
  message: string
): Promise<void> {
  await dbAdd('activityFeed', { profileId, profileName, type, message, at: Date.now() } satisfies Omit<ActivityRecord, 'id'>)
  const all = await dbGetAll<ActivityRecord>('activityFeed')
  if (all.length > 120) {
    const oldest = all.sort((a, b) => a.at - b.at).slice(0, all.length - 120)
    for (const item of oldest) {
      if (item.id != null) await dbDelete('activityFeed', item.id)
    }
  }
}

export async function listActivity(limit = 50): Promise<ActivityRecord[]> {
  const all = await dbGetAll<ActivityRecord>('activityFeed')
  return all.sort((a, b) => b.at - a.at).slice(0, limit)
}

// ---------------- Settings ----------------
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const rec = await dbGet<SettingsRecord>('settings', key)
  return rec?.value as T | undefined
}

export async function putSetting(key: string, value: unknown): Promise<void> {
  await dbPut('settings', { key, value } satisfies SettingsRecord)
}

// ---------------- 全消去（バックアップ読み込み用） ----------------
export async function clearAllStores(): Promise<void> {
  const stores = [
    'profiles',
    'alphabetProgress',
    'wordProgress',
    'strokeSamples',
    'testResults',
    'testSessions',
    'practiceSessions',
    'unknownWords',
    'coinHistory',
    'ownedCharacters',
    'dexEntries',
    'gachaHistory',
    'diaryEntries',
    'myWords',
    'activityFeed',
    'settings',
  ] as const
  for (const s of stores) await dbClear(s)
}
