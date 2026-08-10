// バックアップの書き出し／読み込み（仕様 §35）。
// - 全員分: iPad故障・Safariデータ削除に備え、全データをJSONファイルとして退避できる。
// - ひとりぶん（第13回。かんじクエストと同じ仕組み）: 選んだプロフィールのデータだけを
//   書き出し、別の端末に「その人だけ」を追加・上書きできる（ほかの人のデータには触らない）。
import { STORE_NAMES, dbAdd, dbClear, dbDelete, dbGet, dbGetAll, dbIndexAll, dbIndexKeys, dbPut, type StoreName } from './db'
import type { ActivityRecord, OwnedCharacterRecord, Profile } from './models'

interface BackupFile {
  app: 'eigo-quest'
  schemaVersion: 1
  exportedAt: string
  /** 'profile' = ひとりぶんのバックアップ。なし = 全員分（従来形式） */
  scope?: 'profile'
  profileId?: string
  profileName?: string
  data: Record<string, unknown[]>
}

/** 自動採番のストア（読み込み時はidを振り直して他の人のデータと衝突させない） */
const AUTO_INCREMENT_STORES: readonly StoreName[] = [
  'strokeSamples',
  'testResults',
  'coinHistory',
  'ownedCharacters',
  'gachaHistory',
  'activityFeed',
]

export async function exportAllData(): Promise<string> {
  const data: Record<string, unknown[]> = {}
  for (const store of STORE_NAMES) {
    data[store] = await dbGetAll(store)
  }
  const backup: BackupFile = {
    app: 'eigo-quest',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(backup)
}

/** ひとりぶんのデータを書き出す（settingsは端末設定なので含めない） */
export async function exportProfileData(profileId: string): Promise<string | null> {
  const profile = await dbGet<Profile>('profiles', profileId)
  if (!profile) return null
  const data: Record<string, unknown[]> = { profiles: [profile] }
  for (const store of STORE_NAMES) {
    if (store === 'profiles' || store === 'settings') continue
    if (store === 'activityFeed') {
      const all = await dbGetAll<ActivityRecord>('activityFeed')
      data[store] = all.filter((r) => r.profileId === profileId)
    } else {
      data[store] = await dbIndexAll(store, 'byProfile', profileId)
    }
  }
  const backup: BackupFile = {
    app: 'eigo-quest',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    scope: 'profile',
    profileId,
    profileName: profile.name,
    data,
  }
  return JSON.stringify(backup)
}

function stamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function backupFileName(profileName?: string): string {
  const namePart = profileName ? `-${profileName.replace(/[\\/:*?"<>|\s]/g, '')}` : ''
  return `eigo-quest-backup${namePart}-${stamp()}.json`
}

function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function downloadBackup(): Promise<void> {
  downloadJson(await exportAllData(), backupFileName())
}

/** ひとりぶんをファイルに書き出す。プロフィールが見つからなければfalse */
export async function downloadProfileBackup(profileId: string): Promise<boolean> {
  const json = await exportProfileData(profileId)
  if (json == null) return false
  const parsed = JSON.parse(json) as BackupFile
  downloadJson(json, backupFileName(parsed.profileName))
  return true
}

/** この端末が共有シート（AirDrop等）でのファイル共有に対応しているか */
export function canShareBackup(): boolean {
  try {
    return (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })
    )
  } catch {
    return false
  }
}

async function shareJson(json: string, filename: string, title: string): Promise<boolean> {
  if (!canShareBackup()) return false
  const file = new File([json], filename, { type: 'application/json' })
  if (!navigator.canShare({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError'
  }
}

/** 共有シート（iPadならAirDropが出る）で全員分バックアップを送る */
export async function shareBackup(): Promise<boolean> {
  return shareJson(await exportAllData(), backupFileName(), 'えいごクエストのデータ')
}

/** ひとりぶんを共有シートで送る（第13回） */
export async function shareProfileBackup(profileId: string): Promise<boolean> {
  const json = await exportProfileData(profileId)
  if (json == null) return false
  const parsed = JSON.parse(json) as BackupFile
  return shareJson(json, backupFileName(parsed.profileName), `えいごクエストのデータ（${parsed.profileName ?? ''}）`)
}

export interface ImportSummary {
  stores: number
  records: number
}

function parseBackup(json: string): BackupFile {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(json) as BackupFile
  } catch {
    throw new Error('バックアップファイルを読み取れません（JSONではありません）')
  }
  if (parsed.app !== 'eigo-quest') throw new Error('このアプリのバックアップではありません')
  if (parsed.schemaVersion !== 1) throw new Error(`未対応のバックアップ形式です (schemaVersion=${String(parsed.schemaVersion)})`)
  if (!parsed.data || typeof parsed.data !== 'object') throw new Error('バックアップにデータがありません')
  return parsed
}

/** 読み込み前のファイル判別（設定画面で確認文を出し分ける用） */
export interface BackupInfo {
  scope: 'all' | 'profile'
  profileId?: string
  profileName?: string
}

export function inspectBackup(json: string): BackupInfo {
  const parsed = parseBackup(json)
  if (parsed.scope === 'profile') {
    const profile = (parsed.data.profiles as Profile[] | undefined)?.[0]
    if (!profile || !parsed.profileId) throw new Error('ひとりぶんバックアップにプロフィールがありません')
    return { scope: 'profile', profileId: parsed.profileId, profileName: parsed.profileName ?? profile.name }
  }
  return { scope: 'all' }
}

/** 既存データをすべて置き換える。呼び出し側で必ずユーザー確認を取ること。 */
export async function importAllData(json: string): Promise<ImportSummary> {
  const parsed = parseBackup(json)
  if (parsed.scope === 'profile') throw new Error('これは ひとりぶんのバックアップです（ひとりぶん読み込みを使ってください）')

  let records = 0
  let stores = 0
  for (const store of STORE_NAMES) {
    const rows = parsed.data[store]
    await dbClear(store)
    if (!Array.isArray(rows)) continue
    stores++
    for (const row of rows) {
      await dbPut(store as StoreName, row)
      records++
    }
  }
  return { stores, records }
}

/**
 * ひとりぶんバックアップを読み込む（第13回）。
 * その人（profileId一致）の既存データだけを消してから入れ直す。ほかの人のデータには触らない。
 * 自動採番ストアはidを振り直し、なかま（ownedCharacters）のid変更に合わせてbuddyIdも付け替える。
 */
export async function importProfileData(json: string): Promise<ImportSummary & { profileName: string }> {
  const parsed = parseBackup(json)
  if (parsed.scope !== 'profile' || !parsed.profileId) throw new Error('ひとりぶんのバックアップではありません')
  const pid = parsed.profileId
  const profileRow = (parsed.data.profiles as Profile[] | undefined)?.[0]
  if (!profileRow || profileRow.id !== pid) throw new Error('バックアップのプロフィールが こわれています')

  // 1) この人の既存データを消す（settingsは端末設定なので残す）
  for (const store of STORE_NAMES) {
    if (store === 'settings') continue
    if (store === 'profiles') {
      await dbDelete('profiles', pid)
    } else if (store === 'activityFeed') {
      const all = await dbGetAll<ActivityRecord>('activityFeed')
      for (const r of all) {
        if (r.profileId === pid && r.id != null) await dbDelete('activityFeed', r.id)
      }
    } else {
      const keys = await dbIndexKeys(store, 'byProfile', pid)
      for (const k of keys) await dbDelete(store, k)
    }
  }

  // 2) なかま（ownedCharacters）を先に入れて 旧id→新id の対応をとる
  let records = 0
  let stores = 0
  const ownedRows = (parsed.data.ownedCharacters as OwnedCharacterRecord[] | undefined) ?? []
  const ownedIdMap = new Map<number, number>()
  if (ownedRows.length > 0) stores++
  for (const row of ownedRows) {
    const oldId = row.id
    const copy: OwnedCharacterRecord = { ...row }
    delete copy.id
    const newId = await dbAdd('ownedCharacters', copy)
    if (typeof oldId === 'number' && typeof newId === 'number') ownedIdMap.set(oldId, newId)
    records++
  }

  // 3) プロフィール（buddyIdを新しいなかまidへ付け替え）
  const buddyId = profileRow.buddyId != null ? (ownedIdMap.get(profileRow.buddyId) ?? null) : null
  await dbPut('profiles', { ...profileRow, buddyId })
  stores++
  records++

  // 4) のこりのストア
  for (const store of STORE_NAMES) {
    if (store === 'profiles' || store === 'settings' || store === 'ownedCharacters') continue
    const rows = parsed.data[store]
    if (!Array.isArray(rows) || rows.length === 0) continue
    stores++
    const autoIncrement = AUTO_INCREMENT_STORES.includes(store)
    for (const row of rows) {
      if (autoIncrement) {
        const copy = { ...(row as Record<string, unknown>) }
        delete copy.id
        await dbAdd(store, copy)
      } else {
        await dbPut(store, row)
      }
      records++
    }
  }
  return { stores, records, profileName: parsed.profileName ?? profileRow.name }
}
