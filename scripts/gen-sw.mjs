// vite build 後に dist/ を走査し、全アセットをプリキャッシュする Service Worker を生成する。
// 依存ライブラリなし。キャッシュ名は内容ハッシュ入りで、更新時に旧キャッシュを削除する。
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')

function walk(dir, base = '') {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel))
    else out.push(rel)
  }
  return out
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run vite build first.')
  process.exit(1)
}

// sourcemapはオフラインキャッシュに含めない（開発者ツールを開いた時だけネット経由で取得）
const files = walk(DIST).filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
const hash = crypto.createHash('md5')
for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(DIST, f)))
const version = hash.digest('hex').slice(0, 10)

const assets = ['./', ...files.map((f) => `./${f}`)]

const sw = `// 自動生成 Service Worker (scripts/gen-sw.mjs)
const CACHE = 'eigo-quest-${version}'
const ASSETS = ${JSON.stringify(assets, null, 2)}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')))
    return
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(req, clone))
          }
          return res
        })
    )
  )
})
`
fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf8')
console.log(`wrote dist/sw.js (${assets.length} assets, cache eigo-quest-${version})`)
