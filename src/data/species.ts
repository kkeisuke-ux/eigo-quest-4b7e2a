// 仲間キャラクター（完全オリジナル。仕様 §43-§44）。
// 「ことばのもりの なかまたち」という独自世界観。英単語のカテゴリ（動物・食べもの・
// 天気など）と ゆるやかに結びついた精霊たち。既存作品のキャラクター・名称・デザインは
// 使用しない。見た目はパラメトリックSVG（game/sprites.tsx）で描画し、後から画像に
// 差し替えられるよう speciesId + stage をキーにしている。
// かんじクエストとはデータ・世界観とも完全に独立（仕様 §38）。

export type BodyKind = 'round' | 'tall' | 'tear' | 'square' | 'mountain' | 'star' | 'cloud'
export type EyeKind = 'dot' | 'big' | 'happy' | 'sleepy' | 'star'
export type MouthKind = 'smile' | 'open' | 'w'
export type ExtraKind =
  | 'brushTuft'
  | 'inkDrop'
  | 'foldCorner'
  | 'stripeBand'
  | 'gridLines'
  | 'leaf'
  | 'branch'
  | 'rays'
  | 'crescent'
  | 'starHalo'
  | 'windCheeks'
  | 'rockBumps'
  | 'snowCap'
  | 'rainbow'
  | 'horns'
  | 'wings'
  | 'crown'
  | 'scarf'
  | 'sparkle'
  | 'tail'

export interface Look {
  body: BodyKind
  /** 本体色 */
  c1: string
  /** アクセント色 */
  c2: string
  eyes: EyeKind
  mouth: MouthKind
  blush?: boolean
  extras: ExtraKind[]
}

export interface SpeciesStageDef {
  name: string
  desc: string
  look: Look
}

export type Rarity = 'common' | 'rare' | 'epic'

export interface SpeciesDef {
  id: string
  rarity: Rarity
  /** 系列名（図鑑のグループ表示用） */
  lineName: string
  stages: SpeciesStageDef[]
  /** 進化レベル（省略時は gameConfig.defaultEvolveLevels） */
  evolveLevels?: number[]
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'ノーマル',
  rare: 'レア',
  epic: 'スーパーレア',
}

export const SPECIES: SpeciesDef[] = [
  {
    id: 'apporin',
    rarity: 'common',
    lineName: 'りんごのせいれい',
    stages: [
      { name: 'アポリン', desc: 'ことばのもりの りんごから うまれた ちいさな せいれい。', look: { body: 'round', c1: '#e0645f', c2: '#8fce6f', eyes: 'dot', mouth: 'smile', blush: true, extras: ['leaf'] } },
      { name: 'アポルン', desc: 'あたらしい たんごを おぼえると ほっぺが あかくなる。', look: { body: 'round', c1: '#d4504b', c2: '#8fce6f', eyes: 'big', mouth: 'open', blush: true, extras: ['leaf', 'scarf'] } },
      { name: 'アポキング', desc: 'ことばのもりの くだものたちを まとめる おうさま。', look: { body: 'round', c1: '#b93e39', c2: '#f2d06b', eyes: 'sleepy', mouth: 'smile', extras: ['leaf', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'wanpu',
    rarity: 'common',
    lineName: 'こいぬのせいれい',
    stages: [
      { name: 'ワンプ', desc: '「dog」と よばれると しっぽを ふって よろこぶ。', look: { body: 'round', c1: '#d8a05c', c2: '#f5e6c8', eyes: 'dot', mouth: 'open', blush: true, extras: ['tail'] } },
      { name: 'ワンダフ', desc: 'えいごの ほんを くわえて はしりまわる げんきもの。', look: { body: 'round', c1: '#c98d47', c2: '#f5e6c8', eyes: 'big', mouth: 'open', extras: ['tail', 'scarf'] } },
      { name: 'ワンダフルル', desc: 'ことばのもりいちばんの ものしり わんこ。', look: { body: 'tall', c1: '#b57a38', c2: '#f7eed6', eyes: 'happy', mouth: 'smile', extras: ['tail', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'nyamu',
    rarity: 'common',
    lineName: 'こねこのせいれい',
    stages: [
      { name: 'ニャーム', desc: 'ひるねの まえに たんごを 5つ となえる ねこ。', look: { body: 'round', c1: '#9c9c9c', c2: '#f0f0f0', eyes: 'sleepy', mouth: 'w', blush: true, extras: ['tail'] } },
      { name: 'ニャムリン', desc: 'ABCの うたに あわせて ダンスするのが とくい。', look: { body: 'round', c1: '#8a8a8a', c2: '#f0f0f0', eyes: 'happy', mouth: 'w', blush: true, extras: ['tail', 'stripeBand'] } },
      { name: 'ニャムセンセイ', desc: 'めがねを かけた ことばのもりの ねこせんせい。', look: { body: 'tall', c1: '#787878', c2: '#f0f0f0', eyes: 'sleepy', mouth: 'smile', extras: ['tail', 'crown'] } },
    ],
  },
  {
    id: 'sunipo',
    rarity: 'common',
    lineName: 'おひさまのせいれい',
    stages: [
      { name: 'サニポ', desc: '「sunny」の ひに げんきいっぱいに ひかる。', look: { body: 'round', c1: '#f2c14e', c2: '#f7e08a', eyes: 'dot', mouth: 'smile', blush: true, extras: ['rays'] } },
      { name: 'サニルン', desc: 'ことばのもりを あたたかく てらす おひさまの こ。', look: { body: 'round', c1: '#eeb43a', c2: '#f7e08a', eyes: 'happy', mouth: 'open', extras: ['rays', 'sparkle'] } },
    ],
  },
  {
    id: 'bukku',
    rarity: 'common',
    lineName: 'えほんのせいれい',
    stages: [
      { name: 'ブックン', desc: 'よまれるのを まっている ちいさな えほん。', look: { body: 'square', c1: '#5d8fc9', c2: '#f4f0e3', eyes: 'dot', mouth: 'smile', extras: ['foldCorner'] } },
      { name: 'ブックリン', desc: 'あたらしい たんごを ページに あつめている。', look: { body: 'square', c1: '#4a7cb5', c2: '#f4f0e3', eyes: 'big', mouth: 'open', extras: ['foldCorner', 'stripeBand'] } },
      { name: 'ブックマスター', desc: 'せかいじゅうの ことばが かいてある でんせつの ほん。', look: { body: 'square', c1: '#3a659a', c2: '#f2d06b', eyes: 'sleepy', mouth: 'smile', extras: ['foldCorner', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'penpen',
    rarity: 'common',
    lineName: 'ペンのせいれい',
    stages: [
      { name: 'ペンポ', desc: 'じょうずに かけた アルファベットの よこで おどる。', look: { body: 'tall', c1: '#e79a2e', c2: '#4a4a5a', eyes: 'dot', mouth: 'smile', blush: true, extras: ['stripeBand'] } },
      { name: 'ペンリン', desc: 'インクが きれいな にじいろに ひかりだした。', look: { body: 'tall', c1: '#d9891f', c2: '#4a4a5a', eyes: 'big', mouth: 'open', extras: ['stripeBand', 'rainbow'] } },
    ],
  },
  {
    id: 'kumon',
    rarity: 'common',
    lineName: 'くものせいれい',
    stages: [
      { name: 'クモポ', desc: '「cloudy」の そらから ふわりと おりてきた。', look: { body: 'cloud', c1: '#eef2f5', c2: '#c9d4dc', eyes: 'dot', mouth: 'smile', blush: true, extras: ['windCheeks'] } },
      { name: 'クモルン', desc: 'あめの ことばを おぼえると すこし おおきくなる。', look: { body: 'cloud', c1: '#e2e9ee', c2: '#b7c4cf', eyes: 'happy', mouth: 'open', extras: ['windCheeks', 'sparkle'] } },
    ],
  },
  {
    id: 'sutaru',
    rarity: 'rare',
    lineName: 'ほしのせいれい',
    stages: [
      { name: 'スタルン', desc: 'よぞらの 「star」から こぼれおちた ひとかけら。', look: { body: 'star', c1: '#f2d06b', c2: '#f7e6a8', eyes: 'star', mouth: 'smile', extras: ['sparkle'] } },
      { name: 'スタリア', desc: 'がんばった こどもの よるを そっと てらす。', look: { body: 'star', c1: '#eec44f', c2: '#f7e6a8', eyes: 'star', mouth: 'open', extras: ['sparkle', 'starHalo'] } },
      { name: 'スタージュエル', desc: 'ことばのもりの そらに かがやく おおきな ほし。', look: { body: 'star', c1: '#e6b53a', c2: '#fff3c4', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'starHalo', 'crown'] } },
    ],
  },
  {
    id: 'munya',
    rarity: 'rare',
    lineName: 'つきのせいれい',
    stages: [
      { name: 'ムーニャ', desc: 'ねるまえの えいごの おはなしが だいすき。', look: { body: 'tear', c1: '#c7c3e8', c2: '#8f88c9', eyes: 'sleepy', mouth: 'w', blush: true, extras: ['crescent'] } },
      { name: 'ムーンリィ', desc: 'みかづきの ゆりかごで ことばを ゆらして そだてる。', look: { body: 'tear', c1: '#b5b0e0', c2: '#7d75bd', eyes: 'sleepy', mouth: 'smile', extras: ['crescent', 'starHalo', 'sparkle'] } },
    ],
  },
  {
    id: 'doragoo',
    rarity: 'epic',
    lineName: 'ことばのドラゴン',
    stages: [
      { name: 'ドラベビー', desc: 'ABCの たまごから かえった ちいさな ドラゴン。', look: { body: 'round', c1: '#6fbf9a', c2: '#f2d06b', eyes: 'big', mouth: 'open', blush: true, extras: ['horns'] } },
      { name: 'ドラゴード', desc: 'おぼえた たんごの かずだけ つよくなる でんせつの りゅう。', look: { body: 'mountain', c1: '#4da683', c2: '#f2d06b', eyes: 'star', mouth: 'open', extras: ['horns', 'wings'] } },
      { name: 'ドラゴキング', desc: 'ことばのもりを まもる えいちの おう。', look: { body: 'mountain', c1: '#3a8f6e', c2: '#f7e08a', eyes: 'star', mouth: 'smile', extras: ['horns', 'wings', 'crown', 'sparkle'] } },
    ],
  },
]

const byId = new Map(SPECIES.map((s) => [s.id, s]))

export function getSpecies(id: string): SpeciesDef | undefined {
  return byId.get(id)
}

export function speciesByRarity(r: Rarity): SpeciesDef[] {
  const pool = SPECIES.filter((s) => s.rarity === r)
  return pool.length > 0 ? pool : SPECIES.filter((s) => s.rarity === 'common')
}

/** 図鑑の総エントリ数（全種族×全段階） */
export function totalDexEntries(): number {
  return SPECIES.reduce((acc, s) => acc + s.stages.length, 0)
}
