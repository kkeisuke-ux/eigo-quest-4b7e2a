// 設定: 文字の判定・音量3系統・バックアップ・診断・デバッグ・入力設定・音源クレジット。
import { useEffect, useRef, useState } from 'react'
import { getAppFlags, setAllowTouchInk, setVoiceUri, setVolume } from '../config/appFlags'
import { DEFAULT_STRICTNESS, STRICTNESS_LABELS } from '../config/judgeConfig'
import { setStrictnessRuntime } from '../config/judgeRuntime'
import { refreshVolumes, setBgm, setSe } from '../audio/sound'
import { currentVoiceName, listEnglishVoices, refreshVoiceChoice, speakWord, speechAvailable } from '../audio/tts'
import { useAsyncData } from '../state/hooks'
import { bumpData, navigate, showToast, useAppState } from '../state/store'
import {
  canShareBackup,
  downloadBackup,
  downloadProfileBackup,
  importAllData,
  importProfileData,
  inspectBackup,
  shareBackup,
  shareProfileBackup,
  type BackupInfo,
} from '../storage/backup'
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
  const [pendingImport, setPendingImport] = useState<{ text: string; info: BackupInfo; sameProfileExists: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [, setVolTick] = useState(0)
  const flags = getAppFlags()

  // 音声リストが遅れて届いたら選択肢を更新（iOS対策。第11回）
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const onChanged = () => setVolTick((t) => t + 1)
    speechSynthesis.addEventListener('voiceschanged', onChanged)
    return () => speechSynthesis.removeEventListener('voiceschanged', onChanged)
  }, [])

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
    try {
      const info = inspectBackup(text)
      const sameProfileExists =
        info.scope === 'profile' && info.profileId != null ? (await getProfile(info.profileId)) != null : false
      setPendingImport({ text, info, sameProfileExists })
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ファイルを読み取れません')
    }
  }

  const doImport = async () => {
    if (!pendingImport) return
    setBusy(true)
    try {
      if (pendingImport.info.scope === 'profile') {
        const summary = await importProfileData(pendingImport.text)
        showToast(`「${summary.profileName}」のデータを よみこみました（${summary.records}けん）。さいよみこみします…`)
      } else {
        const summary = await importAllData(pendingImport.text)
        showToast(`よみこみ完了（${summary.records}けん）。さいよみこみします…`)
      }
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
          <p className="tile-sub">
            🔊 たんご・アルファベット・れいぶんは、<b>アプリに内蔵したクリアな女性の声</b>（アメリカ英語）で発音します。
            この端末の読み上げ機能の音質には左右されません。
          </p>
          {speechAvailable() && (
            <div className="voice-pick-row">
              <label className="field-label">よみあげの声を えらぶ（えにっきの読み上げなど、内蔵音声がない文にだけ使われます）</label>
              <select
                className="voice-select"
                value={flags.voiceUri ?? ''}
                onChange={(e) => {
                  const uri = e.target.value || null
                  void setVoiceUri(uri).then(() => {
                    refreshVoiceChoice()
                    setVolTick((t) => t + 1)
                    void speakWord('apple')
                  })
                }}
              >
                <option value="">じどうで えらぶ（おすすめ）</option>
                {listEnglishVoices().map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="tile-sub">かえると ためしに 1回 はつおんします。「※へんな声」は ジョーク用の声です</p>
            </div>
          )}
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
            {canShareBackup() && (
              <Button
                onClick={() =>
                  void shareBackup().then((ok) => {
                    if (!ok) showToast('この端末では共有できません。「書き出す」を使ってください')
                  })
                }
              >
                AirDropで おくる（全員分）
              </Button>
            )}
            <Button variant={canShareBackup() ? 'secondary' : undefined} onClick={() => void downloadBackup()}>
              バックアップを書き出す
            </Button>
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
          <p className="tile-sub" style={{ marginTop: 12 }}>
            <b>ひとりだけ移すには:</b> 下のボタンで「{profile.name}」のデータだけを送れます。読み込んだ端末では{' '}
            <b>{profile.name}のデータだけが追加・上書き</b>され、ほかの人のデータはそのまま残ります（読み込みは上の「バックアップを読み込む」でOK。ファイルの種類は自動で見分けます）。
            べつの人を送りたいときは、その人のプロフィールに切り替えてから押してください。
          </p>
          <div className="row gap wrap">
            {canShareBackup() && (
              <Button
                variant="secondary"
                onClick={() =>
                  void shareProfileBackup(profile.id).then((ok) => {
                    if (!ok) showToast('この端末では共有できません。「書き出す」を使ってください')
                  })
                }
              >
                「{profile.name}」だけ AirDropで おくる
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() =>
                void downloadProfileBackup(profile.id).then((ok) => {
                  if (!ok) showToast('プロフィールが みつかりませんでした')
                })
              }
            >
              「{profile.name}」だけ ファイルに書き出す
            </Button>
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
          <h3>このアプリの りようじょうけん</h3>
          <p className="tile-sub">
            作者: 香村 恵介。コード・キャラクター・イラスト・単語や例文は{' '}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja" target="_blank" rel="noreferrer">
              CC BY-NC-SA 4.0
            </a>
            （出典を示せば自由に使ってよい／<b>販売など営利目的での利用は不可</b>／改変版も同じ条件で公開）。
            下記の第三者素材は元の提供条件のままです。学習の補助を目的とした個人制作物のため、
            判定精度や提供の継続は保証しません。
          </p>
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
            <li>
              発音の音声: Piper TTS（MIT）＋ 音声モデル en_US-amy-medium（
              <a href="https://huggingface.co/rhasspy/piper-voices" target="_blank" rel="noreferrer">
                rhasspy/piper-voices
              </a>
              、Mimic 3 voices 由来）でローカル合成
            </li>
            <li>音源ファイル未配置のときは、アプリ内蔵の合成音（Web Audio API）で鳴ります。</li>
          </ul>
        </Card>
      </div>

      <Modal open={pendingImport != null} onClose={() => !busy && setPendingImport(null)}>
        {pendingImport?.info.scope === 'profile' ? (
          <>
            <h2>「{pendingImport.info.profileName}」のデータを読み込む</h2>
            <p>
              ひとりぶんのバックアップです。<b>「{pendingImport.info.profileName}」のデータだけ</b>を この端末に入れます。ほかの人のデータは かわりません。
            </p>
            {pendingImport.sameProfileExists && (
              <p className="danger-text">
                この端末にも「{pendingImport.info.profileName}」がいます。その人のいまのデータは、ファイルの内容で <b>置き換わります</b>（元に戻せません）。
              </p>
            )}
            <div className="row gap">
              <Button
                variant={pendingImport.sameProfileExists ? 'danger' : 'accent'}
                onClick={() => void doImport()}
                disabled={busy}
              >
                {busy ? 'よみこみちゅう…' : pendingImport.sameProfileExists ? '置き換えて読み込む' : 'この人を追加する'}
              </Button>
              <Button variant="ghost" onClick={() => setPendingImport(null)} disabled={busy}>
                やめる
              </Button>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </Modal>
    </div>
  )
}
