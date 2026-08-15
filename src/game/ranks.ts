// ============================================================
// 称号・バッジシステム（第22回移植、第24回でまとめテスト分割にあわせ自動スケール化）
// 「たっせい数」がそのままランク。1つたっせいするごとに必ず1ランク上がる。
// たっせい = アルファベットテストごうかく（おおもじ・こもじで2つ）
//          ＋ まとめテスト100点（20問区切り・全TERM_TEST_TOTAL本）
//   序盤〜中盤: N級→1級（級数=たっせい総数-20で自動決定。色は10段階で濃くなる）
//   ラスト20: 初段→十段 → 特別称号10（最高は えいご王）
// ============================================================
import { TERM_TEST_TOTAL } from '../data/words'

export type RankTier = 'kyu' | 'dan' | 'grand'

export interface RankDef {
  /** 到達に必要な100点の本数（=通し番号 1〜30） */
  count: number
  /** 称号名（表示用） */
  label: string
  tier: RankTier
  /** バッジの地色 */
  color: string
  /** バッジのふち色 */
  edge: string
  /** バッジ中央の文字 */
  emblem: string
  /** 特別飾り: crown=冠, rays=光, sparkle=きらめき */
  decor?: ('crown' | 'rays' | 'sparkle')[]
}

// 級の帯色（うすい→こい）。級数が多いので、進むほど10段階で濃くなる
const KYU_PALETTE: { color: string; edge: string }[] = [
  { color: '#b9c2cc', edge: '#8a95a1' },
  { color: '#efe9dd', edge: '#c9c0ae' },
  { color: '#f2d34c', edge: '#cfae2c' },
  { color: '#f2a63c', edge: '#cc852a' },
  { color: '#5fbf7a', edge: '#3f9d63' },
  { color: '#54c0dd', edge: '#3898b4' },
  { color: '#5a77e0', edge: '#4a67d8' },
  { color: '#9a6bde', edge: '#8a5bd6' },
  { color: '#a3785a', edge: '#8a6a4f' },
  { color: '#e05f5f', edge: '#c53a3a' },
]

// 級はたっせい総数（まとめテスト+アルファベット2）に合わせて自動生成
const KYU_COUNT = Math.max(1, TERM_TEST_TOTAL + 2 - 20)
const KYU: { label: string; color: string; edge: string; emblem: string }[] = Array.from(
  { length: KYU_COUNT },
  (_, i) => {
    const n = KYU_COUNT - i
    const pal = KYU_PALETTE[Math.min(KYU_PALETTE.length - 1, Math.floor((i * KYU_PALETTE.length) / KYU_COUNT))]
    return { label: `${n}級`, emblem: String(n), ...pal }
  }
)

const DAN_LABELS = ['初段', '二段', '三段', '四段', '五段', '六段', '七段', '八段', '九段', '十段']
const DAN_EMBLEMS = ['初', '二', '三', '四', '五', '六', '七', '八', '九', '十']

// 21〜30本: 1つずつ特別デザインの称号
const GRAND: Omit<RankDef, 'count' | 'tier'>[] = [
  { label: '達人', color: '#c8ced9', edge: '#8a95a1', emblem: '達', decor: ['sparkle'] },
  { label: '鉄人', color: '#7a828c', edge: '#4c525a', emblem: '鉄', decor: ['sparkle'] },
  { label: '名人', color: '#f2c33c', edge: '#cf9c1a', emblem: '名', decor: ['sparkle'] },
  { label: '賢者', color: '#4a5fd0', edge: '#32419c', emblem: '賢', decor: ['sparkle'] },
  { label: '仙人', color: '#3f9d8a', edge: '#2a7a6a', emblem: '仙', decor: ['sparkle'] },
  { label: '王者', color: '#d84a4a', edge: '#a82f2f', emblem: '王', decor: ['crown'] },
  { label: '竜王', color: '#7a3ad8', edge: '#5a26a8', emblem: '竜', decor: ['crown', 'sparkle'] },
  { label: '大王', color: '#2f52c0', edge: '#f2c33c', emblem: '大', decor: ['crown', 'sparkle'] },
  { label: '伝説', color: '#e08a2f', edge: '#f2e04c', emblem: '伝', decor: ['crown', 'rays'] },
  { label: 'えいご王', color: '#f2b01a', edge: '#e05f5f', emblem: '英', decor: ['crown', 'rays', 'sparkle'] },
]

export const RANKS: RankDef[] = [
  ...KYU.map((k, i) => ({ count: i + 1, tier: 'kyu' as const, ...k })),
  ...DAN_LABELS.map((label, i) => ({
    count: KYU_COUNT + 1 + i,
    tier: 'dan' as const,
    label,
    color: '#2a2f45',
    edge: '#f2c33c',
    emblem: DAN_EMBLEMS[i],
  })),
  ...GRAND.map((g, i) => ({ count: KYU_COUNT + 11 + i, tier: 'grand' as const, ...g })),
]

/** アルファベットごうかく数＋まとめテスト100点の本数 → たっせい数（ランクの基準。第22回） */
export function rankCountFor(termPerfectCount: number, alphaUpper: number, alphaLower: number): number {
  return termPerfectCount + (alphaUpper >= 26 ? 1 : 0) + (alphaLower >= 26 ? 1 : 0)
}

/** たっせい数→現在のランク（0ならnull）。全部たっせいしても最高位のまま */
export function rankForCount(n: number): RankDef | null {
  if (n <= 0) return null
  return RANKS[Math.min(n, RANKS.length) - 1]
}

/** 次のランク（最高位ならnull） */
export function nextRank(n: number): RankDef | null {
  return n < RANKS.length ? RANKS[n] : null
}
