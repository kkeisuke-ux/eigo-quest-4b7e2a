// 音声再生ボタン（仕様 §7, §12, §18, §31）。何度でも聞き直せる。
import { useState } from 'react'
import { speak, type SpeechKind } from '../audio/tts'

export function SpeakButton({
  text,
  kind = 'word',
  size = 'md',
  label,
}: {
  text: string
  kind?: SpeechKind
  size?: 'sm' | 'md' | 'lg'
  label?: string
}) {
  const [playing, setPlaying] = useState(false)
  const onClick = () => {
    setPlaying(true)
    void speak(text, kind).finally(() => setPlaying(false))
  }
  return (
    <button
      className={`speak-btn speak-btn-${size} ${playing ? 'speak-btn-playing' : ''}`}
      onClick={onClick}
      aria-label={`「${text}」をきく`}
      title="はつおんを きく"
    >
      <svg viewBox="0 0 24 24" width={size === 'lg' ? 28 : size === 'sm' ? 18 : 22} height={size === 'lg' ? 28 : size === 'sm' ? 18 : 22} aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 9c1 .8 1 5.2 0 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M18.5 7c2 1.6 2 8.4 0 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label && <span>{label}</span>}
    </button>
  )
}
