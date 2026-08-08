// 判定デバッグ（開発・しきい値調整用）。
// - 文字を選んで書くと、認識ランキング（どの文字に近いか）とコストを表示
// - しきい値（letterPassCost等）を実機で調整して保存できる
// - 保存済み筆記サンプルへの人間ラベル付けとJSONエクスポート
import { useState } from 'react'
import type { InkStroke } from '../core/ink/types'
import { strokesToPts } from '../core/ink/InkCanvas'
import { listRefLetters } from '../core/refdata'
import { classifyLetter, judgeExpectedLetter, type ExpectedLetterJudge } from '../recognition/classify'
import { getEffectiveJudgeConfig, getJudgeOverrides, saveJudgeOverrides } from '../config/judgeRuntime'
import { DEFAULT_JUDGE_CONFIG } from '../config/judgeConfig'
import { LetterPad } from '../learn/LetterPad'
import { useAsyncData } from '../state/hooks'
import { showToast, useAppState } from '../state/store'
import { labelStrokeSample, listStrokeSamples } from '../storage/repo'
import { Button, Card, LoadingView, SectionTitle, TopBar } from '../ui/components'

export function JudgeDebug() {
  const profileId = useAppState((s) => s.profileId)
  const letters = listRefLetters()
  const [letter, setLetter] = useState('a')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<ExpectedLetterJudge | null>(null)
  const [passCost, setPassCost] = useState(() => getJudgeOverrides()?.letterPassCost ?? DEFAULT_JUDGE_CONFIG.letterPassCost)
  const { data: samples, reload } = useAsyncData(() => listStrokeSamples(), [])

  const onJudged = (j: ExpectedLetterJudge, strokes: InkStroke[], boxSize: number) => {
    void strokes
    void boxSize
    setResult(j)
  }

  const reclassify = (strokes: InkStroke[], boxSize: number) => {
    const res = classifyLetter(strokesToPts(strokes), boxSize, getEffectiveJudgeConfig())
    void res
  }
  void reclassify

  const savePassCost = async () => {
    await saveJudgeOverrides({ letterPassCost: passCost })
    showToast(`letterPassCost = ${passCost.toFixed(2)} をほぞんしました`)
  }

  const resetOverrides = async () => {
    await saveJudgeOverrides(null)
    setPassCost(DEFAULT_JUDGE_CONFIG.letterPassCost)
    showToast('しきい値を初期値に戻しました')
  }

  const exportSamples = async () => {
    const all = await listStrokeSamples()
    const blob = new Blob([JSON.stringify(all)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eigo-quest-samples-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  if (!profileId) return <LoadingView />

  return (
    <div className="screen">
      <TopBar title="判定デバッグ" back={{ name: 'settings' }} />
      <div className="map-scroll settings-list">
        <Card>
          <SectionTitle>文字を書いて認識を確認</SectionTitle>
          <div className="debug-letter-row">
            {letters.map((c) => (
              <button
                key={c}
                className={`alpha-cell alpha-cell-sm ${c === letter ? 'chip-practiced' : 'chip-none'}`}
                onClick={() => {
                  setLetter(c)
                  setResult(null)
                  setAttempt((a) => a + 1)
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="split">
            <div className="split-left">
              <p className="tile-sub">「{letter}」を書いてください（判定は現在のきびしさ設定を反映）</p>
              {result && (
                <div className="card debug-result">
                  <p>
                    総合判定: <b>{result.correct ? '正解' : '不正解'}</b>
                    {result.clearlyDifferent && '（明らかに別の文字）'}
                  </p>
                  <p>
                    期待文字コスト: {Number.isFinite(result.expectedCost) ? result.expectedCost.toFixed(3) : '-'}（合格上限{' '}
                    {getEffectiveJudgeConfig().letterPassCost.toFixed(3)}）
                  </p>
                  <p>認識: {result.recognized}</p>
                  <ol className="debug-ranking">
                    {result.ranking.slice(0, 6).map((r) => (
                      <li key={r.letter}>
                        {r.letter}: {r.cost.toFixed(3)}
                        {r.countMatch ? '' : '（画数ちがい）'}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <div className="split-right">
              <LetterPad letter={letter} resetKey={`${letter}-${attempt}`} onJudged={onJudged} />
              <Button size="sm" variant="ghost" onClick={() => setAttempt((a) => a + 1)}>
                書き直す
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>しきい値調整</SectionTitle>
          <label className="volume-row">
            <span className="volume-label">letterPassCost</span>
            <input
              type="range"
              min={20}
              max={80}
              value={Math.round(passCost * 100)}
              onChange={(e) => setPassCost(Number(e.target.value) / 100)}
            />
            <span className="volume-value">{passCost.toFixed(2)}</span>
          </label>
          <p className="tile-sub">大きいほど甘くなります（初期値 {DEFAULT_JUDGE_CONFIG.letterPassCost}）。きびしさ設定の係数はこの上に掛かります。</p>
          <div className="row gap wrap">
            <Button size="sm" onClick={() => void savePassCost()}>
              保存
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void resetOverrides()}>
              初期値に戻す
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle>筆記サンプル（{samples?.length ?? 0}件）</SectionTitle>
          <div className="row gap wrap">
            <Button size="sm" variant="secondary" onClick={() => void exportSamples()}>
              JSONエクスポート
            </Button>
          </div>
          <ul className="sample-list">
            {(samples ?? []).slice(0, 40).map((s) => (
              <li key={s.id} className="sample-item">
                <span className="sample-target">{s.target}</span>
                <span className="tile-sub">
                  → {s.summary.recognized}（{s.summary.verdict} / {s.context}）
                </span>
                <span className="row gap-sm">
                  <button
                    className={`mini-label ${s.humanLabel === 'correct' ? 'mini-label-on' : ''}`}
                    onClick={() => void labelStrokeSample(s.id!, s.humanLabel === 'correct' ? null : 'correct').then(reload)}
                  >
                    ○
                  </button>
                  <button
                    className={`mini-label ${s.humanLabel === 'incorrect' ? 'mini-label-on' : ''}`}
                    onClick={() => void labelStrokeSample(s.id!, s.humanLabel === 'incorrect' ? null : 'incorrect').then(reload)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
