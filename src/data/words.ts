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
