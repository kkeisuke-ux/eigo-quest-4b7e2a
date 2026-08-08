// 絵日記の英文チェック（仕様 §30）。
// オフラインで動くルールベース添削。正解文への置き換えはせず、
// 「あなたの文」と「こう書くともっと自然だよ」の提案を分けて返す。
// 対象: スペル / 基本文法（be動詞・過去形・前置詞）/ 語順の初歩 / 大文字・ピリオド。
// 高度な添削は将来 CorrectionProvider の差し替えで対応する（README参照）。
import { WORDS } from '../data/words'

export interface CorrectionResult {
  /** 提案文（原文と同じなら null = なおすところなし） */
  corrected: string | null
  /** 何をなおしたかの子ども向け説明 */
  notes: string[]
}

// 基本英単語（収録120語に加えて、子どもがよく書く語）
const EXTRA_WORDS = [
  'a', 'an', 'the', 'i', 'my', 'your', 'his', 'her', 'we', 'they', 'he', 'she', 'it', 'am', 'is', 'are',
  'was', 'were', 'do', 'does', 'did', 'have', 'has', 'had', 'to', 'in', 'on', 'at', 'of', 'and', 'or',
  'but', 'with', 'very', 'not', 'no', 'yes', 'this', 'that', 'went', 'ate', 'saw', 'came', 'ran',
  'drank', 'played', 'liked', 'good', 'nice', 'big', 'small', 'new', 'old', 'fun', 'cute', 'cool',
  'day', 'night', 'yesterday', 'every', 'want', 'love', 'get', 'got', 'make', 'made', 'watch',
  'watched', 'read', 'wrote', 'write', 'swim', 'swam', 'sing', 'sang', 'dance', 'danced', 'game',
  'games', 'tv', 'movie', 'music', 'cake', 'ice', 'cream', 'pizza', 'sushi', 'was', 'so', 'too',
  'happy', 'birthday', 'summer', 'winter', 'spring', 'fall', 'mom', 'dad', 'brother', 'sister',
  'grandma', 'grandpa', 'dogs', 'cats', 'apples', 'books', 'friends', 'toys', 'toy',
]

const KNOWN = new Set<string>([...WORDS.map((w) => w.en.toLowerCase()), ...EXTRA_WORDS])

// 複数形・過去形っぽい語尾は原形で照合を試みる
function isKnown(word: string): boolean {
  const w = word.toLowerCase()
  if (KNOWN.has(w)) return true
  if (w.endsWith('s') && KNOWN.has(w.slice(0, -1))) return true
  if (w.endsWith('es') && KNOWN.has(w.slice(0, -2))) return true
  if (w.endsWith('ed') && (KNOWN.has(w.slice(0, -2)) || KNOWN.has(w.slice(0, -1)))) return true
  if (w.endsWith('ing') && KNOWN.has(w.slice(0, -3))) return true
  return false
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0)
    row[0] = i
    return row
  })
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[a.length][b.length]
}

function spellSuggest(word: string): string | null {
  const w = word.toLowerCase()
  let best: string | null = null
  let bestDist = Infinity
  const maxDist = w.length <= 4 ? 1 : 2
  for (const cand of KNOWN) {
    if (Math.abs(cand.length - w.length) > maxDist) continue
    const d = editDistance(w, cand)
    if (d < bestDist || (d === bestDist && best != null && cand.length > best.length)) {
      bestDist = d
      best = cand
    }
    if (bestDist === 1 && cand.length === w.length) break
  }
  return bestDist <= maxDist ? best : null
}

/** 過去形辞書（時制の提案用） */
const PAST_FORMS: Record<string, string> = {
  go: 'went', eat: 'ate', see: 'saw', come: 'came', run: 'ran', drink: 'drank',
  play: 'played', like: 'liked', is: 'was', are: 'were', am: 'was', have: 'had',
  swim: 'swam', make: 'made', get: 'got', watch: 'watched', walk: 'walked', jump: 'jumped',
}

/** 「to (the) 〜」が自然な場所語 */
const PLACE_TO: Record<string, string> = {
  park: 'to the park', zoo: 'to the zoo', station: 'to the station', shop: 'to the shop',
  library: 'to the library', school: 'to school', house: 'to the house', pool: 'to the pool',
  sea: 'to the sea', mountain: 'to the mountain',
}

const BE_ADJ = new Set(['happy', 'sad', 'fine', 'hungry', 'sleepy', 'hot', 'good', 'fun', 'nice', 'cute', 'big', 'small', 'sunny', 'rainy', 'cloudy', 'snowy'])

const MOTION_VERBS = new Set(['go', 'went', 'come', 'came', 'walk', 'walked', 'run', 'ran'])

interface Sentence {
  words: string[]
  notes: string[]
}

function correctSentence(raw: string): Sentence {
  const notes: string[] = []
  let words = raw.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { words, notes }

  // 1) スペルチェック
  words = words.map((w) => {
    const core = w.replace(/[.,!?]+$/, '')
    const tail = w.slice(core.length)
    if (core.length === 0) return w
    if (isKnown(core) || /^[A-Z][a-z]*$/.test(core)) return w
    const suggest = spellSuggest(core)
    if (suggest && suggest !== core.toLowerCase()) {
      notes.push(`「${core}」は「${suggest}」の スペルかな？`)
      return suggest + tail
    }
    return w
  })

  // 2) 単語の I は大文字
  words = words.map((w) => {
    if (w === 'i' || w.startsWith('i.')) {
      notes.push('じぶんのことは いつも おおもじの「I」で書くよ')
      return 'I' + w.slice(1)
    }
    return w
  })

  // 3) be動詞の欠落: I happy → I am happy
  for (let i = 0; i + 1 < words.length; i++) {
    const cur = words[i].toLowerCase()
    const next = words[i + 1].toLowerCase().replace(/[.,!?]+$/, '')
    if ((cur === 'i' && BE_ADJ.has(next))) {
      words.splice(i + 1, 0, 'am')
      notes.push('「I am happy.」のように「am」を いれると もっと自然だよ')
      break
    }
    if ((cur === 'it' && BE_ADJ.has(next))) {
      words.splice(i + 1, 0, 'is')
      notes.push('「It is …」のように「is」を いれると もっと自然だよ')
      break
    }
  }

  // 4) 移動動詞 + 場所: go park → go to the park
  for (let i = 0; i + 1 < words.length; i++) {
    const cur = words[i].toLowerCase()
    const m = words[i + 1].match(/^([A-Za-z]+)([.,!?]*)$/)
    if (!m) continue
    const next = m[1].toLowerCase()
    const tail = m[2]
    if (MOTION_VERBS.has(cur) && PLACE_TO[next]) {
      const replacement = PLACE_TO[next].split(' ')
      replacement[replacement.length - 1] += tail
      words.splice(i + 1, 1, ...replacement)
      notes.push(`「${cur} ${next}」は「${cur} ${PLACE_TO[next]}」と書くと もっと自然だよ`)
      break
    }
  }

  // 5) yesterday があるのに動詞が現在形 → 過去形の提案
  const hasPastWord = words.some((w) => ['yesterday', 'last'].includes(w.toLowerCase().replace(/[.,!?]+$/, '')))
  if (hasPastWord) {
    for (let i = 0; i < words.length; i++) {
      const core = words[i].toLowerCase().replace(/[.,!?]+$/, '')
      const tail = words[i].slice(core.length)
      if (PAST_FORMS[core]) {
        notes.push(`きのうの ことだから「${core}」は「${PAST_FORMS[core]}」（すぎたかたち）に すると いいよ`)
        words[i] = PAST_FORMS[core] + tail
      }
    }
  }

  return { words, notes }
}

/** 英文全体（1〜3文）をチェックする */
export function checkDiaryText(text: string): CorrectionResult {
  const trimmed = text.trim()
  if (!trimmed) return { corrected: null, notes: [] }

  // 文単位に分割（ピリオドを保持）
  const parts = trimmed.split(/(?<=[.!?])\s+/)
  const notes: string[] = []
  const outSentences: string[] = []

  for (let raw of parts) {
    const s = correctSentence(raw)
    notes.push(...s.notes)
    let joined = s.words.join(' ')
    if (joined.length === 0) continue
    // 文頭は大文字
    if (/^[a-z]/.test(joined)) {
      joined = joined[0].toUpperCase() + joined.slice(1)
      notes.push('文の さいしょは おおもじで はじめよう')
    }
    // 文末にピリオド
    if (!/[.!?]$/.test(joined)) {
      joined += '.'
      notes.push('文の おわりには ピリオド「.」を つけよう')
    }
    outSentences.push(joined)
  }

  const corrected = outSentences.join(' ')
  const changed = corrected !== trimmed
  // 重複する説明はまとめる
  const uniqueNotes = [...new Set(notes)]
  return { corrected: changed ? corrected : null, notes: changed ? uniqueNotes : [] }
}
