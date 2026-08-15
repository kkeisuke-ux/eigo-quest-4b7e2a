// ============================================================
// 収録語・例文の安全性チェック（第27回・子ども向け適切性の一括監査）
//   npx vite-node scripts/audit-safety.ts
// 収録単語（words.json）と絵日記の例文（sentences.ts）を走査し、
// 子どもに不適切な語の候補をカテゴリ別に一覧する（判断は人が行う）。
// 出力: docs/word-safety-report.md
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORDS } from '../src/data/words'
import { SENTENCES } from '../src/data/sentences'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(__dirname, '..', 'docs', 'word-safety-report.md')

const RULES: { key: string; level: 'ng' | 'check'; en: RegExp; ja: RegExp }[] = [
  {
    key: '性的',
    level: 'ng',
    en: /\b(sex|sexy|naked|nude|porn|breast|virgin|condom|prostitut|affair|mistress)\b/i,
    ja: /セックス|性交|全裸|裸に|わいせつ|売春|愛人|不倫|浮気|童貞|処女|エロ|ポルノ|乳房/,
  },
  {
    key: '暴力・殺傷',
    level: 'ng',
    en: /\b(kill|murder|suicide|stab|shoot|shot dead|torture|abuse|rape|corpse|slaughter)\b/i,
    ja: /殺す|殺し|殺人|自殺|刺す|拷問|虐待|レイプ|死体|遺体/,
  },
  {
    key: '差別・侮蔑',
    level: 'ng',
    en: /\b(idiot|stupid|fool|ugly|fat pig|damn|shit|fuck|bastard|retard)\b/i,
    ja: /馬鹿|バカ|阿呆|アホ|間抜け|ブス|デブ|ハゲ|きちがい|めくら|つんぼ|死ね/,
  },
  {
    key: '犯罪・薬物',
    level: 'ng',
    en: /\b(drug|cocaine|heroin|marijuana|smuggl|blackmail|kidnap|robbery|arson|terror|bomb|gun|pistol|gambl)\b/i,
    ja: /麻薬|覚醒剤|大麻|密売|密輸|恐喝|脅迫|誘拐|強盗|窃盗|放火|テロ|爆弾|拳銃|賭博/,
  },
  {
    key: '飲酒・喫煙',
    level: 'check',
    en: /\b(alcohol|beer|wine|whisky|whiskey|drunk|cigarette|tobacco|smoking)\b/i,
    ja: /酒|ビール|ワイン|ウイスキー|酔|たばこ|タバコ|煙草|喫煙/,
  },
  {
    key: '死・病気',
    level: 'check',
    en: /\b(die|died|death|dead|funeral|grave|cancer|disease|hospitaliz)\b/i,
    ja: /死ぬ|死亡|亡くな|葬式|葬儀|お墓|癌|末期|入院|手術/,
  },
  {
    key: '戦争',
    level: 'check',
    en: /\b(war|army|soldier|weapon|invasion|missile|nuclear)\b/i,
    ja: /戦争|軍隊|兵士|武器|侵略|ミサイル|核/,
  },
]

interface Row { kind: string; id: string; text: string; cat: string; level: 'ng' | 'check'; hit: string }
const rows: Row[] = []
const scan = (kind: string, id: string, en: string, ja: string) => {
  for (const rule of RULES) {
    const m = en.match(rule.en) ?? ja.match(rule.ja)
    if (!m) continue
    rows.push({ kind, id, text: `${en} / ${ja}`, cat: rule.key, level: rule.level, hit: m[0] })
    break
  }
}
for (const w of WORDS) scan('word', w.id, w.en, w.ja)
for (const s of SENTENCES) scan('sentence', s.id, s.en, `${s.ja} ${s.keywords.join(' ')}`)

const byCat = new Map<string, Row[]>()
for (const r of rows) {
  if (!byCat.has(r.cat)) byCat.set(r.cat, [])
  byCat.get(r.cat)!.push(r)
}
const ng = rows.filter((r) => r.level === 'ng')
let md = `# 収録語・例文の安全性チェック結果\n\n`
md += `- 実行: \`npx vite-node scripts/audit-safety.ts\`\n`
md += `- 対象: 収録単語 **${WORDS.length}語** ／ 絵日記の例文 **${SENTENCES.length}文**\n`
md += `- 検出: 原則削除(ng) **${ng.length}件** / 要確認(check) **${rows.length - ng.length}件**\n\n`
if (rows.length === 0) md += `**検出なし**\n\n`
for (const [cat, list] of byCat) {
  md += `## ${cat}（${list[0].level === 'ng' ? '原則削除' : '要確認'}）: ${list.length}件\n\n`
  md += `| 種別 | ID | 一致 | 内容 |\n|---|---|---|---|\n`
  for (const r of list) md += `| ${r.kind} | ${r.id} | ${r.hit} | ${r.text.replace(/\|/g, '/')} |\n`
  md += `\n`
}
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, md, 'utf8')
console.log(`単語${WORDS.length}語・例文${SENTENCES.length}文を検査`)
for (const [cat, list] of byCat) console.log(`  ${cat}: ${list.length}件 (${list[0].level})`)
console.log(`原則削除 ${ng.length} / 要確認 ${rows.length - ng.length}`)
console.log(`レポート: ${outFile}`)
