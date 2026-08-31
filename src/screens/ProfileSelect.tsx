// プロフィール選択（起動画面）。最大5人、データは完全分離（仕様 §52）。
import { useState } from 'react'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { perfectStageIds, perfectTermTestIds, stageClearLevelLabel } from '../data/words'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, selectProfile } from '../state/store'
import {
  MAX_PROFILES,
  alphabetMasteryCounts,
  backfillStudyDays,
  createProfile,
  deleteProfileDeep,
  getProfile,
  isTutorialDone,
  listProfiles,
  listStudyDays,
  listTestResults,
  saveProfile,
} from '../storage/repo'
import type { Profile } from '../storage/models'
import { Button, LoadingView, Modal } from '../ui/components'
import { rankCountFor } from '../game/ranks'
import { RankChip } from '../ui/RankBadge'
import { StudyStreakChip } from '../ui/StudyCalendar'

export function ProfileSelect() {
  // 各プロフィールの到達レベル（まとめテスト100点の最高。第13回）も一緒に読む
  const { data } = useAsyncData(async () => {
    const list = await listProfiles()
    return Promise.all(
      list.map(async (p) => {
        await backfillStudyDays(p.id)
        const [results, alpha, studyDays] = await Promise.all([
          listTestResults(p.id),
          alphabetMasteryCounts(p.id),
          listStudyDays(p.id),
        ])
        return {
          profile: p,
          perfectCount: rankCountFor(perfectTermTestIds(results).size, alpha.upper, alpha.lower),
          levelLabel: stageClearLevelLabel(perfectStageIds(results)),
          studyDays,
        }
      })
    )
  }, [])
  const profiles = data?.map((d) => d.profile) ?? null
  const rankCountOf = new Map((data ?? []).map((d) => [d.profile.id, d.perfectCount]))
  const levelOf = new Map((data ?? []).map((d) => [d.profile.id, d.levelLabel]))
  const studyOf = new Map((data ?? []).map((d) => [d.profile.id, d.studyDays]))
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!profiles) return <LoadingView />

  const pick = async (p: Profile) => {
    // 一覧を開いたあとにコイン等が増えていることがあるため、必ず読み直してから保存する。
    // 一覧取得時のオブジェクトをそのまま書き戻すと、その間の増減を巻き戻してしまう（第30回）
    const fresh = (await getProfile(p.id)) ?? p
    fresh.lastActiveAt = Date.now()
    await saveProfile(fresh)
    setStrictnessRuntime(fresh.judgeStrictness)
    selectProfile(p.id)
    // はじめての人には、ホームより先にチュートリアルを見せる（第31回）
    navigate({ name: (await isTutorialDone(p.id)) ? 'home' : 'tutorial' })
  }

  const create = async () => {
    const n = name.trim()
    if (!n) return
    // 年齢・学年の選択は第22回で廃止（かんじクエスト第41回と同方針。内部値は0固定）
    const p = await createProfile(n, 0)
    setCreating(false)
    setName('')
    bumpData()
    selectProfile(p.id)
    navigate({ name: 'tutorial' })
  }

  const saveEdit = async () => {
    if (!editing) return
    editing.name = name.trim() || editing.name
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
            {/* 称号バッジ（第22回。第24回でLvバッジは称号に一本化） */}
            <RankChip perfectCount={rankCountOf.get(p.id) ?? 0} />
            {/* 到達レベル（テスト100点が ぜんぶ そろっている ところまで。第25回） */}
            {levelOf.get(p.id) && <span className="badge profile-level level-chip">Lv {levelOf.get(p.id)}</span>}
            {/* べんきょうの続きぐあい（第30回）。だれが続いているか 選ぶ前に分かる */}
            <StudyStreakChip records={studyOf.get(p.id) ?? []} />
            <button
              className="profile-edit"
              onClick={(e) => {
                e.stopPropagation()
                setEditing(p)
                setName(p.name)
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
