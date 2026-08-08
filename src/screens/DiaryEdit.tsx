// えいご絵日記の編集画面（仕様 §29-§33 + 2026-08-08 第5回フィードバック）。
// - 上: 自由な絵（ペン・ふでブラシ・けしゴム・8色・太さ2種）
// - 下: 英文の手書きエリア（3行の英語罫線・けしゴムで部分修正できる）
// - 「かいた字をよみとる」→ 本人が確認・修正 → 「えいぶんをチェック」でルールベース添削
// - 「れいぶんを さがす」: 言いたいことを日本語で入力（音声入力対応）→ 例文を提案。
//   外部AIは使わない（追加料金なし・オフライン動作。README参照）
import { useEffect, useMemo, useRef, useState } from 'react'
import { GAME_CONFIG } from '../config/gameConfig'
import { getAppFlags } from '../config/appFlags'
import { InkCanvas, strokesToPts, type InkCanvasHandle } from '../core/ink/InkCanvas'
import { checkDiaryText } from '../diary/correction'
import { printDiary } from '../diary/pdf'
import { recognizeTextLines } from '../diary/textRecognition'
import { fromStored, toStored } from '../diary/strokeStore'
import { searchSentences, type SentenceItem } from '../data/sentences'
import { awardStudy } from '../game/logic'
import { playCorrect } from '../audio/sound'
import { useProfile } from '../state/hooks'
import { bumpData, navigate, showToast } from '../state/store'
import { addActivity, getDiaryEntry, saveDiaryEntry } from '../storage/repo'
import type { DiaryEntryRecord } from '../storage/models'
import { Button, Card, LoadingView, TopBar } from '../ui/components'
import { TextRuleLines } from '../ui/LetterSvg'
import { SpeakButton } from '../ui/SpeakButton'
import { queueEvolutionFromEvents } from '../ui/EvolutionModal'

const PEN_COLORS = ['#233047', '#e0645f', '#e79a2e', '#f2c33c', '#3f9d63', '#4a67d8', '#8a5bd6', '#b57a38']
const DRAW_ASPECT = 0.58
const TEXT_ROWS = 3
const TEXT_ASPECT = 0.42

type DrawTool = 'pen' | 'brush' | 'eraser'

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null
}

function formatDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`)
  const youbi = ['にち', 'げつ', 'か', 'すい', 'もく', 'きん', 'ど'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${youbi}）`
}

export function DiaryEdit({ dateKey }: { dateKey: string }) {
  const profile = useProfile()
  const drawRef = useMemo<{ current: InkCanvasHandle | null }>(() => ({ current: null }), [])
  const textRef = useMemo<{ current: InkCanvasHandle | null }>(() => ({ current: null }), [])
  const [loaded, setLoaded] = useState(false)
  const [existing, setExisting] = useState<DiaryEntryRecord | null>(null)
  const [tool, setTool] = useState<DrawTool>('pen')
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penWidth, setPenWidth] = useState(5)
  const [textEraser, setTextEraser] = useState(false)
  const [text, setText] = useState('')
  const [recognizing, setRecognizing] = useState(false)
  const [checked, setChecked] = useState<{ corrected: string | null; notes: string[] } | null>(null)
  const [includeCorrection, setIncludeCorrection] = useState(true)
  const [helperQuery, setHelperQuery] = useState('')
  const [helperResults, setHelperResults] = useState<SentenceItem[] | null>(null)
  const [listening, setListening] = useState(false)
  const recognizerRef = useRef<SpeechRecognitionLike | null>(null)
  const restoreRef = useRef(false)
  const speechAvailable = getSpeechRecognition() != null

  // 既存エントリのロードとストローク復元
  useEffect(() => {
    if (!profile) return
    let alive = true
    void (async () => {
      const entry = await getDiaryEntry(profile.id, dateKey)
      if (!alive) return
      setExisting(entry ?? null)
      if (entry) {
        setText(entry.originalText)
        if (entry.correctedText != null) setChecked({ corrected: entry.correctedText, notes: entry.correctionNotes })
        restoreRef.current = true
      }
      setLoaded(true)
    })()
    return () => {
      alive = false
    }
  }, [profile?.id, dateKey])

  useEffect(() => {
    if (!loaded || !existing || !restoreRef.current) return
    const timer = window.setTimeout(() => {
      restoreRef.current = false
      const draw = drawRef.current
      if (draw && existing.drawing.length > 0) {
        const scale = existing.drawingSize > 0 ? draw.getSize() / existing.drawingSize : 1
        draw.setStrokes(existing.drawing.map((s, i) => fromStored(s, i + 1, scale)))
      }
      const txt = textRef.current
      if (txt && existing.textStrokes.length > 0) {
        const scale = existing.textBoxWidth > 0 ? txt.getSize() / existing.textBoxWidth : 1
        txt.setStrokes(existing.textStrokes.map((s, i) => fromStored(s, i + 1, scale)))
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [loaded, existing])

  useEffect(() => () => recognizerRef.current?.stop(), [])

  if (!profile || !loaded) return <LoadingView />

  const recognize = () => {
    const ink = textRef.current
    if (!ink) return
    const strokes = ink.getStrokes().filter((s) => (s.tool ?? 'pen') !== 'eraser')
    if (strokes.length === 0) {
      showToast('まず 下のらんに えいごを かいてみよう')
      return
    }
    setRecognizing(true)
    window.setTimeout(() => {
      const res = recognizeTextLines(strokesToPts(strokes), ink.getSize() * TEXT_ASPECT, TEXT_ROWS)
      setText(res.text)
      setRecognizing(false)
      showToast('よみとったよ！ ちがうところは 下のらんで なおしてね')
    }, 30)
  }

  const runCheck = () => {
    if (!text.trim()) {
      showToast('えいぶんが まだ ないよ。「よみとる」か、じぶんで うちこんでね')
      return
    }
    const res = checkDiaryText(text)
    setChecked(res.corrected != null ? res : { corrected: null, notes: [] })
    if (res.corrected == null) {
      playCorrect()
      showToast('なおすところは なさそう！ すばらしい！')
    }
  }

  const searchHelper = (q?: string) => {
    const query = (q ?? helperQuery).trim()
    if (!query) return
    setHelperResults(searchSentences(query))
  }

  const startListening = () => {
    const SR = getSpeechRecognition()
    if (!SR) return
    try {
      const rec = new SR()
      recognizerRef.current = rec
      rec.lang = 'ja-JP'
      rec.interimResults = false
      rec.onresult = (ev) => {
        const transcript = ev.results[0]?.[0]?.transcript ?? ''
        if (transcript) {
          setHelperQuery(transcript)
          setHelperResults(searchSentences(transcript))
        }
      }
      rec.onend = () => setListening(false)
      rec.onerror = () => setListening(false)
      setListening(true)
      rec.start()
    } catch {
      setListening(false)
      showToast('おんせいにゅうりょくが つかえませんでした。文字で いれてね')
    }
  }

  const buildRecord = (): DiaryEntryRecord => {
    const draw = drawRef.current
    const txt = textRef.current
    return {
      profileId: profile.id,
      dateKey,
      drawing: (draw?.getStrokes() ?? []).map((s) => toStored(s, 96)),
      drawingSize: draw?.getSize() ?? 0,
      originalText: text.trim(),
      textStrokes: (txt?.getStrokes() ?? []).map((s) => toStored(s, 64)),
      textBoxWidth: txt?.getSize() ?? 0,
      correctedText: checked?.corrected ?? existing?.correctedText ?? null,
      correctionNotes: checked?.corrected != null ? checked.notes : (existing?.correctionNotes ?? []),
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
  }

  const save = async () => {
    const rec = buildRecord()
    if (rec.drawing.length === 0 && !rec.originalText && rec.textStrokes.length === 0) {
      showToast('えか えいごを かいてから ほぞんしてね')
      return
    }
    await saveDiaryEntry(rec)
    setExisting(rec)
    if (!existing) {
      const reward = await awardStudy(profile.id, GAME_CONFIG.coins.diarySave, GAME_CONFIG.exp.diary, 'えいご絵日記')
      queueEvolutionFromEvents(reward.expEvents)
      await addActivity(profile.id, profile.name, 'diary', `${profile.name}が えいご絵日記を かきました`)
      showToast(`ほぞんしたよ！ +${GAME_CONFIG.coins.diarySave}コイン`)
    } else {
      showToast('ほぞんしたよ！')
    }
    bumpData()
  }

  const exportPdf = async () => {
    const rec = buildRecord()
    await saveDiaryEntry(rec)
    setExisting(rec)
    bumpData()
    const ok = printDiary(rec, { includeCorrection, profileName: profile.name })
    if (!ok) showToast('ポップアップが ひらけませんでした。Safariの せっていを かくにんしてね')
  }

  return (
    <div className="screen">
      <TopBar title={`えいご絵日記　${formatDate(dateKey)}`} back={{ name: 'diary' }} />
      <div className="scroll-body diary-body">
        <Card className="diary-draw-card">
          <div className="diary-toolbar">
            <button className={`tool-btn ${tool === 'pen' ? 'tool-btn-active' : ''}`} onClick={() => setTool('pen')}>
              ✏️ ペン
            </button>
            <button className={`tool-btn ${tool === 'brush' ? 'tool-btn-active' : ''}`} onClick={() => setTool('brush')}>
              🖌️ ふで
            </button>
            <button className={`tool-btn ${tool === 'eraser' ? 'tool-btn-active' : ''}`} onClick={() => setTool('eraser')}>
              🧽 けしゴム
            </button>
            <span className="diary-tool-sep" />
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                className={`pen-swatch ${penColor === c && tool !== 'eraser' ? 'pen-swatch-active' : ''}`}
                style={{ background: c }}
                onClick={() => {
                  setPenColor(c)
                  if (tool === 'eraser') setTool('pen')
                }}
                aria-label={`ペンのいろ ${c}`}
              />
            ))}
            <span className="diary-tool-sep" />
            <button className={`pen-size ${penWidth === 5 ? 'pen-swatch-active' : ''}`} onClick={() => setPenWidth(5)}>
              ほそい
            </button>
            <button className={`pen-size pen-size-thick ${penWidth === 10 ? 'pen-swatch-active' : ''}`} onClick={() => setPenWidth(10)}>
              ふとい
            </button>
            <span className="diary-tool-sep" />
            <Button size="sm" variant="ghost" onClick={() => drawRef.current?.undo()}>
              もどす
            </Button>
            <Button size="sm" variant="ghost" onClick={() => drawRef.current?.clear()}>
              ぜんぶけす
            </Button>
          </div>
          <InkCanvas
            inkRef={drawRef}
            aspectRatio={DRAW_ASPECT}
            penColor={penColor}
            baseWidth={penWidth}
            penTool={tool}
            allowTouchInk={getAppFlags().allowTouchInk}
            className="diary-canvas"
          />
        </Card>

        <Card className="diary-text-card">
          <div className="diary-toolbar">
            <span className="diary-tool-label">きょうの えいご（1〜3文・すきに かこう）</span>
            <button
              className={`tool-btn ${textEraser ? 'tool-btn-active' : ''}`}
              onClick={() => setTextEraser(!textEraser)}
            >
              🧽 けしゴム{textEraser ? 'ちゅう' : ''}
            </button>
            <Button size="sm" variant="ghost" onClick={() => textRef.current?.undo()}>
              もどす
            </Button>
            <Button size="sm" variant="ghost" onClick={() => textRef.current?.clear()}>
              ぜんぶけす
            </Button>
          </div>
          <InkCanvas
            inkRef={textRef}
            aspectRatio={TEXT_ASPECT}
            penColor="#233047"
            baseWidth={3.6}
            penTool={textEraser ? 'eraser' : 'pen'}
            allowTouchInk={getAppFlags().allowTouchInk}
            guide={<TextRuleLines rows={TEXT_ROWS} className="rule-svg" />}
            className="diary-canvas diary-text-canvas"
          />
          <div className="row gap wrap">
            <Button size="sm" onClick={recognize} disabled={recognizing}>
              {recognizing ? 'よみとりちゅう…' : 'かいた字を よみとる'}
            </Button>
          </div>
          <div className="diary-text-review">
            <label className="diary-tool-label" htmlFor="diary-text">
              えいぶん（よみとりの かくにん・なおし）:
            </label>
            <div className="row gap">
              <input
                id="diary-text"
                className="diary-text-input"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setChecked(null)
                }}
                placeholder="I went to the park."
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {text.trim() && <SpeakButton text={text} kind="sentence" size="md" />}
            </div>
          </div>
          <div className="row gap wrap">
            <Button variant="accent" onClick={runCheck} disabled={!text.trim()}>
              えいぶんを チェック
            </Button>
          </div>
          {checked && checked.corrected != null && (
            <div className="diary-correction">
              <div className="diary-corr-block">
                <div className="diary-corr-label">あなたの文</div>
                <div className="diary-corr-text">
                  {text}
                  <SpeakButton text={text} kind="sentence" size="sm" />
                </div>
              </div>
              <div className="diary-corr-arrow">↓</div>
              <div className="diary-corr-block diary-corr-suggest">
                <div className="diary-corr-label">こう書くと もっと自然だよ</div>
                <div className="diary-corr-text">
                  {checked.corrected}
                  <SpeakButton text={checked.corrected} kind="sentence" size="sm" />
                </div>
                <ul className="diary-corr-notes">
                  {checked.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>

        <Card className="diary-helper-card">
          <div className="diary-toolbar">
            <span className="diary-tool-label">💡 れいぶんを さがす — いいたいことを 日本語で いれてね</span>
          </div>
          <div className="row gap">
            <input
              className="diary-text-input"
              value={helperQuery}
              onChange={(e) => setHelperQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchHelper()}
              placeholder="れい: プールに いった／ケーキを たべた"
            />
            {speechAvailable && (
              <button
                className={`tool-btn ${listening ? 'tool-btn-active' : ''}`}
                onClick={startListening}
                disabled={listening}
                title="おんせいで いう"
              >
                🎤{listening ? 'きいてるよ…' : ''}
              </button>
            )}
            <Button size="sm" onClick={() => searchHelper()} disabled={!helperQuery.trim()}>
              さがす
            </Button>
          </div>
          {helperResults != null && (
            <ul className="lookup-list">
              {helperResults.length === 0 && (
                <li className="tile-sub">ちかい れいぶんが みつからなかったよ。べつの いいかたで さがしてみてね</li>
              )}
              {helperResults.map((s) => (
                <li key={s.id} className="lookup-item">
                  <b className="lookup-en">{s.en}</b>
                  <span className="lookup-ja">{s.ja}</span>
                  <SpeakButton text={s.en} kind="sentence" size="sm" />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setText((t) => (t.trim() ? `${t.trim()} ${s.en}` : s.en))
                      setChecked(null)
                      showToast('えいぶんらんに いれたよ。まねして かいてみよう！')
                    }}
                  >
                    つかう
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="row gap wrap diary-actions">
          <Button size="lg" variant="accent" onClick={() => void save()}>
            ほぞんする
          </Button>
          <label className="diary-pdf-opt">
            <input type="checkbox" checked={includeCorrection} onChange={(e) => setIncludeCorrection(e.target.checked)} />
            チェックした文も PDFに いれる
          </label>
          <Button size="lg" variant="secondary" onClick={() => void exportPdf()}>
            PDFに する
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate({ name: 'diary' })}>
            いちらんへ
          </Button>
        </div>
      </div>
    </div>
  )
}
