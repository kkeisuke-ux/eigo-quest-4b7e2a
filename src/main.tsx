import { createRoot } from 'react-dom/client'
import App from './App'
import { initSoundOnGesture } from './audio/sound'
import { unlockSpeechOnGesture } from './audio/tts'
import './styles.css'
import './devHooks'

createRoot(document.getElementById('root')!).render(<App />)

// iOS Safariの自動再生制限対策: 最初のタップで音と英語音声を有効化
initSoundOnGesture()
unlockSpeechOnGesture()

// Service Worker（ビルド後に scripts/gen-sw.mjs が dist/sw.js を生成する）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // ホーム画面に追加したアプリは「閉じずに再開」されることが多く、放っておくと
    // 更新を出しても古いまま使われ続ける。復帰のたびに更新を確認する（第31回）
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        const check = () => void reg.update()
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) check()
        })
        window.addEventListener('focus', check)
        setInterval(check, 60 * 60 * 1000)
      })
      .catch(() => {
        // SWが使えない環境（非HTTPS等）でもアプリ本体は動作する
      })

    // 新しいSWが操作権を取ったら1回だけ読み直して、その場で新しい画面にする。
    // 初回登録時は controller が無いので、無用なリロードはしない
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return
      reloading = true
      window.location.reload()
    })
  })
}
