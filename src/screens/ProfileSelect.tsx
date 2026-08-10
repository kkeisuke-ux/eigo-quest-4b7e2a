// プロフィール選択（起動画面）。最大5人、データは完全分離（仕様 §52）。
import { useState } from 'react'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { GRADE_LABELS, gradeLabelOf } from '../data/grades'
import { termClearLevelLabel } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, selectProfile } from '../state/store'
import { MAX_PROFILES, createProfile, deleteProfileDeep, listProfiles, listTestResults, saveProfile } from '../storage/repo'
import type { Profile } from '../storage/models'
import { Button, LoadingView, Modal } from '../ui/components'

export function ProfileSelect() {
  // 各プロフィールの到達レベル（まとめテスト100点の最高。第13回）も一緒に読む
  const { data } = useAsyncData(async () => {
    const list = await listProfiles()
    return Promise.all(
      list.map(async (p) => {
        const results = await listTestResults(p.id)
        const perfectIds = results.filter((r) => r.kind === 'term' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
        return { profile: p, level: termClearLevelLabel(perfectIds) }
      })
    )
  }, [])
  const profiles = data?.map((d) => d.profile) ?? null
  const levelOf = new Map((data ?? []).map((d) => [d.profile.id, d.level]))
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!profiles) return <LoadingView />

  const pick = async (p: Profile) => {
    p.lastActiveAt = Date.now()
    await saveProfile(p)
    setStrictnessRuntime(p.judgeStrictness)
    selectProfile(p.id)
    navigate({ name: 'home' })
  }

  const create = async () => {
    const n = name.trim()
    if (!n) return
    const p = await createProfile(n, grade)
    setCreating(false)
    setName('')
    bumpData()
    selectProfile(p.id)
    navigate({ name: 'home' })
  }

  const saveEdit = async () => {
    if (!editing) return
    editing.name = name.trim() || editing.name
    editing.grade = grade
    await saveProfile(editing)
    setEditing(null)
    bumpData()
  }

  const doDelete = async () => {
    if (!editing) return
    await deleteProfileDeep(editing.id)
    setEditing(null)
    setConfirmDelete(false)
    bumpData()
  }

  const gradePicker = (
    <div className="grade-picker">
      {GRADE_LABELS.map((label, i) => (
        <button key={label} className={`grade-btn ${grade === i ? 'grade-btn-on' : ''}`} onClick={() => setGrade(i)}>
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="screen profile-screen">
      <h1 className="app-logo">えいごクエスト</h1>
      <p className="profile-ask">だれが べんきょうする？</p>
      <div className="profile-grid">
        {profiles.map((p) => (
          <div key={p.id} className="profile-card card card-tap" onClick={() => void pick(p)}>
            <span className="avatar" style={{ background: p.color }}>
              {p.name.slice(0, 1)}
            </span>
            <span className="profile-name">{p.name}</span>
            {/* 到達レベルを主役に。まだ100点がない子は学年を出す（第13回） */}
            {levelOf.get(p.id) ? (
              <span className="level-badge profile-level">Lv {levelOf.get(p.id)}</span>
            ) : (
              <span className="profile-grade">{gradeLabelOf(p.grade)}</span>
            )}
            <button
              className="profile-edit"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(p)
                setName(p.name)
                setGrade(p.grade)
                setConfirmDelete(false)
              }}
            >
              へんこう
            </button>
          </div>
        ))}
        {profiles.length < MAX_PROFILES && (
          <div
            className="profile-card profile-card-add card card-tap"
            onClick={() => {
              setCreating(true)
              setName('')
              setGrade(0)
            }}
          >
            <span className="avatar avatar-add">＋</span>
            <span className="profile-name">あたらしく はじめる</span>
          </div>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)}>
        <h2>あたらしい プロフィール</h2>
        <label className="field-label">なまえ</label>
        <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="なまえを いれてね" />
        <label className="field-label">ねんれい・がくねん</label>
        {gradePicker}
        <div className="row gap">
          <Button onClick={() => void create()} disabled={!name.trim()}>
            はじめる！
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            やめる
          </Button>
        </div>
      </Modal>

      <Modal open={editing != null} onClose={() => setEditing(null)}>
        <h2>プロフィールを へんこう</h2>
        <label className="field-label">なまえ</label>
        <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="field-label">ねんれい・がくねん</label>
        {gradePicker}
        <div className="row gap">
          <Button onClick={() => void saveEdit()}>ほぞん</Button>
          <Button variant="ghost" onClick={() => setEditing(null)}>
            やめる
          </Button>
        </div>
        <hr className="sep" />
        {!confirmDelete ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            このプロフィールを けす…
          </Button>
        ) : (
          <div>
            <p className="danger-text">
              ほんとうに けす？ べんきょうの きろくも なかまも ぜんぶ きえて もとに もどせないよ。
            </p>
            <div className="row gap">
              <Button variant="danger" onClick={() => void doDelete()}>
                ぜんぶ けす
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                やっぱり やめる
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
