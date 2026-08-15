// 英単語データのローダー（データ本体は words.json。仕様 §10「コードから分離」）。
// 5語=1ステージ / レベル（ようじ・小N相当・中N相当）×3学期のカリキュラム構造（仕様 §9, §25）。
import raw from './words.json'
import { GAME_CONFIG } from '../config/gameConfig'

export interface WordIllustration {
  kind: 'emoji' | 'image' | 'svg'
  /** emoji: 絵文字1〜2個 / image: パス（将来差し替え用。仕様 §11） */
  value: string
}

export interface Word {
  id: string
  en: string
  ja: string
  category: string
  pos: 'noun' | 'verb' | 'adj' | 'other'
  illustration: WordIllustration
}

export interface WordStageDef {
  id: string
  label: string
  wordIds: string[]
}

export interface WordTermDef {
  index: number
  stages: WordStageDef[]
}

export interface WordLevelDef {
  id: string
  label: string
  terms: WordTermDef[]
}

interface RawWord {
  id: string
  en: string
  ja: string
  category: string
  pos: string
  emoji: string
}

interface RawStage {
  id: string
  label: string
  words: string[]
}

export const WORDS: Word[] = (raw.words as RawWord[]).map((w) => ({
  id: w.id,
  en: w.en,
  ja: w.ja,
  category: w.category,
  pos: (['noun', 'verb', 'adj'].includes(w.pos) ? w.pos : 'other') as Word['pos'],
  illustration: { kind: 'emoji', value: w.emoji },
}))

export const LEVELS: WordLevelDef[] = raw.levels.map((lv) => ({
  id: lv.id,
  label: lv.label,
  terms: (lv.terms ?? []).map((t) => ({
    index: t.index,
    stages: (t.stages as RawStage[]).map((s) => ({ id: s.id, label: s.label, wordIds: s.words })),
  })),
}))

const wordById = new Map(WORDS.map((w) => [w.id, w]))

export function getWord(id: string): Word | undefined {
  return wordById.get(id)
}

export function getWords(ids: string[]): Word[] {
  return ids.map((id) => wordById.get(id)).filter((w): w is Word => w != null)
}

/** 学習可能な（ステージが定義済みの）レベル */
export function playableLevels(): WordLevelDef[] {
  return LEVELS.filter((lv) => lv.terms.length > 0)
}

export interface StageLocation {
  level: WordLevelDef
  term: WordTermDef
  stage: WordStageDef
  /** 全レベル通しのステージ番号（0始まり） */
  flatIndex: number
}

const stageIndex = new Map<string, StageLocation>()
{
  let flat = 0
  for (const level of LEVELS) {
    for (const term of level.terms) {
      for (const stage of term.stages) {
        stageIndex.set(stage.id, { level, term, stage, flatIndex: flat })
        flat++
      }
    }
  }
}

export function getStageLocation(stageId: string): StageLocation | undefined {
  return stageIndex.get(stageId)
}

export function listAllStages(): StageLocation[] {
  return [...stageIndex.values()].sort((a, b) => a.flatIndex - b.flatIndex)
}

/** 学期（term）に含まれる全単語ID（まとめテスト用。仕様 §25） */
export function termWordIds(levelId: string, termIndex: number): string[] {
  const level = LEVELS.find((lv) => lv.id === levelId)
  const term = level?.terms.find((t) => t.index === termIndex)
  if (!term) return []
  return term.stages.flatMap((s) => s.wordIds)
}

export function termLabel(index: number): string {
  return GAME_CONFIG.termLabels[index] ?? `第${index + 1}期`
}

export function termId(levelId: string, termIndex: number): string {
  return `${levelId}-t${termIndex + 1}`
}

/** 実在するステージID（実績集計用。第22回） */
export const ACTIVE_STAGE_IDS: Set<string> = new Set(
  LEVELS.flatMap((lv) => lv.terms.flatMap((t) => t.stages.map((s) => s.id)))
)

// ============================================================
// まとめテスト（第24回で全面改編。かんじクエスト第43回と同型）:
// 旧「学期ごと1本」は語彙拡充後は長すぎるため、
// 4ステージ（最大20語=20問）ごとの通し番号テスト「まとめテスト N」に分割。
// ============================================================
export interface TermTestDef {
  id: string
  /** 全体の通し番号（1始まり） */
  num: number
  /** 「まとめテスト12」 */
  label: string
  /** 「じぶんとかぞく〜うごきのことば 1」等（ステージ名の範囲） */
  rangeLabel: string
  levelId: string
  termIndex: number
  wordIds: string[]
}

export const TERM_TESTS: TermTestDef[] = (() => {
  const out: TermTestDef[] = []
  let num = 0
  for (const lv of LEVELS) {
    for (const t of lv.terms) {
      for (let i = 0; i < t.stages.length; i += 4) {
        const chunk = t.stages.slice(i, i + 4)
        num++
        out.push({
          id: `${termId(lv.id, t.index)}-m${i / 4 + 1}`,
          num,
          label: `まとめテスト${num}`,
          rangeLabel: chunk.length === 1 ? chunk[0].label : `${chunk[0].label}〜${chunk[chunk.length - 1].label}`,
          levelId: lv.id,
          termIndex: t.index,
          wordIds: chunk.flatMap((s) => s.wordIds),
        })
      }
    }
  }
  return out
})()

export const TERM_TEST_TOTAL = TERM_TESTS.length

export function findTermTest(id: string): TermTestDef | null {
  return TERM_TESTS.find((t) => t.id === id) ?? null
}

/**
 * 100点をとったまとめテストIDの集合（称号・実績の基準）。
 * 語彙・レベルの全面再編（第24回）により、旧・学期テストの記録は新テストへ
 * 対応づけられないため、新IDの記録のみを数える。
 */
export function perfectTermTestIds(
  results: { kind: string; targetId: string; total: number; correct: number }[]
): Set<string> {
  const valid = new Set(TERM_TESTS.map((t) => t.id))
  return new Set(
    results
      .filter((r) => r.kind === 'term' && r.total > 0 && r.correct === r.total && valid.has(r.targetId))
      .map((r) => r.targetId)
  )
}

export function parseTermId(id: string): { levelId: string; termIndex: number } | null {
  const m = id.match(/^(.+)-t(\d+)$/)
  if (!m) return null
  return { levelId: m[1], termIndex: parseInt(m[2], 10) - 1 }
}

/** まとめテストの表示名（例: 「小1相当 1学期 まとめテスト」。公式配当とは表現しない。仕様 §25） */
export function termTestTitle(levelId: string, termIndex: number): string {
  const level = LEVELS.find((lv) => lv.id === levelId)
  return `${level?.label ?? levelId} ${termLabel(termIndex)} まとめテスト`
}

/**
 * まとめテスト100点の最高到達レベル表示（第13回。かんじクエストと同じ仕組み）。
 * 例:「ようじ 1学期」「小4 2学期」。100点がまだ無ければnull。
 * レベル順（LEVELS配列順）→学期順で一番進んでいる100点クリア済みまとめテストを返す。
 */
export function termClearLevelLabel(perfectTermIds: Iterable<string>): string | null {
  let best: { li: number; ti: number } | null = null
  for (const id of perfectTermIds) {
    const p = parseTermId(id)
    if (!p) continue
    const li = LEVELS.findIndex((lv) => lv.id === p.levelId)
    if (li < 0) continue
    if (!best || li > best.li || (li === best.li && p.termIndex > best.ti)) best = { li, ti: p.termIndex }
  }
  if (!best) return null
  return `${LEVELS[best.li].label} ${termLabel(best.ti)}`
}

/** ステージテスト（5もんテスト）で100点をとったことのあるステージIDの集合 */
export function perfectStageIds(
  results: { kind: string; targetId: string; total: number; correct: number }[]
): Set<string> {
  return new Set(
    results.filter((r) => r.kind === 'stage' && r.total > 0 && r.correct === r.total).map((r) => r.targetId)
  )
}

/**
 * ステージテスト100点の到達レベル表示（第25回。第26回でルール変更）。
 * 「その学期の全ステージでテスト100点」を満たす学期のうち、いちばん上のレベル・学期を返す。
 * 下のレベルが終わっているかは問わない。例:「小1 1学期」。1学期も完了していなければnull。
 */
export function stageClearLevelLabel(perfect: Set<string>): string | null {
  // レベル名は「小1相当」→「小1」に詰めて表示する（チップが長くならないように）
  const fmt = (level: WordLevelDef, index: number) =>
    `${level.label.replace('相当', '')} ${termLabel(index)}`
  let best: { level: WordLevelDef; index: number } | null = null
  for (const level of LEVELS) {
    for (const term of level.terms) {
      if (term.stages.length === 0) continue
      if (!term.stages.every((st) => perfect.has(st.id))) continue
      // LEVELSはレベル順・学期順なので、後に見つかったものほど上のレベル
      best = { level, index: term.index }
    }
  }
  return best ? fmt(best.level, best.index) : null
}

/** 日本語から英単語を探す（「ことばを調べる」。仕様 §34） */
export function searchByJa(query: string): Word[] {
  const q = query.trim()
  if (!q) return []
  return WORDS.filter((w) => w.ja.includes(q) || w.en.toLowerCase().includes(q.toLowerCase()))
}

/** スペルチェック等に使う既知単語リスト（小文字化） */
export function knownWordSet(): Set<string> {
  return new Set(WORDS.map((w) => w.en.toLowerCase()))
}
