import { createRoot } from 'react-dom/client'
import App from './App'
import { initSoundOnGesture } from './audio/sound'
import './styles.css'
import './devHooks'

createRoot(document.getElementById('root')!).render(<App />)

// iOS Safariの自動再生制限対策: 最初のタップで音を有効化
initSoundOnGesture()

// Service Worker（ビルド後に scripts/gen-sw.mjs が dist/sw.js を生成する）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // SWが使えない環境（非HTTPS等）でもアプリ本体は動作する
    })
  })
}
