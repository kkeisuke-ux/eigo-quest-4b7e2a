// ============================================================
// 発音音声ファイルの一括生成（第12回: TTSの品質が端末依存で使いものに
// ならないため、クリアな女性声をアプリに内蔵する）。
//   node scripts/gen-voice.mjs
// - Piper TTS（完全ローカル・MITライセンス・en_US-amy-medium=女性声）で
//   アルファベット26字・全単語・全例文の音声を合成
// - ffmpegでmp3化して public/audio/voice/<slug>.mp3 に配置
// - 生成した一覧を src/data/voiceManifest.json に書き出す（実行時の存在判定用）
// 必要ツール（配置済み）: ../_tools/piper/piper/piper.exe と en_US-amy-medium.onnx
// ============================================================
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
// piper.exe（ONNX Runtime）は日本語を含むパスでクラッシュする（0xC0000409）ため、
// ツール・モデル・wav出力はASCIIのみのパスで扱う。元ファイルは ../_tools/piper に保管。
const TOOLS_SRC = path.join(ROOT, '..', '_tools', 'piper')
const TOOLS = 'C:\\Users\\komura\\AppData\\Local\\Temp\\claude\\piper-tts'
const PIPER = path.join(TOOLS, 'piper', 'piper.exe')
// 既定の声（女性・クリア）。第16回: Zだけは amy だと語頭の /z/ が /s/ に無声化してしまい
// 何度テキストを変えても直らなかったため、その1字だけ lessac（同じく女性・近い声質。
// F0実測: amy≈208Hz / lessac≈191Hz）に差し替える。MODEL_OVERRIDEに無い項目は既定のamy。
const MODELS = {
  amy: path.join(TOOLS, 'en_US-amy-medium.onnx'),
  lessac: path.join(TOOLS, 'en_US-lessac-medium.onnx'),
}
const MODEL_OVERRIDE = { z: 'lessac' }
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'voice')
const TMP_DIR = path.join(TOOLS, 'tmp-wav')
const MANIFEST = path.join(ROOT, 'src', 'data', 'voiceManifest.json')

// ASCIIパスにツール一式が無ければ _tools からコピーして使う
if (!fs.existsSync(PIPER) || !fs.existsSync(MODELS.amy)) {
  if (!fs.existsSync(path.join(TOOLS_SRC, 'piper', 'piper.exe'))) {
    console.error('piper.exe が見つかりません:', TOOLS_SRC)
    process.exit(1)
  }
  console.log('piper一式をASCIIパスへコピー中…')
  fs.mkdirSync(TOOLS, { recursive: true })
  fs.cpSync(path.join(TOOLS_SRC, 'piper'), path.join(TOOLS, 'piper'), { recursive: true })
  for (const f of ['en_US-amy-medium.onnx', 'en_US-amy-medium.onnx.json']) {
    fs.copyFileSync(path.join(TOOLS_SRC, f), path.join(TOOLS, f))
  }
}
if (!fs.existsSync(MODELS.lessac)) {
  console.error('lessacモデルが見つかりません（Zの発音修正に必要）:', MODELS.lessac)
  process.exit(1)
}

// 実行時（tts.ts）と同じスラッグ規則にすること
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x'

// ---------- 読み上げテキストの収集 ----------
const items = new Map() // slug -> 読み上げテキスト

// 1) アルファベット26字（スラッグは小文字1字）。
// 第15回: 単独の大文字1文字（例"D"）をそのままPiperに渡すと、G2P（音素変換）が
// 文字名として安定して読まないことがあり、D/G/Zなどが不明瞭になっていた
// （Zは語頭の有声摩擦音が弱まる、Gは"guh"と短く切れる、Dも同様の傾向）。
// 全26字を「文字の呼び名」の英単語スペルに置き換え、確実に文字名として読ませる。
const LETTER_NAMES = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'gee', h: 'aitch',
  i: 'eye', j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en', o: 'oh', p: 'pee',
  q: 'cue', r: 'ar', s: 'ess', t: 'tee', u: 'you', v: 'vee', w: 'double you',
  x: 'ex', y: 'why', z: 'zee',
}
for (let i = 0; i < 26; i++) {
  const lower = String.fromCharCode(97 + i)
  items.set(lower, LETTER_NAMES[lower])
}

// 2) 単語（words.json の en）
const wordsJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'words.json'), 'utf8'))
for (const w of wordsJson.words) {
  items.set(slug(w.en), w.en)
}

// 3) 例文（sentences.ts の en: '...'）
const sentSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'sentences.ts'), 'utf8')
for (const m of sentSrc.matchAll(/en:\s*'([^']+)'/g)) {
  items.set(slug(m[1]), m[1])
}

// 4) 設定画面の試し聞き
items.set(slug('apple'), 'apple')

console.log(`生成対象: ${items.size}件（アルファベット26 + 単語 + 例文)`)

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.rmSync(TMP_DIR, { recursive: true, force: true })
fs.mkdirSync(TMP_DIR, { recursive: true })

// ---------- Piperで合成（JSONL一括入力・モデルごとにグループ化） ----------
const byModel = new Map() // モデル名 -> [{key, text}]
for (const [key, text] of items) {
  const modelName = MODEL_OVERRIDE[key] ?? 'amy'
  if (!byModel.has(modelName)) byModel.set(modelName, [])
  byModel.get(modelName).push({ key, text })
}
console.log('Piperで合成中…（数分かかります）')
for (const [modelName, list] of byModel) {
  const lines = list.map(({ key, text }) => JSON.stringify({ text, output_file: path.join(TMP_DIR, `${key}.wav`) }))
  const res = spawnSync(PIPER, ['-m', MODELS[modelName], '--json-input'], {
    input: lines.join('\n') + '\n',
    cwd: path.join(TOOLS, 'piper'),
    maxBuffer: 64 * 1024 * 1024,
  })
  if (res.status !== 0) {
    console.error(`piper失敗（${modelName}）:`, res.stderr?.toString().slice(-2000))
    process.exit(1)
  }
}

// ---------- mp3へ変換 ----------
console.log('mp3へ変換中…')
let converted = 0
for (const key of items.keys()) {
  const wav = path.join(TMP_DIR, `${key}.wav`)
  if (!fs.existsSync(wav)) {
    console.error(`NG: wavが生成されていない: ${key}`)
    continue
  }
  const mp3 = path.join(OUT_DIR, `${key}.mp3`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '22050', '-codec:a', 'libmp3lame', '-q:a', '5', mp3])
  converted++
}

// ---------- マニフェスト ----------
const keys = [...items.keys()].filter((k) => fs.existsSync(path.join(OUT_DIR, `${k}.mp3`))).sort()
fs.writeFileSync(MANIFEST, JSON.stringify(keys), 'utf8')
fs.rmSync(TMP_DIR, { recursive: true, force: true })

const totalKb = keys.reduce((n, k) => n + fs.statSync(path.join(OUT_DIR, `${k}.mp3`)).size, 0) / 1024
console.log(`完了: ${converted}件のmp3（合計 ${Math.round(totalKb / 1024 * 10) / 10}MB）→ public/audio/voice/`)
console.log(`マニフェスト: ${keys.length}件 → src/data/voiceManifest.json`)
