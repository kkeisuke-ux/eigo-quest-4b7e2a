// バックアップの書き出し／読み込み（仕様 §35）。
// iPad故障・Safariデータ削除に備え、全データをJSONファイルとして退避できる。
import { STORE_NAMES, dbClear, dbGetAll, dbPut, type StoreName } from './db'

interface BackupFile {
  app: 'eigo-quest'
  schemaVersion: 1
  exportedAt: string
  data: Record<string, unknown[]>
}

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

export async function downloadBackup(): Promise<void> {
  const json = await exportAllData()
  const stamp = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `eigo-quest-backup-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export interface ImportSummary {
  stores: number
  records: number
}

/** 既存データをすべて置き換える。呼び出し側で必ずユーザー確認を取ること。 */
export async function importAllData(json: string): Promise<ImportSummary> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(json) as BackupFile
  } catch {
    throw new Error('バックアップファイルを読み取れません（JSONではありません）')
  }
  if (parsed.app !== 'eigo-quest') throw new Error('このアプリのバックアップではありません')
  if (parsed.schemaVersion !== 1) throw new Error(`未対応のバックアップ形式です (schemaVersion=${String(parsed.schemaVersion)})`)
  if (!parsed.data || typeof parsed.data !== 'object') throw new Error('バックアップにデータがありません')

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
