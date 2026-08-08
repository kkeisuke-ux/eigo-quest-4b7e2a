// 画面表示と同時に自動発音するためのReactフック（仕様 §7, §12）。
import { useEffect } from 'react'
import { speak, stopSpeaking, type SpeechKind } from './tts'

/**
 * text（または key）が変わるたびに自動発音する。
 * 例: 新しいアルファベット/英単語のカードが表示された瞬間に読み上げる。
 * text が null のときは発音しない（テストで答えを読み上げない用途。仕様 §17）。
 * key: 同じ単語でもステップが変わったら再発音したい場合に指定する。
 */
export function useAutoSpeak(text: string | null, kind: SpeechKind, key?: unknown): void {
  useEffect(() => {
    if (!text) return
    // 画面が出て一呼吸おいてから発音（遷移アニメと重ならないように）
    const timer = window.setTimeout(() => void speak(text, kind), 250)
    return () => {
      window.clearTimeout(timer)
      stopSpeaking()
    }
  }, [text, kind, key])
}
