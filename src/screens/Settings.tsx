// 設定: 文字の判定・音量3系統・バックアップ・診断・デバッグ・入力設定・音源クレジット。
import { useRef, useState } from 'react'
import { getAppFlags, setAllowTouchInk, setVolume } from '../config/appFlags'
import { DEFAULT_STRICTNESS, STRICTNESS_LABELS } from '../config/judgeConfig'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { refreshVolumes, setBgm, setSe } from '../audio/sound'
import { currentVoiceName, speakWord, speechAvailable } from '../audio/tts'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import { downloadBackup, importAllData } from '../storage/backup'
import { getProfile, saveProfile } from '../storage/repo'
import { Button, Card, LoadingView, Modal, TopBar } from '../ui/components'

function VolumeSlider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <label className="volume-row">
      <span className="volume-label">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
      <span className="volume-value">{Math.round(value * 100)}%</span>
      {hint && <small className="volume-hint">{hint}</small>}
    </label>
  )
}

export function Settings() {
  const profileId = useAppState((s) => s.profileId)
  useAppState((s) => s.soundVersion)
  const { data: profile, reload } = useAsyncData(async () => (profileId ? ((await getProfile(profileId)) ?? null) : null), [profileId])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [, setVolTick] = useState(0)
  const flags = getAppFlags()

  if (!profile) return <LoadingView />

  const strictness = profile.judgeStrictness ?? DEFAULT_STRICTNESS

  const changeStrictness = async (level: number) => {
    profile.judgeStrictness = level
    await saveProfile(profile)
    setStrictnessRuntime(level)
    bumpData()
    reload()
    showToast(`文字の判定を「${STRICTNESS_LABELS[level - 1]}」に かえたよ`)
  }

  const changeVolume = (kind: 'bgm' | 'se' | 'voice', v: number) => {
    void setVolume(kind, v).then(() => {
      refreshVolumes()
      setVolTick((t) => t + 1)
    })
  }

  const onFile = async (f: File | null) => {
    if (!f) return
    const text = await f.text()
    setPendingImport(text)
  }

  const doImport = async () => {
    if (!pendingImport) return
    setBusy(true)
    try {
      const summary = await importAllData(pendingImport)
      showToast(`よみこみ完了（${summary.records}けん）。さいよみこみします…`)
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'よみこみに しっぱいしました')
      setBusy(false)
      setPendingImport(null)
    }
  }

  return (
    <div className="screen">
      <TopBar title="せってい" back={{ name: 'home' }} />
      <div className="map-scroll settings-list">
        <Card>
          <h3>プロフィール</h3>
          <p className="tile-sub">いま つかっているのは「{profile.name}」</p>
          <Button variant="secondary" onClick={() => navigate({ name: 'profiles' })}>
            プロフィールを きりかえる
          </Button>
        </Card>

        <Card>
          <h3>文字の判定（{profile.name}用）</h3>
          <p className="tile-sub">
            「やさしい」は、きれいさよりも <b>読めること</b> を大切にします（はじめは やさしい が おすすめ）。
            きびしすぎる／あますぎると感じたら、ここで調整してください。
          </p>
          <div className="grade-picker">
            {STRICTNESS_LABELS.map((label, i) => (
              <button
                key={label}
                className={`grade-btn ${strictness === i + 1 ? 'grade-btn-on' : ''}`}
                onClick={() => void changeStrictness(i + 1)}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3>音</h3>
          <label className="check-row">
            <input type="checkbox" checked={flags.seOn} onChange={(e) => void setSe(e.target.checked)} />
            <span>こうかおん（ピンポン・ファンファーレ）</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={flags.bgmOn} onChange={(e) => void setBgm(e.target.checked)} />
            <span>BGM</span>
          </label>
          <div className="volume-list">
            <VolumeSlider label="BGM" value={flags.bgmVolume} onChange={(v) => changeVolume('bgm', v)} hint="小さめがおすすめ（発音のじゃまをしません）" />
            <VolumeSlider label="こうかおん" value={flags.seVolume} onChange={(v) => changeVolume('se', v)} />
            <VolumeSlider label="えいごの声" value={flags.voiceVolume} onChange={(v) => changeVolume('voice', v)} />
          </div>
          <div className="row gap wrap">
            <Button size="sm" variant="secondary" onClick={() => void speakWord('apple')}>
              えいごの声を ためす（apple）
            </Button>
          </div>
          <p className="tile-sub">
            えいごの声はアプリ内では最大にしてあります。もっと大きくしたいときは<b>iPad本体の音量ボタン</b>で上げてください
            （本体のよこの消音スイッチがオンだと声が鳴りません）。
          </p>
          <p className="tile-sub">
            {speechAvailable()
              ? `えいごの声: ${currentVoiceName() ?? 'この端末の英語音声（じゅんびちゅう）'}`
              : 'この端末では えいごの音声が つかえません（iPadのSafariでは つかえます）'}
          </p>
        </Card>

        <Card>
          <h3>バックアップ</h3>
          <p className="tile-sub">
            データはこのiPadの中だけに保存されています。故障やSafariのデータ削除に備えて、ときどき書き出してください（全プロフィール分をまとめて書き出します）。
          </p>
          <div className="row gap wrap">
            <Button onClick={() => void downloadBackup()}>バックアップを書き出す</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              バックアップを読み込む
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                void onFile(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </div>
        </Card>

        <Card>
          <h3>開発・調整</h3>
          <div className="row gap wrap">
            <Button variant="secondary" onClick={() => navigate({ name: 'pencilDiag' })}>
              Apple Pencil診断
            </Button>
            <Button variant="secondary" onClick={() => navigate({ name: 'judgeDebug' })}>
              判定デバッグ
            </Button>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={flags.allowTouchInk}
              onChange={(e) => void setAllowTouchInk(e.target.checked)}
            />
            <span>
              指でも書けるようにする（検証用）
              <br />
              <small>通常はオフ。オフのとき、指や手のひらは線になりません（Apple Pencil専用）。</small>
            </span>
          </label>
        </Card>

        <Card>
          <h3>つかっている音の素材（CREDITS）</h3>
          <p className="tile-sub">
            効果音・BGMの音源ファイルを public/audio/ に配置した場合、以下の素材を使用します（仕様 §56）:
          </p>
          <ul className="credits-list">
            <li>
              効果音: OtoLogic（
              <a href="https://otologic.jp" target="_blank" rel="noreferrer">
                otologic.jp
              </a>
              ）CC BY 4.0 — クイズ ピンポン04-1 / GB 汎用 B07-1 / GB RPG B14-4 / 場面展開12-1 / マルチアクセント12-1 / ベルアクセント14-1 ほか
            </li>
            <li>
              BGM: DOVA-SYNDROME（
              <a href="https://dova-s.jp" target="_blank" rel="noreferrer">
                dova-s.jp
              </a>
              ）— 「ポップン・ダッシュ」「おでかけしましょ」
            </li>
            <li>音源ファイル未配置のときは、アプリ内蔵の合成音（Web Audio API）で鳴ります。</li>
          </ul>
        </Card>
      </div>

      <Modal open={pendingImport != null} onClose={() => !busy && setPendingImport(null)}>
        <h2>バックアップを読み込む</h2>
        <p className="danger-text">
          いまの ぜんいんの データを、ファイルの内容で <b>すべて置き換えます</b>。この操作は元に戻せません。
        </p>
        <div className="row gap">
          <Button variant="danger" onClick={() => void doImport()} disabled={busy}>
            {busy ? 'よみこみちゅう…' : '置き換えて読み込む'}
          </Button>
          <Button variant="ghost" onClick={() => setPendingImport(null)} disabled={busy}>
            やめる
          </Button>
        </div>
      </Modal>
    </div>
  )
}
