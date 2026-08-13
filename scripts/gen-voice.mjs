// ============================================================
// 発音音声ファイルの生成（第12回: TTSの品質が端末依存で使いものに
// ならないため、クリアな女性声をアプリに内蔵する）。
//   node scripts/gen-voice.mjs
// - Piper TTS（完全ローカル・MITライセンス・en_US-amy-medium=女性声）で
//   アルファベット26字・全単語・全例文の音声を合成
// - ffmpegでmp3化して public/audio/voice/<slug>.mp3 に配置
// - 生成した一覧を src/data/voiceManifest.json に書き出す（実行時の存在判定用）
// - 第16回: **増分生成**。既にmp3があるキーは再合成しない（Piperの合成は
//   noise_scaleにより確率的で、既に確認済みの音声を毎回上書きすると偶然
//   悪い結果に化けることがあるため）。特定の音を作り直したい時だけ該当mp3を
//   削除してから実行し、Whisper等で必ず再確認すること
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
// 既定の声（女性・クリア）。全キーamyで統一。
// 第18回: 第16回まではZのみlessac（別話者）だったが「Zだけ声が違う」との指摘で廃止。
// amyは単独発話"zee"/"Z."だと語頭の/z/が確実に無声化する（Whisper検証40/40で"see"化）が、
// 連続発話「zee, zee, zee, zee.」(length_scale 1.15)の文末では正しく有声化することが
// 分かったため、現在のz.mp3はそのキャリアフレーズから文末の"zee"を切り出して
// 音量調整した**手動生成品**。z.mp3を削除してこのスクリプトで再生成すると
// 単独発話の無声化問題が再発するので、z.mp3は削除しないこと。
const MODELS = {
  amy: path.join(TOOLS, 'en_US-amy-medium.onnx'),
}
const MODEL_OVERRIDE = {}
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
// 文字名として安定して読まないことがあり、D/G/Zなどが不明瞭になっていた。
// 第16回: 「文字の呼び名」の英単語スペル（dee/gee等）に置き換える案は一部の文字
// （特にA="ay"）が単独だと間投詞"aye"（＝はい、/aɪ/）に化けて別の音になってしまい
// 直らなかった。**大文字1文字+ピリオド**（"A."）が最も安定して文字名として読まれる
// ことが判明（Whisper転写で26字中22字が完全一致、旧方式の20字より良好）。
// Q("cue")・T("tee")は元のスペルの方が良好だったため維持。Zは手動生成品
// （冒頭のコメント参照。z.mp3がある限り増分生成で温存され、ここの'zee'は使われない）。
const LETTER_NAMES = {
  q: 'cue', t: 'tee', z: 'zee',
}
for (let i = 0; i < 26; i++) {
  const lower = String.fromCharCode(97 + i)
  items.set(lower, LETTER_NAMES[lower] ?? `${lower.toUpperCase()}.`)
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

// ---------- 既存ファイルは再合成しない（増分生成） ----------
// Piperの合成はnoise_scale（既定0.667）により毎回結果が微妙に変わる確率的なもの。
// lessac+"zee"（Z）はnoise_scale既定値でも約1/3の確率でしか語頭の/z/が正しく
// 有声化されないことがWhisper転写の繰り返し検証で判明した（noise_scale=0の決定的
// 合成にしても、たまたま悪い方に固定されるだけで解決しない）。他の文字・単語にも
// 同様の確率的なブレはあり得るため、**既にmp3が存在するキーは全件再生成のたびに
// 上書きしない**（そのまま温存する）。特定の音を再生成したい時だけ、該当mp3を
// 手動で削除してからこのスクリプトを実行し、Whisperで再確認すること
// （scripts配下に検証用のPython例あり。README「音源ファイルの配置」参照）。
const PINNED_KEYS = [...items.keys()].filter((k) => fs.existsSync(path.join(OUT_DIR, `${k}.mp3`)))
for (const k of PINNED_KEYS) items.delete(k)

console.log(`生成対象: ${items.size}件（既存の${PINNED_KEYS.length}件はそのまま温存）`)

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

// ---------- マニフェスト（固定済みキーも対象に含める） ----------
const keys = [...items.keys(), ...PINNED_KEYS].filter((k) => fs.existsSync(path.join(OUT_DIR, `${k}.mp3`))).sort()
fs.writeFileSync(MANIFEST, JSON.stringify(keys), 'utf8')
fs.rmSync(TMP_DIR, { recursive: true, force: true })

const totalKb = keys.reduce((n, k) => n + fs.statSync(path.join(OUT_DIR, `${k}.mp3`)).size, 0) / 1024
console.log(`完了: ${converted}件のmp3（合計 ${Math.round(totalKb / 1024 * 10) / 10}MB）→ public/audio/voice/`)
console.log(`マニフェスト: ${keys.length}件 → src/data/voiceManifest.json`)
