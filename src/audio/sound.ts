// 効果音・BGM（仕様 §19-§24, §35-§37, §46, §50, §55）。
// - public/audio/ に指定の音源ファイル（OtoLogic / DOVA-SYNDROME）を置くとそれを再生する。
//   ファイルが無い場合は Web Audio API 合成音にフォールバック（オフライン・未配置でも鳴る）。
//   ファイル名の対応は README「音源ファイルの配置」を参照。
// - BGM/SE/英語音声の3系統音量（appFlags）と、発音中のBGM audio ducking（仕様 §35）を実装。
import { getAppFlags, setBgmOn, setSeOn } from '../config/appFlags'
import { bumpSound } from '../state/store'

let ctx: AudioContext | null = null
let out: BiquadFilterNode | null = null
let convolver: ConvolverNode | null = null
let reverbIn: GainNode | null = null
/** 合成SE用バス（seVolumeを反映） */
let seBus: GainNode | null = null
/** 合成BGM用バス（bgmVolume×ducking を反映） */
let bgmBus: GainNode | null = null
/**
 * ファイルBGM専用バス（第10回）。iOSはHTMLAudioElementのvolume設定を無視するため、
 * ファイルBGMもWeb Audioに通して音量スライダーとducking（発音中に下げる）を効かせる。
 * mp3はローパスEQ・リバーブを通さず素の音のままdestinationへ。
 */
let fileBgmBus: GainNode | null = null
/** 内蔵発音音声（public/audio/voice/）用バス（第12回）。voiceVolume×増幅を反映 */
let voiceBus: GainNode | null = null
/** 内蔵発音の増幅係数（Web Audioは1超の増幅が可能。TTSより大きく鳴らせる） */
const VOICE_FILE_GAIN = 1.3

function makeImpulse(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 0.9)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
  }
  return buf
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  if (!ctx) {
    ctx = new AudioContext()
    out = ctx.createBiquadFilter()
    out.type = 'lowpass'
    out.frequency.value = 4200
    out.Q.value = 0.4
    out.connect(ctx.destination)
    convolver = ctx.createConvolver()
    convolver.buffer = makeImpulse(ctx)
    reverbIn = ctx.createGain()
    reverbIn.gain.value = 0.32
    reverbIn.connect(convolver)
    convolver.connect(out)
    seBus = ctx.createGain()
    seBus.connect(out)
    seBus.connect(reverbIn)
    bgmBus = ctx.createGain()
    bgmBus.connect(out)
    bgmBus.connect(reverbIn)
    fileBgmBus = ctx.createGain()
    fileBgmBus.connect(ctx.destination)
    voiceBus = ctx.createGain()
    voiceBus.connect(ctx.destination)
    applyVolumesToBuses()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// ---------------- audio ducking（仕様 §35） ----------------
/** 発音中にBGMを下げる倍率（第10回: 0.12→0.05。発音中はほぼ無音にして声を際立たせる） */
const DUCK_RATIO = 0.05
let duckCount = 0

function currentBgmGain(): number {
  const { bgmVolume } = getAppFlags()
  return bgmVolume * (duckCount > 0 ? DUCK_RATIO : 1)
}

function applyVolumesToBuses(rampSec = 0.05) {
  const { seVolume } = getAppFlags()
  if (ctx && seBus) {
    seBus.gain.cancelScheduledValues(ctx.currentTime)
    seBus.gain.setTargetAtTime(seVolume, ctx.currentTime, 0.03)
  }
  if (ctx && bgmBus) {
    bgmBus.gain.cancelScheduledValues(ctx.currentTime)
    bgmBus.gain.setTargetAtTime(currentBgmGain(), ctx.currentTime, Math.max(0.03, rampSec))
  }
  if (ctx && fileBgmBus) {
    fileBgmBus.gain.cancelScheduledValues(ctx.currentTime)
    fileBgmBus.gain.setTargetAtTime(currentBgmGain() * FILE_BGM_GAIN, ctx.currentTime, Math.max(0.03, rampSec))
  }
  if (ctx && voiceBus) {
    voiceBus.gain.cancelScheduledValues(ctx.currentTime)
    voiceBus.gain.setTargetAtTime(getAppFlags().voiceVolume * VOICE_FILE_GAIN, ctx.currentTime, 0.03)
  }
}

/** 内蔵発音の再生先（tts.tsのFileVoiceが使う。第12回） */
export function getVoiceOutput(): { ctx: AudioContext; bus: GainNode } | null {
  const c = ac()
  return c && voiceBus ? { ctx: c, bus: voiceBus } : null
}

/**
 * 英語発音の開始/終了で呼ぶ。BGMをなめらかに下げ、
 * 終了後は0.3〜0.5秒程度かけて元の音量へ戻す（仕様 §35）。
 */
export function duckBgm(on: boolean): void {
  duckCount = Math.max(0, duckCount + (on ? 1 : -1))
  // 下げるときは素早く(0.12s)、戻すときはゆっくり(0.4s)
  applyVolumesToBuses(on ? 0.12 : 0.4)
}

/** 設定画面の音量スライダー変更時に呼ぶ */
export function refreshVolumes(): void {
  applyVolumesToBuses()
}

// ---------------- 音源ファイル（置いてあれば優先） ----------------
// README記載の指定音源（OtoLogic等）をこのファイル名で public/audio/ に配置する
export type SeName =
  | 'correct'
  | 'wrong'
  | 'finish'
  | 'perfect'
  | 'grand'
  | 'coin'
  | 'pop'
  | 'button'
  | 'star'
  | 'starUse'
  | 'levelup'
  | 'gachaStart'
  | 'gachaNew'
  | 'gachaMiss'
  | 'evolve'

const SE_FILES: Record<SeName, string> = {
  correct: 'se-correct.mp3', // OtoLogic「クイズ ピンポン04-1(短)」
  wrong: 'se-wrong.mp3', // やわらかい再挑戦SE
  finish: 'se-finish.mp3', // OtoLogic「GB 汎用 B07-1(クリア1)」
  perfect: 'se-perfect.mp3', // OtoLogic「GB RPG B14-4(勝利・ショート)」
  grand: 'se-grand.mp3', // まとめテスト100点
  coin: 'se-coin.mp3',
  pop: 'se-pop.mp3',
  button: 'se-button.mp3',
  star: 'se-star.mp3',
  starUse: 'se-star-use.mp3',
  levelup: 'se-levelup.mp3',
  gachaStart: 'se-gacha-start.mp3', // OtoLogic「場面展開12-1(長・ディレイ)」
  gachaNew: 'se-gacha-new.mp3', // OtoLogic「マルチアクセント12-1(中)」
  gachaMiss: 'se-gacha-miss.mp3',
  evolve: 'se-evolve.mp3', // OtoLogic「ベルアクセント14-1(高)」
}

// SEファイルはデコード済みバッファをseBus経由で鳴らす（第10回）。
// HTMLAudioElement.volumeはiOSで無視されるため、音量はseBus（Web Audio）で反映する。
const seBuffers = new Map<SeName, AudioBuffer | 'missing' | 'loading'>()

function tryLoadSe(name: SeName): void {
  if (seBuffers.has(name)) return
  seBuffers.set(name, 'loading')
  void (async () => {
    try {
      const res = await fetch(`./audio/${SE_FILES[name]}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.arrayBuffer()
      const c = ac()
      if (!c) throw new Error('no audio context')
      seBuffers.set(name, await c.decodeAudioData(data))
    } catch {
      seBuffers.set(name, 'missing')
    }
  })()
}

function playFileSe(name: SeName): boolean {
  const buf = seBuffers.get(name)
  if (!(buf instanceof AudioBuffer)) return false
  const c = ac()
  if (!c || !seBus) return false
  try {
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(seBus)
    src.start()
    return true
  } catch {
    return false
  }
}

// ---------------- 合成音のプリミティブ ----------------
function bell(
  c: AudioContext,
  at: number,
  freq: number,
  dur: number,
  gain: number,
  opts: { detune?: number; p2?: number; p4?: number; type?: OscillatorType } = {},
  bus?: GainNode | null
) {
  const { detune = 5, p2 = 0.28, p4 = 0.1, type = 'sine' } = opts
  const dest = bus ?? seBus
  if (!dest) return
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  g.connect(dest)
  const mk = (f: number, amt: number, det = 0) => {
    if (amt <= 0) return
    const o = c.createOscillator()
    const og = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(f, at)
    o.detune.setValueAtTime(det, at)
    og.gain.value = amt
    o.connect(og)
    og.connect(g)
    o.start(at)
    o.stop(at + dur + 0.05)
  }
  mk(freq, 0.6, -detune)
  mk(freq, 0.6, detune)
  mk(freq * 2, p2)
  mk(freq * 4, p4)
}

function soft(c: AudioContext, at: number, freq: number, dur: number, gain: number, bus?: GainNode | null) {
  const dest = bus ?? seBus
  if (!dest) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02)
  g.gain.setValueAtTime(gain, at + Math.max(0.02, dur * 0.55))
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g)
  g.connect(dest)
  o.start(at)
  o.stop(at + dur + 0.05)
}

function seEnabled(): boolean {
  return getAppFlags().seOn
}

const N = (semi: number, base = 523.25) => base * Math.pow(2, semi / 12) // C5基準

function seCtx(name: SeName): AudioContext | null {
  if (!seEnabled()) return null
  if (playFileSe(name)) return null // ファイル再生できたら合成しない
  return ac()
}

// ---------------- 効果音 ----------------
/** 正解: ピンポーン（仕様 §19。ファイル: OtoLogic クイズ ピンポン04-1） */
export function playCorrect() {
  const c = seCtx('correct')
  if (!c) return
  const t = c.currentTime
  // ピンポーン（2音チャイム）＋キラン
  bell(c, t, N(12), 0.45, 0.18, { p2: 0.3 })
  bell(c, t + 0.16, N(19), 0.7, 0.2, { p2: 0.34, p4: 0.12 })
}

/** 不正解: 低めの「ポンッ」（まちがいと分かるが、こわくない音。仕様 §20 + 2026-08-08 第6回） */
export function playWrong() {
  const c = seCtx('wrong')
  if (!c || !seBus) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(240, t)
  o.frequency.exponentialRampToValueAtTime(130, t + 0.12)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  o.connect(g)
  g.connect(seBus)
  o.start(t)
  o.stop(t + 0.22)
}

/** なぞり1画OK: 小さなポップ */
export function playStrokePop() {
  const c = seCtx('pop')
  if (!c) return
  bell(c, c.currentTime, N(19), 0.16, 0.06, { p2: 0.2, p4: 0 })
}

/** ボタン・画面遷移 */
export function playButton() {
  const c = seCtx('button')
  if (!c) return
  bell(c, c.currentTime, N(7), 0.12, 0.05, { p2: 0.15, p4: 0 })
}

/** コイン獲得: チャリンチャリン */
export function playCoins() {
  const c = seCtx('coin')
  if (!c) return
  const t = c.currentTime
  const freqs = [1976, 2349, 2093, 2637, 2349, 2794]
  freqs.forEach((f, i) => bell(c, t + i * 0.07, f, 0.14, 0.055, { p2: 0.12, p4: 0, detune: 3 }))
}

/** スター購入: 「スターを手に入れた！」（仕様 §41） */
export function playStar() {
  const c = seCtx('star')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(12), 0.2, 0.12)
  bell(c, t + 0.1, N(16), 0.2, 0.12)
  bell(c, t + 0.2, N(24), 0.7, 0.16, { p2: 0.35, p4: 0.15 })
}

/** スター使用: キャラへ吸い込まれる音（仕様 §42） */
export function playStarUse() {
  const c = seCtx('starUse')
  if (!c) return
  const t = c.currentTime
  const rise = [0, 4, 7, 12, 16, 21, 24]
  rise.forEach((s, i) => bell(c, t + i * 0.05, N(s), 0.18, 0.07, { p2: 0.2, p4: 0 }))
  bell(c, t + 0.42, N(28), 0.5, 0.12, { p2: 0.3 })
}

/** レベルアップ */
export function playLevelUp() {
  const c = seCtx('levelup')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(0), 0.16, 0.13)
  bell(c, t + 0.12, N(4), 0.16, 0.13)
  bell(c, t + 0.24, N(7), 0.16, 0.13)
  bell(c, t + 0.36, N(12), 0.6, 0.17, { p2: 0.3 })
}

/** テスト完了（満点ではない）: 最後までできたことを肯定（仕様 §23。ファイル: GB 汎用 B07-1） */
export function playFinish() {
  const c = seCtx('finish')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(0), 0.4, 0.13)
  bell(c, t + 0.14, N(4), 0.4, 0.13)
  bell(c, t + 0.28, N(7), 0.7, 0.14)
  soft(c, t + 0.28, N(-12), 0.7, 0.05)
}

/** ５もんテスト全問正解: 特別なファンファーレ（仕様 §24。ファイル: GB RPG B14-4） */
export function playPerfect() {
  const c = seCtx('perfect')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(7), 0.14, 0.15)
  bell(c, t + 0.12, N(7), 0.14, 0.15)
  bell(c, t + 0.24, N(7), 0.14, 0.15)
  bell(c, t + 0.38, N(12), 0.8, 0.19, { p2: 0.32 })
  soft(c, t + 0.38, N(-12), 0.8, 0.06)
  bell(c, t + 0.85, N(12), 0.7, 0.13)
  bell(c, t + 0.85, N(16), 0.7, 0.11)
  bell(c, t + 0.85, N(19), 0.7, 0.11)
}

/** まとめテスト100点: いちばん豪華な大ファンファーレ */
export function playGrand() {
  const c = seCtx('grand')
  if (!c) return
  const t = c.currentTime
  const runUp = [0, 4, 7, 12, 16, 19]
  runUp.forEach((s, i) => bell(c, t + i * 0.055, N(s), 0.3, 0.11))
  bell(c, t + 0.4, N(19), 0.13, 0.16)
  bell(c, t + 0.52, N(19), 0.13, 0.16)
  bell(c, t + 0.64, N(19), 0.13, 0.16)
  bell(c, t + 0.78, N(24), 0.9, 0.2, { p2: 0.34, p4: 0.14 })
  soft(c, t + 0.78, N(0) / 2, 0.9, 0.07)
  const chord = [0, 7, 12, 16, 19, 24]
  chord.forEach((s) => bell(c, t + 1.35, N(s), 1.3, 0.1))
  soft(c, t + 1.35, N(-12) / 2, 1.4, 0.07)
  const sparkle = [24, 28, 31, 36, 31, 28]
  sparkle.forEach((s, i) => bell(c, t + 1.5 + i * 0.09, N(s), 0.35, 0.07, { p2: 0.2, p4: 0 }))
}

/** ガチャ開始・進化開始: 期待感（仕様 §46, §50。ファイル: 場面展開12-1） */
export function playGachaStart() {
  const c = seCtx('gachaStart')
  if (!c) return
  const t = c.currentTime
  const seq = [0, 3, 7, 10, 14, 17, 21]
  seq.forEach((s, i) => bell(c, t + i * 0.16, N(s), 0.5, 0.09, { p2: 0.25, detune: 8 }))
  soft(c, t, N(-24), 1.4, 0.06)
}

/** 新しい仲間が出た瞬間（仕様 §46。ファイル: マルチアクセント12-1） */
export function playGachaNew() {
  const c = seCtx('gachaNew')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(12), 0.18, 0.15)
  bell(c, t + 0.09, N(16), 0.18, 0.15)
  bell(c, t + 0.18, N(19), 0.18, 0.15)
  bell(c, t + 0.27, N(24), 0.9, 0.2, { p2: 0.36, p4: 0.16 })
  soft(c, t + 0.27, N(0), 0.9, 0.06)
}

/** ガチャはずれ: 強い失敗音は禁止。やわらかい「またこんどね」（仕様 §46） */
export function playGachaMiss() {
  const c = seCtx('gachaMiss')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(4), 0.3, 0.08, { p2: 0.15, p4: 0 })
  bell(c, t + 0.2, N(0), 0.5, 0.07, { p2: 0.15, p4: 0 })
}

/** 進化完了（仕様 §50。ファイル: ベルアクセント14-1） */
export function playEvolve() {
  const c = seCtx('evolve')
  if (!c) return
  const t = c.currentTime
  bell(c, t, N(24), 0.25, 0.14, { p2: 0.3 })
  bell(c, t + 0.12, N(28), 0.25, 0.14, { p2: 0.3 })
  bell(c, t + 0.24, N(31), 1.0, 0.18, { p2: 0.36, p4: 0.16 })
  const chord = [12, 16, 19, 24]
  chord.forEach((s) => bell(c, t + 0.5, N(s), 1.0, 0.09))
}

// ---------------- BGM ----------------
// ファイルがあれば: bgm-home.mp3（DOVA「ポップン・ダッシュ」）/ bgm-study.mp3（DOVA「おでかけしましょ」）
// 無ければ合成2曲（ホーム=はずむ / 学習=ひかえめ）
export type BgmScene = 'home' | 'practice'

const BGM_FILES: Record<BgmScene, string> = {
  home: 'bgm-home.mp3',
  practice: 'bgm-study.mp3',
}

/** mp3は合成音より音圧が高いので少し絞る補正係数（音量スライダー・duckingはfileBgmBusで効く） */
const FILE_BGM_GAIN = 0.6

interface FileBgm {
  scene: BgmScene
  el: HTMLAudioElement
  node: MediaElementAudioSourceNode
}
let fileBgm: FileBgm | null = null
const bgmFileMissing = new Set<BgmScene>()

interface BgmTrack {
  beat: number
  gain: number
  melody: [number | null, number][]
  bass: [number | null, number][]
}

const HOME_TRACK: BgmTrack = {
  beat: 0.26,
  gain: 0.45,
  melody: [
    [0, 0.5], [4, 0.5], [7, 0.5], [12, 0.5], [16, 0.5], [12, 0.5], [7, 0.5], [4, 0.5],
    [7, 0.5], [11, 0.5], [14, 0.5], [19, 0.5], [14, 0.5], [11, 0.5], [7, 1],
    [9, 0.5], [12, 0.5], [16, 0.5], [21, 0.5], [16, 0.5], [12, 0.5], [9, 1],
    [5, 0.5], [9, 0.5], [12, 0.5], [17, 0.5], [16, 0.5], [14, 0.5], [12, 0.5], [11, 0.5],
    [12, 0.5], [12, 0.5], [14, 0.5], [16, 0.5], [19, 1], [16, 0.5], [12, 0.5],
    [14, 0.5], [14, 0.5], [16, 0.5], [17, 0.5], [16, 1], [12, 0.5], [11, 0.5],
    [12, 1.5], [7, 0.5], [9, 1], [11, 1],
    [12, 2], [null, 1],
  ],
  bass: [
    [0, 2], [0, 2], [7, 2], [7, 2], [9, 2], [9, 2], [5, 2], [5, 2],
    [0, 2], [0, 2], [7, 2], [7, 2], [9, 2], [5, 2], [0, 2], [7, 2], [0, 1],
  ],
}

const PRACTICE_TRACK: BgmTrack = {
  beat: 0.34,
  gain: 0.35,
  melody: [
    [0, 1], [4, 0.5], [7, 0.5], [9, 1], [7, 0.5], [4, 0.5],
    [2, 1], [4, 0.5], [7, 0.5], [4, 2],
    [0, 1], [4, 0.5], [7, 0.5], [12, 1], [9, 0.5], [7, 0.5],
    [9, 1], [7, 0.5], [4, 0.5], [7, 2],
    [12, 1], [9, 0.5], [7, 0.5], [4, 1], [7, 0.5], [9, 0.5],
    [7, 1], [4, 0.5], [2, 0.5], [0, 2], [null, 1],
  ],
  bass: [
    [0, 2], [7, 2], [9, 2], [4, 2], [0, 2], [7, 2], [5, 2], [7, 2], [0, 3],
  ],
}

const TRACKS: Record<BgmScene, BgmTrack> = { home: HOME_TRACK, practice: PRACTICE_TRACK }

let currentScene: BgmScene = 'home'
let playingScene: BgmScene | null = null
let bgmTimer: number | null = null
let melIdx = 0
let melTime = 0
let bassIdx = 0
let bassTime = 0

function scheduleBgm() {
  const c = ac()
  if (!c || playingScene == null) return
  const track = TRACKS[playingScene]
  const horizon = c.currentTime + 0.45
  while (melTime < horizon) {
    const [semi, beats] = track.melody[melIdx % track.melody.length]
    const dur = beats * track.beat
    if (semi != null) {
      bell(c, melTime, N(semi), Math.max(dur * 1.6, 0.3), track.gain, { p2: 0.25, p4: 0.08, detune: 4 }, bgmBus)
    }
    melTime += dur
    melIdx++
  }
  while (bassTime < horizon) {
    const [semi, beats] = track.bass[bassIdx % track.bass.length]
    const dur = beats * track.beat
    if (semi != null) {
      soft(c, bassTime, N(semi, 130.81), dur * 0.92, track.gain * 0.5, bgmBus)
    }
    bassTime += dur
    bassIdx++
  }
}

function startSynthBgm() {
  const c = ac()
  if (!c) return
  playingScene = currentScene
  melIdx = 0
  bassIdx = 0
  melTime = c.currentTime + 0.08
  bassTime = c.currentTime + 0.08
  scheduleBgm()
  bgmTimer = window.setInterval(scheduleBgm, 140)
}

function stopFileBgm() {
  if (fileBgm) {
    fileBgm.el.pause()
    try {
      fileBgm.node.disconnect()
    } catch {
      // すでに切断済みなら無視
    }
    fileBgm = null
  }
}

function tryStartFileBgm(scene: BgmScene): boolean {
  if (bgmFileMissing.has(scene)) return false
  const c = ac()
  if (!c || !fileBgmBus) return false
  const el = new Audio(`./audio/${BGM_FILES[scene]}`)
  el.loop = true
  // iOSはel.volumeを無視する。音量はWeb Audio（fileBgmBus）側で制御するため常に1（第10回）
  el.volume = 1
  let node: MediaElementAudioSourceNode
  try {
    node = c.createMediaElementSource(el)
    node.connect(fileBgmBus)
  } catch {
    // MediaElementSourceが作れない環境では合成BGMへ
    bgmFileMissing.add(scene)
    return false
  }
  el.addEventListener('error', () => {
    bgmFileMissing.add(scene)
    if (fileBgm?.el === el) {
      stopFileBgm()
      if (getAppFlags().bgmOn) startSynthBgm()
    }
  })
  const p = el.play()
  if (p) p.catch(() => undefined)
  fileBgm = { scene, el, node }
  playingScene = scene
  return true
}

export function startBgm() {
  const c = ac()
  if (!c) return
  if (playingScene === currentScene && (bgmTimer != null || fileBgm != null)) return
  stopBgm()
  if (!tryStartFileBgm(currentScene)) startSynthBgm()
}

export function stopBgm() {
  if (bgmTimer != null) {
    window.clearInterval(bgmTimer)
    bgmTimer = null
  }
  stopFileBgm()
  playingScene = null
}

function syncBgm() {
  if (getAppFlags().bgmOn) startBgm()
  else stopBgm()
}

/** 画面の種類に応じてBGMを切り替える（App.tsxから呼ぶ） */
export function setBgmScene(scene: BgmScene) {
  if (currentScene === scene) {
    if (getAppFlags().bgmOn && bgmTimer == null && fileBgm == null) syncBgm()
    return
  }
  currentScene = scene
  if (getAppFlags().bgmOn) startBgm()
}

// ---------------- 切り替え ----------------
export async function toggleAllSound(): Promise<void> {
  const { seOn, bgmOn } = getAppFlags()
  const anyOn = seOn || bgmOn
  await setSeOn(!anyOn)
  await setBgmOn(!anyOn)
  syncBgm()
  bumpSound()
}

export async function setSe(on: boolean): Promise<void> {
  await setSeOn(on)
  bumpSound()
}

export async function setBgm(on: boolean): Promise<void> {
  await setBgmOn(on)
  syncBgm()
  bumpSound()
}

/** 最初のユーザー操作でAudioContextを起こし、BGM設定に従って再生を始める */
export function initSoundOnGesture() {
  // 音源ファイルの存在チェックを開始（あれば以後ファイルを再生）
  ;(Object.keys(SE_FILES) as SeName[]).forEach(tryLoadSe)
  const handler = () => {
    ac()
    syncBgm()
  }
  window.addEventListener('pointerdown', handler, { passive: true })
}
