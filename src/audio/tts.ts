// 英語発音（仕様 §7, §12, §31, §62）。
// - アメリカ英語（en-US）をfeature detectionして使用
// - 発音中はBGMを自動的に下げる（audio ducking。仕様 §35）
// - AudioProvider構造: 将来 public/audio/voice/ の録音ファイルへ差し替えられる。
//   現在は SpeechSynthesis（ブラウザTTS）実装のみ。README「発音音声について」参照。
import { getAppFlags } from '../config/appFlags'
import { duckBgm, getVoiceOutput } from './sound'
import voiceManifestJson from '../data/voiceManifest.json'

export type SpeechKind = 'letter' | 'word' | 'sentence'

export interface PronunciationProvider {
  /** この環境で使えるか */
  available(): boolean
  /** テキストを発音する。終了（またはエラー）でresolve */
  speak(text: string, kind: SpeechKind): Promise<void>
  stop(): void
}

// ---------------- SpeechSynthesis 実装 ----------------
let cachedVoice: SpeechSynthesisVoice | null = null
let voicesListening = false

// Apple端末に入っているジョーク系・ロボット系の音声。自動選択されると
// 「潰れた声」「笑っているような変な声」になるため必ず除外する（第10・11回）。
// 注意: iOSは端末の言語設定によって音声の表示名がローカライズされる（英語名では
// 一致しないことがある）ため、ローカライズされない voiceURI（com.apple.eloquence.… 等）
// でも判定する。eloquence = iOSのロボット声ファミリー（Eddy/Flo/Jester/Sandy…）全部。
const NOVELTY_VOICES =
  /eloquence|albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|grandma|grandpa|jester|junior|kathy|organ|ralph|rocko|shelley|superstar|trinoids|whisper|wobble|zarvox|\beddy\b|\bflo\b|\breed\b|\bsandy\b/i

function isCleanVoice(v: SpeechSynthesisVoice): boolean {
  const id = `${v.name} ${v.voiceURI ?? ''}`
  return !/compact/i.test(id) && !NOVELTY_VOICES.test(id)
}

/**
 * 英語として使える音声の一覧（設定画面の「声をえらぶ」用。第11回）。
 * きれいな声（en-US→他の英語）を先に、ジョーク系はしるし付きで最後に並べる。
 */
export function listEnglishVoices(): { voiceURI: string; label: string; clean: boolean }[] {
  if (typeof speechSynthesis === 'undefined') return []
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  const langOrder = (v: SpeechSynthesisVoice) => (v.lang === 'en-US' || v.lang === 'en_US' ? 0 : 1)
  const sorted = [...voices].sort((a, b) => {
    const ca = isCleanVoice(a) ? 0 : 1
    const cb = isCleanVoice(b) ? 0 : 1
    if (ca !== cb) return ca - cb
    if (langOrder(a) !== langOrder(b)) return langOrder(a) - langOrder(b)
    return a.name.localeCompare(b.name)
  })
  return sorted.map((v) => ({
    voiceURI: v.voiceURI,
    label: `${v.name}（${v.lang}）${isCleanVoice(v) ? '' : '　※へんな声'}`,
    clean: isCleanVoice(v),
  }))
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null
  // ユーザーが設定画面で選んだ声が最優先（第11回）
  const saved = getAppFlags().voiceUri
  if (saved) {
    const v = voices.find((v) => v.voiceURI === saved)
    if (v) return v
  }
  const ok = isCleanVoice
  const matches = (v: SpeechSynthesisVoice, key: string) => {
    const k = key.toLowerCase()
    return v.name.toLowerCase().includes(k) || (v.voiceURI ?? '').toLowerCase().includes(k)
  }
  const enUs = voices.filter((v) => v.lang === 'en-US' || v.lang === 'en_US')
  // クリアな女性の声を最優先（第11回ユーザー指定）。表示名がローカライズされていても
  // voiceURIで一致するようにする。次にGoogle音声、他の英語圏の女性声、最後に男性の標準声
  const preferredNames = [
    'Samantha', 'Ava', 'Allison', 'Nicky', 'Joelle', 'Zoe', 'Susan', 'Vicki',
    'Google US English', 'Karen', 'Moira', 'Tessa', 'Serena', 'Kate', 'Martha',
    'Aaron', 'Daniel', 'Nathan', 'Evan', 'Tom',
  ]
  for (const name of preferredNames) {
    const v =
      enUs.find((v) => matches(v, name) && ok(v)) ??
      voices.find((v) => matches(v, name) && v.lang.startsWith('en') && ok(v))
    if (v) return v
  }
  // 端末の既定音声（たいてい標準品質以上）→ ローカルのまともな声 → 何でもまともな声 の順
  const good = enUs.filter(ok)
  if (good.length > 0) {
    return good.find((v) => v.default) ?? good.find((v) => v.localService) ?? good[0]
  }
  const enGood = voices.filter((v) => v.lang.startsWith('en') && ok(v))
  if (enGood.length > 0) return enGood[0]
  // 最終手段（全部ノベルティ声しかない端末）
  if (enUs.length > 0) return enUs[0]
  const en = voices.filter((v) => v.lang.startsWith('en'))
  return en.length > 0 ? en[0] : null
}

/** 設定画面で声を変えたあとに呼ぶ（選び直し。第11回） */
export function refreshVoiceChoice(): void {
  cachedVoice = pickVoice() ?? cachedVoice
}

function ensureVoices(): void {
  if (typeof speechSynthesis === 'undefined') return
  if (!voicesListening) {
    voicesListening = true
    // iOSのChrome等は音声リストが遅れて届く／増えることがあるため、
    // voiceschangedのたびに選び直す（onceにしない。第10回）
    speechSynthesis.addEventListener('voiceschanged', () => {
      cachedVoice = pickVoice() ?? cachedVoice
    })
  }
  if (!cachedVoice) cachedVoice = pickVoice()
}

// iOS/iPad Safariは、ユーザー操作（タップ）の中で一度 speak() しないと
// 以後の自動発音（setTimeout経由など）が無音になる。最初のタップで
// 無音のダミー発話を行い、SpeechSynthesisをアンロックする（仕様 §7の自動発音を成立させる）。
let speechUnlocked = false

export function unlockSpeechOnGesture(): void {
  if (typeof window === 'undefined' || typeof speechSynthesis === 'undefined') return
  const handler = () => {
    if (speechUnlocked) return
    speechUnlocked = true
    try {
      ensureVoices()
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      u.rate = 10
      u.lang = 'en-US'
      speechSynthesis.speak(u)
    } catch {
      // アンロック失敗しても発音ボタンからは鳴る
    }
    window.removeEventListener('pointerdown', handler)
  }
  window.addEventListener('pointerdown', handler, { passive: true })
}

let ttsSeq = 0

class TtsProvider implements PronunciationProvider {
  available(): boolean {
    return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'
  }

  async speak(text: string, kind: SpeechKind): Promise<void> {
    if (!this.available() || !text.trim()) return
    const my = ++ttsSeq
    ensureVoices()
    // en-US音声のリストがまだ来ていないときは少し待つ。
    // voice未指定のまま話すと、日本語設定のiPadでは日本語音声が英語を読んでしまい
    // 「日本人が英語を読んでいるような発音」になる（2026-08-08フィードバックの原因）
    for (let i = 0; i < 3 && !cachedVoice; i++) {
      await new Promise((r) => setTimeout(r, 250))
      cachedVoice = pickVoice()
    }
    // 直前の発話は打ち切る（連続でカードをめくった時に音が重ならない）。
    // iOS Safariには「cancel()直後のspeak()が無視されて無音になる」既知バグがあるため、
    // キューに何かある時だけcancelし、少し間を置いてから話す（アルファベットの
    // 自動発音が聞こえない問題の修正。2026-08-08 第4回フィードバック）
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel()
      await new Promise((r) => setTimeout(r, 120))
    }
    // 待っている間に新しい発話要求が来ていたら、この発話は破棄する
    if (my !== ttsSeq) return
    return new Promise((resolve) => {
      // iOSはタブ復帰後などにpausedのまま止まることがあるため毎回起こす
      try {
        speechSynthesis.resume()
      } catch {
        // resume非対応でも発話は試みる
      }
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      if (cachedVoice) u.voice = cachedVoice
      u.volume = Math.min(1, Math.max(0, getAppFlags().voiceVolume))
      u.rate = kind === 'sentence' ? 0.95 : 0.82
      u.pitch = 1.0
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        duckBgm(false)
        resolve()
      }
      u.onend = done
      u.onerror = done
      duckBgm(true)
      speechSynthesis.speak(u)
      // Safariでonendが来ないケースへの保険（最大 テキスト長比例 + 3秒）
      window.setTimeout(done, 3000 + text.length * 220)
    })
  }

  stop(): void {
    if (this.available()) speechSynthesis.cancel()
  }
}

// 将来: public/audio/voice/<key>.mp3 を優先再生する FileProvider をここに追加し、
// providers 配列の先頭に入れる（available()で存在チェック）。
const providers: PronunciationProvider[] = [new TtsProvider()]

export function getPronunciation(): PronunciationProvider {
  return providers.find((p) => p.available()) ?? providers[providers.length - 1]
}

/** 英語音声が使えるか（設定画面の表示用） */
export function speechAvailable(): boolean {
  return providers.some((p) => p.available())
}

/** 現在選ばれている音声名（診断表示用） */
export function currentVoiceName(): string | null {
  ensureVoices()
  return cachedVoice ? `${cachedVoice.name} (${cachedVoice.lang})` : null
}

// ---------------- 内蔵発音ファイル（第12回） ----------------
// 端末のTTSは品質が端末依存（iPhoneのブラウザにはまともな英語音声が公開されて
// いないことがある）ため、Piper TTS（en_US-amy-medium=クリアな女性声）で事前生成した
// mp3（public/audio/voice/）を最優先で再生する。scripts/gen-voice.mjs で再生成できる。
// 一覧に無いテキスト（えにっきの自由文など）だけTTSへフォールバック。
const VOICE_KEYS = new Set<string>(voiceManifestJson as string[])

// scripts/gen-voice.mjs と同じスラッグ規則にすること
function voiceSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'
  )
}

const voiceBufferCache = new Map<string, AudioBuffer | 'missing'>()
let currentVoiceSource: AudioBufferSourceNode | null = null

async function loadVoiceBuffer(key: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  const hit = voiceBufferCache.get(key)
  if (hit instanceof AudioBuffer) return hit
  if (hit === 'missing') return null
  try {
    const res = await fetch(`./audio/voice/${key}.mp3`)
    if (!res.ok) throw new Error(String(res.status))
    const buf = await ctx.decodeAudioData(await res.arrayBuffer())
    voiceBufferCache.set(key, buf)
    return buf
  } catch {
    voiceBufferCache.set(key, 'missing')
    return null
  }
}

function stopFileVoice(): void {
  if (currentVoiceSource) {
    try {
      currentVoiceSource.stop()
    } catch {
      // すでに停止済みなら無視
    }
    currentVoiceSource = null
  }
}

/**
 * 内蔵の発音ファイルがあれば再生してtrue（superseded時もtrue=何もしない）。
 * 無ければfalse（呼び出し側でTTSへフォールバック）。
 */
async function tryFileSpeak(text: string, mySeq: number): Promise<boolean> {
  const key = voiceSlug(text)
  if (!VOICE_KEYS.has(key)) return false
  const out = getVoiceOutput()
  if (!out) return false
  const buf = await loadVoiceBuffer(key, out.ctx)
  if (!buf) return false
  if (mySeq !== seq) return true // 待っている間に新しい発話要求が来た
  stopFileVoice()
  getPronunciation().stop()
  return new Promise<boolean>((resolve) => {
    const src = out.ctx.createBufferSource()
    src.buffer = buf
    src.connect(out.bus)
    currentVoiceSource = src
    duckBgm(true)
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      if (currentVoiceSource === src) currentVoiceSource = null
      duckBgm(false)
      resolve(true)
    }
    src.onended = done
    try {
      src.start()
    } catch {
      done()
    }
    window.setTimeout(done, buf.duration * 1000 + 1500)
  })
}

let seq = 0

/** 発音の共通入口。連続呼び出し時は最後の呼び出しだけが生きる */
export async function speak(text: string, kind: SpeechKind): Promise<void> {
  const my = ++seq
  // 大文字1文字を渡すとTTSが「capital A」と読むことがあるため、
  // 文字名の発音は小文字で渡す（"a" → 「エイ」とだけ読む）
  const spoken = kind === 'letter' ? text.toLowerCase() : text
  // まず内蔵のクリアな女性声（第12回）。無いテキストだけTTSへ
  if (await tryFileSpeak(spoken, my)) return
  if (my !== seq) return
  const p = getPronunciation()
  await p.speak(spoken, kind)
}

export function stopSpeaking(): void {
  stopFileVoice()
  getPronunciation().stop()
}

/** アルファベットの文字名を発音（大文字・小文字とも文字名だけを読む。仕様 §7） */
export function speakLetter(letter: string): Promise<void> {
  return speak(letter, 'letter')
}

export function speakWord(word: string): Promise<void> {
  return speak(word, 'word')
}

export function speakSentence(text: string): Promise<void> {
  return speak(text, 'sentence')
}
