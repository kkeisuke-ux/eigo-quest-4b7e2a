// IndexedDBの薄いPromiseラッパ。外部ライブラリ非依存。
// かんじクエストとは完全に独立したDB（仕様 §38: ゲームデータも独立）。
const DB_NAME = 'eigo-quest'
const DB_VERSION = 1

export const STORE_NAMES = [
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

export type StoreName = (typeof STORE_NAMES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

export function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      const mk = (name: string, opts?: IDBObjectStoreParameters): IDBObjectStore => {
        if (db.objectStoreNames.contains(name)) return req.transaction!.objectStore(name)
        return db.createObjectStore(name, opts)
      }
      const withProfileIndex = (store: IDBObjectStore) => {
        if (!store.indexNames.contains('byProfile')) store.createIndex('byProfile', 'profileId')
        return store
      }
      mk('profiles', { keyPath: 'id' })
      withProfileIndex(mk('alphabetProgress', { keyPath: ['profileId', 'letter'] }))
      withProfileIndex(mk('wordProgress', { keyPath: ['profileId', 'wordId'] }))
      withProfileIndex(mk('strokeSamples', { keyPath: 'id', autoIncrement: true }))
      withProfileIndex(mk('testResults', { keyPath: 'id', autoIncrement: true }))
      withProfileIndex(mk('testSessions', { keyPath: ['profileId', 'testKey'] }))
      withProfileIndex(mk('practiceSessions', { keyPath: ['profileId', 'stageId'] }))
      withProfileIndex(mk('unknownWords', { keyPath: ['profileId', 'wordId'] }))
      withProfileIndex(mk('coinHistory', { keyPath: 'id', autoIncrement: true }))
      withProfileIndex(mk('ownedCharacters', { keyPath: 'id', autoIncrement: true }))
      withProfileIndex(mk('dexEntries', { keyPath: ['profileId', 'speciesId', 'stage'] }))
      withProfileIndex(mk('gachaHistory', { keyPath: 'id', autoIncrement: true }))
      withProfileIndex(mk('diaryEntries', { keyPath: ['profileId', 'dateKey'] }))
      withProfileIndex(mk('myWords', { keyPath: ['profileId', 'wordId'] }))
      mk('activityFeed', { keyPath: 'id', autoIncrement: true })
      mk('settings', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
  return dbPromise
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

async function withStore<T>(name: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await getDb()
  const tx = db.transaction(name, mode)
  const result = promisify(fn(tx.objectStore(name)))
  return result
}

export function dbGet<T>(name: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withStore(name, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
}

export function dbPut(name: StoreName, value: unknown): Promise<IDBValidKey> {
  return withStore(name, 'readwrite', (s) => s.put(value))
}

export function dbAdd(name: StoreName, value: unknown): Promise<IDBValidKey> {
  return withStore(name, 'readwrite', (s) => s.add(value))
}

export function dbDelete(name: StoreName, key: IDBValidKey): Promise<undefined> {
  return withStore(name, 'readwrite', (s) => s.delete(key)) as Promise<undefined>
}

export function dbClear(name: StoreName): Promise<undefined> {
  return withStore(name, 'readwrite', (s) => s.clear()) as Promise<undefined>
}

export function dbGetAll<T>(name: StoreName): Promise<T[]> {
  return withStore(name, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
}

export function dbCount(name: StoreName): Promise<number> {
  return withStore(name, 'readonly', (s) => s.count())
}

export async function dbIndexAll<T>(name: StoreName, indexName: string, key: IDBValidKey): Promise<T[]> {
  const db = await getDb()
  const tx = db.transaction(name, 'readonly')
  return promisify(tx.objectStore(name).index(indexName).getAll(key) as IDBRequest<T[]>)
}

export async function dbIndexKeys(name: StoreName, indexName: string, key: IDBValidKey): Promise<IDBValidKey[]> {
  const db = await getDb()
  const tx = db.transaction(name, 'readonly')
  return promisify(tx.objectStore(name).index(indexName).getAllKeys(key))
}
