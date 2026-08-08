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
      { name: 'サンシャイア', desc: 'もり ぜんたいを まぶしく てらす たいようの おう。', look: { body: 'round', c1: '#e8a626', c2: '#ffe9a8', eyes: 'star', mouth: 'smile', extras: ['rays', 'crown', 'sparkle'] } },
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
      { name: 'ペンマイスター', desc: 'どんな ことばも うつくしく かける ペンの めいじん。', look: { body: 'tall', c1: '#c77a12', c2: '#3a3a4a', eyes: 'sleepy', mouth: 'smile', extras: ['stripeBand', 'rainbow', 'crown'] } },
    ],
  },
  {
    id: 'kumon',
    rarity: 'common',
    lineName: 'くものせいれい',
    stages: [
      { name: 'クモポ', desc: '「cloudy」の そらから ふわりと おりてきた。', look: { body: 'cloud', c1: '#eef2f5', c2: '#c9d4dc', eyes: 'dot', mouth: 'smile', blush: true, extras: ['windCheeks'] } },
      { name: 'クモルン', desc: 'あめの ことばを おぼえると すこし おおきくなる。', look: { body: 'cloud', c1: '#e2e9ee', c2: '#b7c4cf', eyes: 'happy', mouth: 'open', extras: ['windCheeks', 'sparkle'] } },
      { name: 'クモニンバス', desc: 'にじを かけて そらを かざる くもの おうさま。', look: { body: 'cloud', c1: '#d8e1e8', c2: '#a5b4c2', eyes: 'sleepy', mouth: 'smile', extras: ['windCheeks', 'rainbow', 'crown'] } },
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
      { name: 'ルナクイーン', desc: 'まんげつの よるに ことばのもりを みまもる じょおう。', look: { body: 'tear', c1: '#a49ed6', c2: '#6c63b0', eyes: 'star', mouth: 'smile', extras: ['crescent', 'starHalo', 'crown', 'sparkle'] } },
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
  // ---------- 2026-08-08 第7回で追加（中3まで持続できるキャラ数へ大増量） ----------
  {
    id: 'horon',
    rarity: 'common',
    lineName: 'ふくろうのせいれい',
    stages: [
      { name: 'ホロン', desc: 'よるの もりで ほんを よむのが すきな ふくろう。', look: { body: 'round', c1: '#a08a6a', c2: '#f0e6d2', eyes: 'big', mouth: 'w', blush: true, extras: ['branch'] } },
      { name: 'ホロリン', desc: 'むずかしい たんごも しっている ものしりさん。', look: { body: 'round', c1: '#8d7756', c2: '#f0e6d2', eyes: 'big', mouth: 'smile', extras: ['branch', 'scarf'] } },
      { name: 'ホロはかせ', desc: 'ことばのもりで いちばん かしこい ふくろうはかせ。', look: { body: 'tall', c1: '#7a6546', c2: '#f5eee0', eyes: 'sleepy', mouth: 'smile', extras: ['branch', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'konpo',
    rarity: 'common',
    lineName: 'きつねのせいれい',
    stages: [
      { name: 'コンポ', desc: 'しっぽを ふりふり ことばあそびを する こぎつね。', look: { body: 'tear', c1: '#e8964f', c2: '#fff3e0', eyes: 'dot', mouth: 'smile', blush: true, extras: ['tail'] } },
      { name: 'コンタ', desc: 'かしこくなって しっぽが ふさふさに なった。', look: { body: 'tear', c1: '#dd8438', c2: '#fff3e0', eyes: 'happy', mouth: 'open', extras: ['tail', 'scarf'] } },
      { name: 'コンキュウ', desc: 'ここのつの しっぽを もつ でんせつの きつね。', look: { body: 'tear', c1: '#c96f24', c2: '#ffe9c4', eyes: 'star', mouth: 'smile', extras: ['tail', 'sparkle', 'crown'] } },
    ],
  },
  {
    id: 'petan',
    rarity: 'common',
    lineName: 'ペンギンのせいれい',
    stages: [
      { name: 'ペタン', desc: 'こおりの うえを ぺたぺた あるく こぺんぎん。', look: { body: 'round', c1: '#4a5568', c2: '#ffffff', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ペタペン', desc: 'すいすい およいで さかなの なまえを おぼえる。', look: { body: 'tall', c1: '#3d4759', c2: '#ffffff', eyes: 'big', mouth: 'open', extras: ['scarf'] } },
      { name: 'ペタキング', desc: 'ひょうざんの おうこくを おさめる ペンギンの おう。', look: { body: 'tall', c1: '#303a4a', c2: '#f0f6ff', eyes: 'sleepy', mouth: 'smile', extras: ['scarf', 'crown', 'snowCap'] } },
    ],
  },
  {
    id: 'rukapo',
    rarity: 'common',
    lineName: 'イルカのせいれい',
    stages: [
      { name: 'ルカポ', desc: 'なみの うえで ジャンプの れんしゅうを している。', look: { body: 'tear', c1: '#6fb3d8', c2: '#e6f4fb', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ルカリン', desc: 'うみの ともだちに えいごで あいさつ できる。', look: { body: 'tear', c1: '#5aa3cc', c2: '#e6f4fb', eyes: 'happy', mouth: 'open', extras: ['sparkle'] } },
      { name: 'ルカスター', desc: 'ほしぞらの うみを とびはねる きせきの イルカ。', look: { body: 'tear', c1: '#4691bd', c2: '#d4ecf9', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'starHalo'] } },
    ],
  },
  {
    id: 'mosupo',
    rarity: 'common',
    lineName: 'ちょうちょのせいれい',
    stages: [
      { name: 'モスポ', desc: 'はっぱを もぐもぐ たべる ちいさな いもむし。', look: { body: 'round', c1: '#9ecb6f', c2: '#e7f4d4', eyes: 'dot', mouth: 'w', blush: true, extras: ['leaf'] } },
      { name: 'マユリン', desc: 'まゆの なかで へんしんの じゅんびちゅう……。', look: { body: 'tear', c1: '#d9cfa8', c2: '#bfb083', eyes: 'sleepy', mouth: 'w', extras: [] } },
      { name: 'フラッタ', desc: 'はねを ひろげて はなから はなへ とびまわる。', look: { body: 'round', c1: '#e58fc0', c2: '#f2d06b', eyes: 'happy', mouth: 'smile', extras: ['wings', 'sparkle'] } },
    ],
  },
  {
    id: 'tamago',
    rarity: 'common',
    lineName: 'カエルのせいれい',
    stages: [
      { name: 'タマゴロ', desc: 'みずの なかで ぷかぷか ういている たまご。', look: { body: 'round', c1: '#cfe8e0', c2: '#8fbfae', eyes: 'dot', mouth: 'w', extras: [] } },
      { name: 'オタマン', desc: 'しっぽを ふって およぎながら ことばを きいている。', look: { body: 'tear', c1: '#88b8a5', c2: '#5f9a83', eyes: 'big', mouth: 'open', blush: true, extras: ['tail'] } },
      { name: 'ケロッタ', desc: 'げんきに ケロケロ うたう もりの うたひめ。', look: { body: 'round', c1: '#6aa886', c2: '#c9e8b8', eyes: 'happy', mouth: 'open', blush: true, extras: ['leaf', 'sparkle'] } },
    ],
  },
  {
    id: 'piyon',
    rarity: 'common',
    lineName: 'ことりのせいれい',
    stages: [
      { name: 'ピヨン', desc: 'たまごから かえったばかりの ひよこ。', look: { body: 'round', c1: '#f5d76e', c2: '#f2a63c', eyes: 'dot', mouth: 'open', blush: true, extras: [] } },
      { name: 'コッコル', desc: 'はねを ばたばた とぶ れんしゅうを している。', look: { body: 'round', c1: '#eec654', c2: '#e08f2e', eyes: 'big', mouth: 'open', extras: ['wings'] } },
      { name: 'フェニコ', desc: 'ほのおの はねを もつ ふしぎな とりに なった。', look: { body: 'tear', c1: '#e0863c', c2: '#f2c33c', eyes: 'star', mouth: 'smile', extras: ['wings', 'rays', 'sparkle'] } },
    ],
  },
  {
    id: 'tanepo',
    rarity: 'common',
    lineName: 'おはなのせいれい',
    stages: [
      { name: 'タネポ', desc: 'つちの なかで めを だす ひを まっている たね。', look: { body: 'round', c1: '#b08d5e', c2: '#8a6a42', eyes: 'sleepy', mouth: 'w', extras: [] } },
      { name: 'メメル', desc: 'ちいさな ふたばが ぴょこんと でてきた。', look: { body: 'round', c1: '#a5c97a', c2: '#7ba84e', eyes: 'dot', mouth: 'smile', blush: true, extras: ['leaf'] } },
      { name: 'ツボミン', desc: 'さきたくて うずうずしている つぼみ。', look: { body: 'tear', c1: '#e8a0b8', c2: '#8fbf6f', eyes: 'happy', mouth: 'w', blush: true, extras: ['leaf'] } },
      { name: 'フラワナ', desc: 'まんかいの はなを さかせた もりの アイドル。', look: { body: 'star', c1: '#ef8fb5', c2: '#f7e08a', eyes: 'happy', mouth: 'smile', blush: true, extras: ['leaf', 'sparkle', 'starHalo'] } },
    ],
  },
  {
    id: 'kujipo',
    rarity: 'rare',
    lineName: 'クジラのせいれい',
    stages: [
      { name: 'クジポ', desc: 'ちいさいけど おおきな ゆめを もつ こくじら。', look: { body: 'round', c1: '#7089c9', c2: '#cfe0f5', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'クジロン', desc: 'しおを ぷしゅーっと ふきあげて あいさつする。', look: { body: 'tear', c1: '#5d77bd', c2: '#cfe0f5', eyes: 'happy', mouth: 'open', extras: ['windCheeks'] } },
      { name: 'クジラード', desc: 'ほしを のせて よぞらを およぐ でんせつの クジラ。', look: { body: 'tear', c1: '#4a64ad', c2: '#b8d2f2', eyes: 'star', mouth: 'smile', extras: ['starHalo', 'sparkle'] } },
    ],
  },
  {
    id: 'robochi',
    rarity: 'common',
    lineName: 'ことばロボ',
    stages: [
      { name: 'ロボチ', desc: 'えいごを おぼえるために つくられた ミニロボ。', look: { body: 'square', c1: '#9fb2c4', c2: '#5d7285', eyes: 'dot', mouth: 'w', extras: ['gridLines'] } },
      { name: 'ロボット', desc: 'あたらしい たんごを メモリに きろくちゅう。', look: { body: 'square', c1: '#8ba0b5', c2: '#4d6275', eyes: 'big', mouth: 'w', extras: ['gridLines', 'stripeBand'] } },
      { name: 'ロボキング', desc: 'すべての ことばを きおくした スーパーロボ。', look: { body: 'square', c1: '#75899e', c2: '#f2c33c', eyes: 'star', mouth: 'smile', extras: ['gridLines', 'stripeBand', 'crown'] } },
    ],
  },
  {
    id: 'obakechi',
    rarity: 'common',
    lineName: 'おばけのせいれい',
    stages: [
      { name: 'オバケチ', desc: 'こわがりなのに おどかす れんしゅうを している。', look: { body: 'tear', c1: '#f2f2f7', c2: '#c9c9dc', eyes: 'dot', mouth: 'open', blush: true, extras: [] } },
      { name: 'オバリン', desc: 'ふわふわ とびながら よるの もりを パトロール。', look: { body: 'tear', c1: '#e8e8f2', c2: '#b5b5cf', eyes: 'happy', mouth: 'open', extras: ['sparkle'] } },
      { name: 'オバキング', desc: 'まよなかの おしろに すむ やさしい おばけの おう。', look: { body: 'tear', c1: '#d9d9ea', c2: '#9f9fc4', eyes: 'sleepy', mouth: 'smile', extras: ['sparkle', 'crown'] } },
    ],
  },
  {
    id: 'yukipo',
    rarity: 'common',
    lineName: 'ゆきだるまのせいれい',
    stages: [
      { name: 'ユキポ', desc: 'はつゆきの ひに うまれた ちいさな ゆきだるま。', look: { body: 'round', c1: '#f7fafc', c2: '#d4e2ec', eyes: 'dot', mouth: 'smile', blush: true, extras: ['snowCap'] } },
      { name: 'ユキダルン', desc: 'マフラーを まいて ぬくぬく ごきげん。', look: { body: 'round', c1: '#eff5f9', c2: '#c4d6e2', eyes: 'happy', mouth: 'open', blush: true, extras: ['snowCap', 'scarf'] } },
      { name: 'ユキクイーン', desc: 'こなゆきを キラキラ ふらせる ふゆの じょおう。', look: { body: 'tear', c1: '#e4eef5', c2: '#a8c4d8', eyes: 'star', mouth: 'smile', extras: ['snowCap', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'kapuke',
    rarity: 'common',
    lineName: 'ケーキのせいれい',
    stages: [
      { name: 'カプケ', desc: 'あまい においの する ちいさな カップケーキ。', look: { body: 'round', c1: '#f2c9a0', c2: '#e0645f', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'ケーキン', desc: 'クリームが ふわふわの ホールケーキに せいちょう。', look: { body: 'mountain', c1: '#f7ddb8', c2: '#ef8fb5', eyes: 'happy', mouth: 'open', blush: true, extras: ['sparkle'] } },
      { name: 'ウェディンケ', desc: 'さんだんがさねの ごうかな おいわいケーキ。', look: { body: 'mountain', c1: '#fbeed8', c2: '#e58fc0', eyes: 'star', mouth: 'smile', blush: true, extras: ['sparkle', 'crown'] } },
    ],
  },
  {
    id: 'onpuchi',
    rarity: 'common',
    lineName: 'おんぷのせいれい',
    stages: [
      { name: 'オンプチ', desc: 'うたが だいすきな ちいさな おんぷ。', look: { body: 'round', c1: '#5d5d70', c2: '#f2c33c', eyes: 'dot', mouth: 'open', blush: true, extras: [] } },
      { name: 'メロディン', desc: 'たのしい メロディを くちずさんで いる。', look: { body: 'tear', c1: '#50506a', c2: '#f2c33c', eyes: 'happy', mouth: 'open', extras: ['sparkle'] } },
      { name: 'ハーモニン', desc: 'なかまと こえを あわせて ハーモニーを つくる。', look: { body: 'tear', c1: '#44445e', c2: '#e58fc0', eyes: 'happy', mouth: 'smile', extras: ['sparkle', 'rainbow'] } },
      { name: 'シンフォニア', desc: 'もり ぜんたいに ひびく だいおんがくの せいれい。', look: { body: 'star', c1: '#383852', c2: '#f7e08a', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'rainbow', 'crown'] } },
    ],
  },
  {
    id: 'chikupo',
    rarity: 'common',
    lineName: 'とけいのせいれい',
    stages: [
      { name: 'チクポ', desc: 'チクタクと じかんを きざむ みならい とけい。', look: { body: 'round', c1: '#d8c9a8', c2: '#8a6a42', eyes: 'dot', mouth: 'w', extras: ['gridLines'] } },
      { name: 'チクタック', desc: '「What time is it?」に こたえられるように なった。', look: { body: 'round', c1: '#cbb890', c2: '#75552e', eyes: 'big', mouth: 'smile', extras: ['gridLines', 'stripeBand'] } },
      { name: 'トキオウ', desc: 'ことばのもりの じかんを まもる とけいの おう。', look: { body: 'round', c1: '#bda677', c2: '#f2c33c', eyes: 'sleepy', mouth: 'smile', extras: ['gridLines', 'crown', 'sparkle'] } },
    ],
  },
  {
    id: 'fuwapo',
    rarity: 'common',
    lineName: 'ふうせんのせいれい',
    stages: [
      { name: 'フワポ', desc: 'かぜに のって ふわふわ たびを する ふうせん。', look: { body: 'round', c1: '#ef9f9f', c2: '#e0645f', eyes: 'dot', mouth: 'smile', blush: true, extras: [] } },
      { name: 'フワリン', desc: 'そらたかく のぼって もりを ながめるのが すき。', look: { body: 'round', c1: '#ea8a8a', c2: '#d15252', eyes: 'happy', mouth: 'open', blush: true, extras: ['windCheeks'] } },
      { name: 'フワルーン', desc: 'にじいろに かがやく おおきな ききゅうに なった。', look: { body: 'round', c1: '#e57575', c2: '#f2c33c', eyes: 'star', mouth: 'smile', extras: ['windCheeks', 'rainbow', 'sparkle'] } },
    ],
  },
  {
    id: 'kamepo',
    rarity: 'common',
    lineName: 'カメレオンのせいれい',
    stages: [
      { name: 'カメポ', desc: 'いろが かわる ふしぎな こカメレオン。', look: { body: 'round', c1: '#8fbf8f', c2: '#5f9a5f', eyes: 'big', mouth: 'w', blush: true, extras: ['tail'] } },
      { name: 'カメレン', desc: 'いろの えいごを ぜんぶ いえるように なった。', look: { body: 'round', c1: '#7ab3a0', c2: '#4d8a70', eyes: 'big', mouth: 'smile', extras: ['tail', 'stripeBand'] } },
      { name: 'レインボレオン', desc: 'にじの いろに ひかる カメレオンの おうさま。', look: { body: 'round', c1: '#6aa5b8', c2: '#e58fc0', eyes: 'star', mouth: 'smile', extras: ['tail', 'rainbow', 'sparkle'] } },
    ],
  },
  {
    id: 'risupo',
    rarity: 'common',
    lineName: 'リスのせいれい',
    stages: [
      { name: 'リスポ', desc: 'どんぐりと いっしょに たんごカードを あつめる。', look: { body: 'round', c1: '#c98d5e', c2: '#f5e3cc', eyes: 'dot', mouth: 'smile', blush: true, extras: ['tail'] } },
      { name: 'リスリン', desc: 'ほっぺに いっぱい ことばを つめこんでいる。', look: { body: 'round', c1: '#ba7c4a', c2: '#f5e3cc', eyes: 'happy', mouth: 'open', blush: true, extras: ['tail', 'leaf'] } },
      { name: 'リスタージュ', desc: 'もりの たからものを まもる リスの ばんにん。', look: { body: 'round', c1: '#a86a38', c2: '#f7e08a', eyes: 'big', mouth: 'smile', extras: ['tail', 'scarf', 'sparkle'] } },
    ],
  },
  {
    id: 'goropo',
    rarity: 'rare',
    lineName: 'かみなりのせいれい',
    stages: [
      { name: 'ゴロポ', desc: 'ちいさな かみなりぐもに すんでいる いたずらっこ。', look: { body: 'cloud', c1: '#b8b2cc', c2: '#f2c33c', eyes: 'dot', mouth: 'open', extras: ['windCheeks'] } },
      { name: 'ゴロリン', desc: 'ピカッと ひかって みんなを びっくりさせる。', look: { body: 'cloud', c1: '#a49dbd', c2: '#f2c33c', eyes: 'big', mouth: 'open', extras: ['windCheeks', 'rays'] } },
      { name: 'サンダロン', desc: 'そらを かけめぐる かみなりの おうじゃ。', look: { body: 'cloud', c1: '#8f87ad', c2: '#f7e08a', eyes: 'star', mouth: 'smile', extras: ['windCheeks', 'rays', 'crown'] } },
    ],
  },
  {
    id: 'uchunya',
    rarity: 'rare',
    lineName: 'うちゅうねこのせいれい',
    stages: [
      { name: 'ウチュニャ', desc: 'ながれぼしに のって もりに やってきた こねこ。', look: { body: 'round', c1: '#6c6394', c2: '#e58fc0', eyes: 'star', mouth: 'w', blush: true, extras: ['tail'] } },
      { name: 'ホシニャ', desc: 'ほしくずを あつめて くびかざりに している。', look: { body: 'round', c1: '#5d5487', c2: '#f2d06b', eyes: 'star', mouth: 'smile', extras: ['tail', 'starHalo'] } },
      { name: 'ギンガニャ', desc: 'ぎんがを さんぽする うちゅうねこの たいちょう。', look: { body: 'tear', c1: '#4e4579', c2: '#f7e6a8', eyes: 'star', mouth: 'smile', extras: ['tail', 'starHalo', 'sparkle'] } },
      { name: 'コスモニャン', desc: 'うちゅうの ことばも わかると いわれる でんせつの ねこ。', look: { body: 'star', c1: '#3f366b', c2: '#f7e6a8', eyes: 'star', mouth: 'smile', extras: ['tail', 'starHalo', 'sparkle', 'crown'] } },
    ],
  },
  {
    id: 'nijipiyo',
    rarity: 'rare',
    lineName: 'にじどりのせいれい',
    stages: [
      { name: 'ニジピヨ', desc: 'あめあがりの にじから うまれた ことり。', look: { body: 'round', c1: '#f2b8c6', c2: '#8fce6f', eyes: 'dot', mouth: 'open', blush: true, extras: ['rainbow'] } },
      { name: 'ニジバード', desc: 'とんだ あとに ちいさな にじが かかる。', look: { body: 'tear', c1: '#e89fb8', c2: '#6fb3d8', eyes: 'happy', mouth: 'open', extras: ['rainbow', 'wings'] } },
      { name: 'ニジフェニックス', desc: 'なないろの はねで そらを いろどる でんせつの とり。', look: { body: 'star', c1: '#dd86a8', c2: '#f2d06b', eyes: 'star', mouth: 'smile', extras: ['rainbow', 'wings', 'sparkle'] } },
    ],
  },
  {
    id: 'ishikoron',
    rarity: 'epic',
    lineName: 'ほうせきのせいれい',
    stages: [
      { name: 'イシコロン', desc: 'ただの いしころに 見えるけど なにかが ねむっている。', look: { body: 'round', c1: '#9a9a9a', c2: '#6f6f6f', eyes: 'sleepy', mouth: 'w', extras: ['rockBumps'] } },
      { name: 'キラリン', desc: 'みがかれて すこし ひかりはじめた。', look: { body: 'round', c1: '#a8b8c9', c2: '#7089c9', eyes: 'dot', mouth: 'smile', blush: true, extras: ['rockBumps', 'sparkle'] } },
      { name: 'ホウセキン', desc: 'あおく すきとおる ほうせきに なった。', look: { body: 'square', c1: '#7fa8d9', c2: '#4a64ad', eyes: 'big', mouth: 'smile', extras: ['sparkle'] } },
      { name: 'ジュエリオ', desc: 'いろとりどりの ほうせきを まとう きらめきの せいれい。', look: { body: 'star', c1: '#8f7fd9', c2: '#e58fc0', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'starHalo'] } },
      { name: 'ダイヤキング', desc: 'ことばのもりで いちばん かがやく ほうせきの おう。', look: { body: 'star', c1: '#b8d2f2', c2: '#f7e6a8', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'starHalo', 'crown'] } },
    ],
  },
  {
    id: 'ponipo',
    rarity: 'epic',
    lineName: 'ユニコーンのせいれい',
    stages: [
      { name: 'ポニポ', desc: 'たてがみが ふわふわの ちいさな こうま。', look: { body: 'round', c1: '#f2e2e8', c2: '#e58fc0', eyes: 'dot', mouth: 'smile', blush: true, extras: ['tail'] } },
      { name: 'ポニーナ', desc: 'はしるのが だいすきな おてんば ポニー。', look: { body: 'round', c1: '#ecd5df', c2: '#d97fb5', eyes: 'happy', mouth: 'open', blush: true, extras: ['tail', 'scarf'] } },
      { name: 'ユニコル', desc: 'ひたいに ちいさな つのが はえてきた……！', look: { body: 'tear', c1: '#e5c8d8', c2: '#c96fa8', eyes: 'big', mouth: 'smile', extras: ['tail', 'horns', 'sparkle'] } },
      { name: 'ユニコルーナ', desc: 'にじの たてがみを なびかせる でんせつの ユニコーン。', look: { body: 'tear', c1: '#dcbacf', c2: '#f2d06b', eyes: 'star', mouth: 'smile', extras: ['tail', 'horns', 'rainbow', 'starHalo'] } },
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
