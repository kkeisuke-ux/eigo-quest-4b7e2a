// GitHub Pages へのデプロイスクリプト（初回も更新も同じコマンド1つ）:
//   node scripts/deploy-pages.mjs
// やること:
//   1. GitHubリポジトリ kanji-quest が無ければ作成（public）、main を push
//   2. npm run build で dist/ を再生成
//   3. dist/ を gh-pages ブランチとして force push
//   4. GitHub Pages を有効化（初回のみ）
//   5. 公開URLが200を返すまでポーリングして結果を表示
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
// ランダム接尾辞付き = URLを知っている人しか辿り着けない（検索よけは robots.txt + noindex メタで対応）
const REPO = 'eigo-quest-4b7e2a'

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', shell: false, ...opts })
  return { code: res.status ?? -1, out: (res.stdout ?? '') + (res.stderr ?? '') }
}

function must(desc, { code, out }) {
  if (code !== 0) {
    console.error(`NG: ${desc}\n${out}`)
    process.exit(1)
  }
  return out
}

// 0. gh 認証とオーナー名
const who = run('gh', ['api', 'user', '-q', '.login'])
if (who.code !== 0) {
  console.error('GitHub CLIが未認証です。`gh auth login` を実行してください。')
  process.exit(1)
}
const OWNER = who.out.trim()
const PAGES_URL = `https://${OWNER}.github.io/${REPO}/`
console.log(`GitHubアカウント: ${OWNER}`)

// 1. リポジトリ確認・作成・push
const hasRemote = run('git', ['remote', 'get-url', 'origin'], { cwd: ROOT }).code === 0
if (!hasRemote) {
  const exists = run('gh', ['repo', 'view', `${OWNER}/${REPO}`], { cwd: ROOT }).code === 0
  if (!exists) {
    console.log('リポジトリを作成してpushします…')
    must('gh repo create', run('gh', ['repo', 'create', REPO, '--public', '--source=.', '--push'], { cwd: ROOT }))
  } else {
    must('git remote add', run('git', ['remote', 'add', 'origin', `https://github.com/${OWNER}/${REPO}.git`], { cwd: ROOT }))
    must('git push main', run('git', ['push', '-u', 'origin', 'main'], { cwd: ROOT }))
  }
} else {
  console.log('mainをpushします…')
  must('git push main', run('git', ['push', 'origin', 'main'], { cwd: ROOT }))
}

// 2. ビルド
console.log('ビルドします…')
must('npm run build', run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: ROOT, shell: process.platform === 'win32' }))
fs.writeFileSync(path.join(DIST, '.nojekyll'), '')

// 3. dist/ を gh-pages として force push
console.log('gh-pagesへデプロイします…')
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true })
must('git init (dist)', run('git', ['init', '-b', 'gh-pages'], { cwd: DIST }))
run('git', ['config', 'user.name', 'Keisuke Komura'], { cwd: DIST })
run('git', ['config', 'user.email', 'kkeisuke@meijo-u.ac.jp'], { cwd: DIST })
must('git add (dist)', run('git', ['add', '-A'], { cwd: DIST }))
must('git commit (dist)', run('git', ['commit', '-m', `deploy ${new Date().toISOString()}`], { cwd: DIST }))
must('git push gh-pages', run('git', ['push', '--force', `https://github.com/${OWNER}/${REPO}.git`, 'gh-pages:gh-pages'], { cwd: DIST }))
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true })

// 4. Pages有効化（初回のみ。既に有効なら409が返るので無視）
const pages = run('gh', ['api', `repos/${OWNER}/${REPO}/pages`, '-X', 'POST', '-f', 'source[branch]=gh-pages', '-f', 'source[path]=/'])
if (pages.code === 0) console.log('GitHub Pagesを有効化しました。')
else if (/409|already exists/i.test(pages.out)) console.log('GitHub Pagesは有効化済みです。')
else console.log(`Pages有効化の応答: ${pages.out.slice(0, 200)}`)

// 5. 公開確認（最大3分ポーリング）
console.log(`公開を確認しています… ${PAGES_URL}`)
const deadline = Date.now() + 180_000
let ok = false
while (Date.now() < deadline) {
  try {
    const res = await fetch(PAGES_URL, { cache: 'no-store' })
    if (res.ok) {
      ok = true
      break
    }
  } catch {
    // まだ配信されていない
  }
  await new Promise((r) => setTimeout(r, 8000))
  process.stdout.write('.')
}
console.log('')
if (ok) {
  console.log('========================================')
  console.log('公開完了！ このURLをiPadのSafariで開いてください:')
  console.log(`  ${PAGES_URL}`)
  console.log('共有ボタン →「ホーム画面に追加」でアプリになります。')
  console.log('========================================')
} else {
  console.log(`まだ配信が始まっていません。数分後に ${PAGES_URL} を開いて確認してください。`)
}
