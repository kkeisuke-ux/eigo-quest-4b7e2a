// 英語発音（仕様 §7, §12, §31, §62）。
// - アメリカ英語（en-US）をfeature detectionして使用
// - 発音中はBGMを自動的に下げる（audio ducking。仕様 §35）
// - AudioProvider構造: 将来 public/audio/voice/ の録音ファイルへ差し替えられる。
//   現在は SpeechSynthesis（ブラウザTTS）実装のみ。README「発音音声について」参照。
import { getAppFlags } from '../config/appFlags'
import { duckBgm } from './sound'

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
let voicesLoaded = false

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const notCompact = (v: SpeechSynthesisVoice) => !/compact/i.test(v.name) && !/compact/i.test(v.voiceURI ?? '')
  const enUs = voices.filter((v) => v.lang === 'en-US' || v.lang === 'en_US')
  // iOS/macOSの高品質なネイティブ音声を最優先（Compact=低品質版は避ける）
  const preferredNames = ['Samantha', 'Ava', 'Allison', 'Nicky', 'Joelle', 'Zoe', 'Nathan', 'Evan']
  for (const name of preferredNames) {
    const v =
      enUs.find((v) => v.name.includes(name) && notCompact(v)) ??
      voices.find((v) => v.name.includes(name) && v.lang.startsWith('en') && notCompact(v))
    if (v) return v
  }
  if (enUs.length > 0) {
    return enUs.find((v) => v.localService && notCompact(v)) ?? enUs.find(notCompact) ?? enUs[0]
  }
  const en = voices.filter((v) => v.lang.startsWith('en'))
  return en.length > 0 ? en[0] : null
}

function ensureVoices(): void {
  if (voicesLoaded || typeof speechSynthesis === 'undefined') return
  cachedVoice = pickVoice()
  if (cachedVoice) {
    voicesLoaded = true
    return
  }
  speechSynthesis.addEventListener(
    'voiceschanged',
    () => {
      cachedVoice = pickVoice()
      voicesLoaded = true
    },
    { once: true }
  )
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

class TtsProvider implements PronunciationProvider {
  available(): boolean {
    return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'
  }

  async speak(text: string, kind: SpeechKind): Promise<void> {
    if (!this.available() || !text.trim()) return
    ensureVoices()
    // en-US音声のリストがまだ来ていないときは少し待つ。
    // voice未指定のまま話すと、日本語設定のiPadでは日本語音声が英語を読んでしまい
    // 「日本人が英語を読んでいるような発音」になる（2026-08-08フィードバックの原因）
    for (let i = 0; i < 3 && !cachedVoice; i++) {
      await new Promise((r) => setTimeout(r, 250))
      cachedVoice = pickVoice()
    }
    return new Promise((resolve) => {
      // 直前の発話は打ち切る（連続でカードをめくった時に音が重ならない）
      speechSynthesis.cancel()
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

let seq = 0

/** 発音の共通入口。連続呼び出し時は最後の呼び出しだけが生きる */
export async function speak(text: string, kind: SpeechKind): Promise<void> {
  const my = ++seq
  const p = getPronunciation()
  if (my !== seq) return
  // 大文字1文字を渡すとTTSが「capital A」と読むことがあるため、
  // 文字名の発音は小文字で渡す（"a" → 「エイ」とだけ読む）
  const spoken = kind === 'letter' ? text.toLowerCase() : text
  await p.speak(spoken, kind)
}

export function stopSpeaking(): void {
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
