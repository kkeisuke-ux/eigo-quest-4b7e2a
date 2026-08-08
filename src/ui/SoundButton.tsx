// 音のワンタップ切り替えボタン（効果音+BGMを一括オン/オフ。個別設定は設定画面）。
import { getAppFlags } from '../config/appFlags'
import { toggleAllSound } from '../audio/sound'
import { useAppState } from '../state/store'

export function SoundButton() {
  useAppState((s) => s.soundVersion)
  const { seOn, bgmOn } = getAppFlags()
  const on = seOn || bgmOn
  return (
    <button
      className={`sound-btn ${on ? '' : 'sound-btn-off'}`}
      onClick={() => void toggleAllSound()}
      aria-label={on ? '音をけす' : '音をだす'}
      title={on ? '音をけす' : '音をだす'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {on ? (
          <>
            <path d="M16 9c1 .8 1 5.2 0 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.5 7c2 1.6 2 8.4 0 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <line x1="16" y1="9" x2="21" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
        {!on && <line x1="21" y1="9" x2="16" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
      </svg>
    </button>
  )
}
