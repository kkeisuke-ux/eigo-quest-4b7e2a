// 判定のきびしさをその場で変更できるボタン（練習画面・設定画面から使用）。
import { useState } from 'react'
import { DEFAULT_STRICTNESS, STRICTNESS_LABELS } from '../config/judgeConfig'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { useProfile } from '../state/hooks'
import { bumpData, showToast } from '../state/store'
import { saveProfile } from '../storage/repo'
import { Button, Modal } from './components'

export function StrictnessButton() {
  const profile = useProfile()
  const [open, setOpen] = useState(false)
  if (!profile) return null
  const current = profile.judgeStrictness ?? DEFAULT_STRICTNESS

  const change = async (level: number) => {
    profile.judgeStrictness = level
    await saveProfile(profile)
    setStrictnessRuntime(level)
    bumpData()
    setOpen(false)
    showToast(`はんていを「${STRICTNESS_LABELS[level - 1]}」に かえたよ`)
  }

  return (
    <>
      <button className="strict-btn" onClick={() => setOpen(true)} title="はんていの きびしさ">
        はんてい:{STRICTNESS_LABELS[current - 1]}
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2>はんていの きびしさ</h2>
        <p className="tile-sub">○×の判定がきびしすぎる／あますぎると感じたら、ここで調整してね。</p>
        <div className="grade-picker">
          {STRICTNESS_LABELS.map((label, i) => (
            <button
              key={label}
              className={`grade-btn ${current === i + 1 ? 'grade-btn-on' : ''}`}
              onClick={() => void change(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="row gap" style={{ marginTop: 14 }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            とじる
          </Button>
        </div>
      </Modal>
    </>
  )
}
