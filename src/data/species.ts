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
  // レベル20/50/99の姿で使う「格が上がった」パーツ（第31回）
  | 'aura'
  | 'orbit'
  | 'bigWings'
  | 'cape'
  | 'mane'
  | 'flame'
  | 'thunder'
  | 'gem'

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
      { name: 'アップルナイト', desc: 'まっ赤な よろいを まとった りんごの きし。', look: { body: 'tear', c1: '#9c3230', c2: '#ffd98f', eyes: 'big', mouth: 'open', extras: ['leaf', 'horns', 'cape'] } },
      { name: 'ゴールデンアップル', desc: 'ひとくち かじると げんきが わいてくる 金のりんご。', look: { body: 'round', c1: '#d9a52e', c2: '#fff3c4', eyes: 'star', mouth: 'smile', extras: ['leaf', 'mane', 'gem', 'aura'] } },
      { name: 'アップルツリーキング', desc: '1本の 木から 世界じゅうに りんごを おくったという。', look: { body: 'mountain', c1: '#7fbf5a', c2: '#ffd05a', eyes: 'sleepy', mouth: 'smile', extras: ['branch', 'leaf', 'orbit', 'rays', 'bigWings', 'gem'] } },
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
      { name: 'ワンガード', desc: 'まもると きめたら ぜったいに はなれない。', look: { body: 'square', c1: '#96632c', c2: '#f7eed6', eyes: 'dot', mouth: 'w', extras: ['tail', 'scarf', 'cape'] } },
      { name: 'ハウリンウルフ', desc: 'とおくの なかまにも とどく こえで よびかける。', look: { body: 'mountain', c1: '#7a5124', c2: '#e8dcc0', eyes: 'star', mouth: 'smile', extras: ['tail', 'mane', 'gem', 'horns'] } },
      { name: 'ムーンハウラー', desc: 'まんげつの ばん、この こが ほえると かぜが やむ。', look: { body: 'star', c1: '#f0dcb0', c2: '#a8b8ff', eyes: 'star', mouth: 'open', extras: ['tail', 'orbit', 'thunder', 'bigWings', 'gem', 'starHalo'] } },
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
      { name: 'ニャイト', desc: 'しっぽを けんの ように かまえる こねこの きし。', look: { body: 'tear', c1: '#5f5f5f', c2: '#f0f0f0', eyes: 'happy', mouth: 'w', extras: ['tail', 'horns', 'cape'] } },
      { name: 'キャットプリンセス', desc: 'ねている あいだも きちんと ポーズを きめている。', look: { body: 'tall', c1: '#8a8a9c', c2: '#ffe0ea', eyes: 'star', mouth: 'smile', extras: ['tail', 'mane', 'gem', 'sparkle'] } },
      { name: 'シャドウキャット', desc: 'かげから かげへ とぶ。だれも つかまえられない。', look: { body: 'star', c1: '#3a3a4a', c2: '#c9b8ff', eyes: 'sleepy', mouth: 'smile', extras: ['tail', 'orbit', 'aura', 'bigWings', 'gem'] } },
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
      { name: 'サンバーン', desc: 'からだの まわりで ほのおが ぱちぱち はねる。', look: { body: 'star', c1: '#d18b12', c2: '#ffd98f', eyes: 'big', mouth: 'open', extras: ['rays', 'flame', 'horns'] } },
      { name: 'サンキング', desc: 'この こが いる ところは 一年じゅう はれ。', look: { body: 'round', c1: '#c07a08', c2: '#ffe6b0', eyes: 'star', mouth: 'smile', extras: ['rays', 'flame', 'mane', 'gem'] } },
      { name: 'ドーンライト', desc: 'あさが くるのは、この こが 目を さますからだという。', look: { body: 'star', c1: '#ffd35c', c2: '#fff6dd', eyes: 'star', mouth: 'smile', extras: ['rays', 'orbit', 'flame', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'ストーリーナイト', desc: 'ページを たてに して たてに する。', look: { body: 'square', c1: '#2c4f7c', c2: '#f2d06b', eyes: 'dot', mouth: 'w', extras: ['foldCorner', 'horns', 'cape'] } },
      { name: 'ライブラリアン', desc: 'よんだ 本の ことばを ぜんぶ おぼえている。', look: { body: 'tall', c1: '#24406a', c2: '#d8e8ff', eyes: 'sleepy', mouth: 'smile', extras: ['foldCorner', 'gridLines', 'mane', 'gem'] } },
      { name: 'エンドレスストーリー', desc: 'ひらくたびに ちがう おはなしが はじまる 本。', look: { body: 'cloud', c1: '#7fb0e0', c2: '#fff6dd', eyes: 'sleepy', mouth: 'open', extras: ['foldCorner', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'インクランサー', desc: 'インクの やりで まっすぐな せんを つらぬく。', look: { body: 'tall', c1: '#a86408', c2: '#3a3a4a', eyes: 'big', mouth: 'w', extras: ['stripeBand', 'horns', 'cape'] } },
      { name: 'カリグラファー', desc: 'どんな 字も うつくしく かいてしまう。', look: { body: 'square', c1: '#8f5406', c2: '#f7e6c0', eyes: 'star', mouth: 'smile', extras: ['stripeBand', 'inkDrop', 'mane', 'gem'] } },
      { name: 'ワードスミス', desc: 'ことばを きたえて、あたらしい ことばを つくる。', look: { body: 'star', c1: '#ffbe5c', c2: '#fff0d0', eyes: 'star', mouth: 'open', extras: ['stripeBand', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'レインクラウド', desc: 'おなかが いっぱいに なると あめを ふらせる。', look: { body: 'cloud', c1: '#b8c6d2', c2: '#7f96aa', eyes: 'sleepy', mouth: 'w', extras: ['windCheeks', 'thunder', 'cape'] } },
      { name: 'ストームブリンガー', desc: 'あらしを つれてくる。おこると ほんとうに こわい。', look: { body: 'mountain', c1: '#9fb0c0', c2: '#5f7a90', eyes: 'big', mouth: 'smile', extras: ['windCheeks', 'thunder', 'mane', 'gem'] } },
      { name: 'スカイオーシャン', desc: 'そらぜんたいが この こ。うみのように ひろい。', look: { body: 'cloud', c1: '#eaf4fb', c2: '#a8d8f0', eyes: 'sleepy', mouth: 'smile', extras: ['windCheeks', 'orbit', 'rays', 'bigWings', 'gem', 'rainbow'] } },
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
      { name: 'シューティングスター', desc: 'ねがいごとを のせて いっきに かけぬける。', look: { body: 'tear', c1: '#d0a028', c2: '#fff3c4', eyes: 'big', mouth: 'open', extras: ['starHalo', 'wings', 'thunder'] } },
      { name: 'コンステレーション', desc: 'ほしを つないで えを かくのが とくい。', look: { body: 'round', c1: '#c69820', c2: '#ffeeb0', eyes: 'star', mouth: 'smile', extras: ['starHalo', 'aura', 'gem', 'cape'] } },
      { name: 'ギャラクシーコア', desc: 'ぎんがの まんなかで しずかに ひかっている。', look: { body: 'star', c1: '#ffe98a', c2: '#ffffff', eyes: 'star', mouth: 'open', extras: ['starHalo', 'orbit', 'bigWings', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'ハーフムーン', desc: 'はんぶんだけ すがたを 見せる、はずかしがりや。', look: { body: 'tear', c1: '#8d86c4', c2: '#5a51a0', eyes: 'sleepy', mouth: 'smile', extras: ['crescent', 'cape', 'starHalo'] } },
      { name: 'ムーンダンサー', desc: 'しおの みちひきに あわせて おどる。', look: { body: 'tall', c1: '#7a72b0', c2: '#c6bdff', eyes: 'star', mouth: 'w', extras: ['crescent', 'aura', 'gem', 'mane'] } },
      { name: 'エターナルナイト', desc: 'よるが しずかなのは、この こが 見はっているから。', look: { body: 'star', c1: '#ded8ff', c2: '#ffffff', eyes: 'sleepy', mouth: 'smile', extras: ['crescent', 'orbit', 'starHalo', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'クラウドドラゴン', desc: 'くもの 中に かくれて、しっぽだけ 見えている。', look: { body: 'cloud', c1: '#2f7a5c', c2: '#f7ecc4', eyes: 'dot', mouth: 'w', extras: ['horns', 'wings', 'windCheeks'] } },
      { name: 'ワードドラゴン', desc: 'ひとこと ほえると、そらに 英語が うかぶ。', look: { body: 'tall', c1: '#256a4e', c2: '#fdf0c0', eyes: 'star', mouth: 'smile', extras: ['horns', 'bigWings', 'gem', 'thunder'] } },
      { name: 'エンシェントドラゴン', desc: 'ことばが うまれた ころから 生きているという。', look: { body: 'star', c1: '#7fe0b0', c2: '#fffbe8', eyes: 'star', mouth: 'open', extras: ['horns', 'orbit', 'bigWings', 'gem', 'rays', 'flame', 'sparkle'] } },
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
      { name: 'ナイトウォッチ', desc: 'よるの もりを ひとりで 見はっている。', look: { body: 'square', c1: '#64523a', c2: '#f5eee0', eyes: 'dot', mouth: 'w', extras: ['branch', 'horns', 'cape'] } },
      { name: 'ワイズオウル', desc: 'きかれた ことには なんでも こたえてくれる。', look: { body: 'tall', c1: '#52422e', c2: '#e8dcc0', eyes: 'sleepy', mouth: 'smile', extras: ['branch', 'mane', 'gem', 'gridLines'] } },
      { name: 'グレートオウル', desc: 'しっている ことばの かずは だれにも わからない。', look: { body: 'star', c1: '#d8c4a0', c2: '#fff3d8', eyes: 'sleepy', mouth: 'open', extras: ['branch', 'orbit', 'bigWings', 'gem', 'rays', 'starHalo'] } },
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
      { name: 'フォックスシャドウ', desc: '音を 立てずに かげの 中を すすむ。', look: { body: 'tear', c1: '#a85a1c', c2: '#ffe9c4', eyes: 'happy', mouth: 'w', extras: ['tail', 'horns', 'cape'] } },
      { name: 'ナインテイル', desc: 'しっぽが ふえるたびに かしこく なるらしい。', look: { body: 'cloud', c1: '#8f4c16', c2: '#ffd9a0', eyes: 'star', mouth: 'smile', extras: ['tail', 'mane', 'gem', 'aura'] } },
      { name: 'フォックスフレイム', desc: 'とおった あとに あおい ひが のこる。', look: { body: 'star', c1: '#ff9a4a', c2: '#fff0d0', eyes: 'star', mouth: 'open', extras: ['tail', 'orbit', 'flame', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'アイスガード', desc: 'こおりの たてで なかまを まもる。', look: { body: 'square', c1: '#232c3a', c2: '#f0f6ff', eyes: 'dot', mouth: 'w', extras: ['scarf', 'snowCap', 'cape'] } },
      { name: 'エンペラーペンギン', desc: 'こおりの 上で いちばん せなかが 大きい。', look: { body: 'mountain', c1: '#1b2330', c2: '#d8ecff', eyes: 'star', mouth: 'smile', extras: ['scarf', 'snowCap', 'mane', 'gem'] } },
      { name: 'オーロラペンギン', desc: 'せなかに きたの そらの ひかりを せおっている。', look: { body: 'star', c1: '#8fb8e0', c2: '#ffffff', eyes: 'star', mouth: 'open', extras: ['snowCap', 'orbit', 'rainbow', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'ウェーブライダー', desc: 'なみの てっぺんを すべって すすむ。', look: { body: 'tear', c1: '#35789f', c2: '#d4ecf9', eyes: 'big', mouth: 'open', extras: ['tail', 'windCheeks', 'cape'] } },
      { name: 'ブルーガーディアン', desc: 'まいごの 船を みなとまで おくりとどける。', look: { body: 'cloud', c1: '#2a6285', c2: '#9fe0ff', eyes: 'happy', mouth: 'smile', extras: ['tail', 'aura', 'gem', 'mane'] } },
      { name: 'オーシャンソング', desc: 'うたが うみの そこまで とどくという。', look: { body: 'star', c1: '#6fc6f0', c2: '#ffffff', eyes: 'sleepy', mouth: 'open', extras: ['tail', 'orbit', 'bigWings', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'フラワーウィング', desc: 'とまった はなを かならず さかせる。', look: { body: 'tear', c1: '#cc74a8', c2: '#ffe0ea', eyes: 'happy', mouth: 'w', extras: ['wings', 'leaf', 'cape'] } },
      { name: 'シルクモナーク', desc: 'きぬの ような はねで しずかに まう。', look: { body: 'tall', c1: '#b25e90', c2: '#ffd9e8', eyes: 'star', mouth: 'smile', extras: ['bigWings', 'mane', 'gem', 'sparkle'] } },
      { name: 'レインボーウィング', desc: 'はねを ひろげると 七いろの 風が おきる。', look: { body: 'star', c1: '#ffb0d8', c2: '#fff6f9', eyes: 'happy', mouth: 'open', extras: ['bigWings', 'orbit', 'rainbow', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'ジャンプナイト', desc: 'たかく とんで、たかく とんで、また とぶ。', look: { body: 'square', c1: '#52906e', c2: '#c9e8b8', eyes: 'big', mouth: 'w', extras: ['leaf', 'horns', 'cape'] } },
      { name: 'ポンドキング', desc: 'いけの ぬしとして みんなに したわれている。', look: { body: 'cloud', c1: '#3f7a58', c2: '#a8dcc0', eyes: 'star', mouth: 'smile', extras: ['leaf', 'mane', 'gem', 'aura'] } },
      { name: 'レインコーラー', desc: 'この こが なくと、つぎの日は かならず あめ。', look: { body: 'star', c1: '#8fe0b0', c2: '#fff6dd', eyes: 'sleepy', mouth: 'open', extras: ['leaf', 'orbit', 'thunder', 'bigWings', 'gem'] } },
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
      { name: 'スカイチック', desc: 'はじめて そらの てっぺんまで とんだ。', look: { body: 'tear', c1: '#c46f2a', c2: '#f2c33c', eyes: 'big', mouth: 'open', extras: ['wings', 'windCheeks', 'cape'] } },
      { name: 'フェニックスウィング', desc: 'はねが ほのおの ように あかく もえる。', look: { body: 'tall', c1: '#a85a1c', c2: '#ffd98f', eyes: 'star', mouth: 'smile', extras: ['bigWings', 'flame', 'gem', 'mane'] } },
      { name: 'リバースフェニックス', desc: 'なんど おちても、また あたらしく とびたつ。', look: { body: 'star', c1: '#ffb45c', c2: '#fff0d0', eyes: 'star', mouth: 'open', extras: ['bigWings', 'orbit', 'flame', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'ガーデンプリンセス', desc: 'この こが とおると のはらが 花畑に なる。', look: { body: 'cloud', c1: '#e07aa0', c2: '#fff0f4', eyes: 'star', mouth: 'smile', extras: ['leaf', 'bigWings', 'gem', 'aura'] } },
      { name: 'エターナルブルーム', desc: 'けっして かれない 花。ずっと はるの においが する。', look: { body: 'star', c1: '#ffb0c8', c2: '#fff6f9', eyes: 'happy', mouth: 'open', extras: ['leaf', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'ディープダイバー', desc: 'だれも いけない ふかさまで もぐれる。', look: { body: 'mountain', c1: '#3a5090', c2: '#b8d2f2', eyes: 'sleepy', mouth: 'w', extras: ['tail', 'rockBumps', 'cape'] } },
      { name: 'シーガーディアン', desc: 'うみの いきものを まとめて まもっている。', look: { body: 'cloud', c1: '#2e4076', c2: '#9fe0ff', eyes: 'star', mouth: 'smile', extras: ['tail', 'mane', 'gem', 'aura'] } },
      { name: 'スカイホエール', desc: 'そらを うみの ように およぐ、大きな かげ。', look: { body: 'star', c1: '#8fc4f0', c2: '#ffffff', eyes: 'sleepy', mouth: 'open', extras: ['tail', 'orbit', 'bigWings', 'gem', 'starHalo', 'sparkle'] } },
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
      { name: 'バトルロボ', desc: 'うでを つけかえて どんな しごとも こなす。', look: { body: 'square', c1: '#5f7284', c2: '#f2c33c', eyes: 'dot', mouth: 'w', extras: ['gridLines', 'horns', 'cape'] } },
      { name: 'メカマスター', desc: 'こわれた きかいを 一しゅんで なおす。', look: { body: 'tall', c1: '#4c5c6c', c2: '#d8e8ff', eyes: 'star', mouth: 'smile', extras: ['gridLines', 'mane', 'gem', 'thunder'] } },
      { name: 'オメガロボ', desc: 'しっている 英単語の かずは 100まん語だという。', look: { body: 'star', c1: '#b8ccdd', c2: '#ffe25c', eyes: 'dot', mouth: 'open', extras: ['gridLines', 'orbit', 'thunder', 'bigWings', 'gem'] } },
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
      { name: 'ゴーストナイト', desc: 'こわがりだけど、なかまの ために まえに 出る。', look: { body: 'tear', c1: '#c4c4d8', c2: '#8a8ab0', eyes: 'big', mouth: 'w', extras: ['sparkle', 'horns', 'cape'] } },
      { name: 'ミッドナイトゴースト', desc: '12時に なると いちばん 元気に なる。', look: { body: 'cloud', c1: '#b0b0c8', c2: '#6f6f9c', eyes: 'happy', mouth: 'smile', extras: ['sparkle', 'mane', 'gem', 'aura'] } },
      { name: 'ファントムキング', desc: 'かべも 空も すりぬける。つかまえた人は いない。', look: { body: 'star', c1: '#eaeaff', c2: '#b9a8ff', eyes: 'sleepy', mouth: 'open', extras: ['sparkle', 'orbit', 'aura', 'bigWings', 'gem'] } },
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
      { name: 'スノーガード', desc: 'ふぶきの 中でも びくとも しない。', look: { body: 'square', c1: '#cddeea', c2: '#8fb0c8', eyes: 'big', mouth: 'w', extras: ['snowCap', 'scarf', 'cape'] } },
      { name: 'ブリザードダンサー', desc: 'まうたびに けっしょうが ちがう かたちに なる。', look: { body: 'tall', c1: '#f0f8ff', c2: '#9cc4e0', eyes: 'star', mouth: 'smile', extras: ['snowCap', 'bigWings', 'gem', 'sparkle'] } },
      { name: 'ホワイトウィンター', desc: 'ふゆを つれてくる。まちが 一ばんで まっしろに なる。', look: { body: 'star', c1: '#ffffff', c2: '#a8dcff', eyes: 'star', mouth: 'open', extras: ['snowCap', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'スイーツナイト', desc: 'クリームの よろいで あまく まもる。', look: { body: 'square', c1: '#f0dcc0', c2: '#d9709c', eyes: 'happy', mouth: 'w', extras: ['sparkle', 'horns', 'cape'] } },
      { name: 'パティシエール', desc: '見た人が かならず わらう ケーキを つくる。', look: { body: 'tall', c1: '#ffe8d0', c2: '#ff9ec0', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'mane', 'gem', 'rainbow'] } },
      { name: 'ドリームパティスリー', desc: 'ゆめの 中でしか 食べられない ケーキが ならぶ。', look: { body: 'star', c1: '#fff0e0', c2: '#ffb0d8', eyes: 'happy', mouth: 'open', extras: ['sparkle', 'orbit', 'rainbow', 'bigWings', 'gem'] } },
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
      { name: 'マエストロ', desc: '手を ふるだけで まわりの 音が そろう。', look: { body: 'tall', c1: '#2c2c42', c2: '#ffe6a8', eyes: 'star', mouth: 'smile', extras: ['sparkle', 'rainbow', 'mane', 'gem'] } },
      { name: 'グランドオーケストラ', desc: 'この こ ひとりで 100人ぶんの 音を ならす。', look: { body: 'star', c1: '#6f6fa0', c2: '#fff3c4', eyes: 'star', mouth: 'open', extras: ['sparkle', 'rainbow', 'orbit', 'rays', 'bigWings', 'gem'] } },
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
      { name: 'タイムナイト', desc: 'はりを かたなの ように かまえている。', look: { body: 'square', c1: '#a08c5f', c2: '#f2c33c', eyes: 'dot', mouth: 'w', extras: ['gridLines', 'horns', 'cape'] } },
      { name: 'アワーキーパー', desc: 'たいせつな 1時間を そっと とっておいてくれる。', look: { body: 'tear', c1: '#8a7850', c2: '#ffe6b0', eyes: 'sleepy', mouth: 'smile', extras: ['gridLines', 'mane', 'gem', 'aura'] } },
      { name: 'タイムレスクロック', desc: 'はじまりから いままで、一どだけ とまった ことが ある。', look: { body: 'round', c1: '#fff3d0', c2: '#e07a7a', eyes: 'sleepy', mouth: 'open', extras: ['gridLines', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'スカイバルーン', desc: 'どこまでも たかく のぼっていく。', look: { body: 'round', c1: '#cc5e5e', c2: '#f2c33c', eyes: 'big', mouth: 'open', extras: ['windCheeks', 'rainbow', 'cape'] } },
      { name: 'フェスティバル', desc: 'この こが 来ると、まちが おまつりに なる。', look: { body: 'cloud', c1: '#b84f4f', c2: '#ffd9a0', eyes: 'star', mouth: 'smile', extras: ['windCheeks', 'rainbow', 'mane', 'gem'] } },
      { name: 'ワールドツアー', desc: 'せかいじゅうの そらを ひとまわり したらしい。', look: { body: 'star', c1: '#ff9a9a', c2: '#fff0d0', eyes: 'happy', mouth: 'open', extras: ['windCheeks', 'rainbow', 'orbit', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'カラーチェンジャー', desc: '気もちに あわせて 色が どんどん かわる。', look: { body: 'tear', c1: '#578e9f', c2: '#e58fc0', eyes: 'happy', mouth: 'w', extras: ['tail', 'rainbow', 'cape'] } },
      { name: 'プリズムレオン', desc: '光を 七つに わけて まわりに まく。', look: { body: 'square', c1: '#46788a', c2: '#ffd9e8', eyes: 'star', mouth: 'smile', extras: ['tail', 'rainbow', 'mane', 'gem'] } },
      { name: 'スペクトラレオン', desc: 'まだ だれも 見たことのない 色を もっている。', look: { body: 'star', c1: '#8fdcf0', c2: '#ffb0d8', eyes: 'star', mouth: 'open', extras: ['tail', 'rainbow', 'orbit', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'フォレストスカウト', desc: 'もりの 道を ぜんぶ おぼえている。', look: { body: 'tear', c1: '#8f5828', c2: '#f7e08a', eyes: 'big', mouth: 'w', extras: ['tail', 'leaf', 'cape'] } },
      { name: 'ツリーキーパー', desc: '木の みを うめて、あたらしい もりを つくる。', look: { body: 'mountain', c1: '#74471e', c2: '#c9e8b8', eyes: 'star', mouth: 'smile', extras: ['tail', 'branch', 'mane', 'gem'] } },
      { name: 'グレートフォレスト', desc: 'この こが うめた みが、いまの 大もりに なった。', look: { body: 'cloud', c1: '#7fc06a', c2: '#ffe08a', eyes: 'sleepy', mouth: 'open', extras: ['branch', 'leaf', 'orbit', 'rays', 'bigWings', 'gem'] } },
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
      { name: 'ボルトチャージ', desc: 'つのの あいだで いなずまが ぱちぱち はねる。', look: { body: 'round', c1: '#7a72a0', c2: '#ffd25c', eyes: 'big', mouth: 'open', extras: ['thunder', 'horns', 'cape'] } },
      { name: 'サンダーロード', desc: 'とおくで ごろごろ いうのは この こが わらう音。', look: { body: 'tall', c1: '#6a5f96', c2: '#ffe25c', eyes: 'star', mouth: 'w', extras: ['thunder', 'mane', 'gem', 'rays'] } },
      { name: 'ライトニングエンペラー', desc: 'ひとふりで そらが まっしろに ひかる。', look: { body: 'star', c1: '#ffe25c', c2: '#b9a8ff', eyes: 'star', mouth: 'open', extras: ['thunder', 'orbit', 'bigWings', 'gem', 'rays', 'sparkle'] } },
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
      { name: 'ネビュラキャット', desc: 'ほしの ちりを まとって ごろごろ のどを ならす。', look: { body: 'cloud', c1: '#322b58', c2: '#c6bdff', eyes: 'star', mouth: 'smile', extras: ['tail', 'starHalo', 'mane', 'gem'] } },
      { name: 'ユニバースキャット', desc: 'うちゅうを ひとまたぎ。しっぽが ぎんがに なる。', look: { body: 'star', c1: '#8f7fd8', c2: '#fff3c4', eyes: 'star', mouth: 'open', extras: ['tail', 'starHalo', 'orbit', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'プリズムバード', desc: 'はねの 一まい一まいが ちがう 色。', look: { body: 'tear', c1: '#c4708f', c2: '#f2d06b', eyes: 'happy', mouth: 'w', extras: ['rainbow', 'wings', 'cape'] } },
      { name: 'レインボーソング', desc: 'うたうと そらに にじが かかる。', look: { body: 'tall', c1: '#b05f7c', c2: '#ffd9e8', eyes: 'star', mouth: 'smile', extras: ['rainbow', 'bigWings', 'gem', 'aura'] } },
      { name: 'スカイレインボー', desc: 'あめあがりの にじは この こが とんだ あとだという。', look: { body: 'star', c1: '#ffb0d8', c2: '#fff6f9', eyes: 'happy', mouth: 'open', extras: ['rainbow', 'orbit', 'rays', 'bigWings', 'gem', 'sparkle'] } },
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
      { name: 'クラウンジュエル', desc: '王かんの まんなかに はまる、たった一つの 石。', look: { body: 'star', c1: '#dceaff', c2: '#ffe25c', eyes: 'star', mouth: 'open', extras: ['sparkle', 'starHalo', 'orbit', 'rays', 'bigWings', 'gem'] } },
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
      { name: 'スターユニコーン', desc: 'つのの 先に 小さな ほしが ともっている。', look: { body: 'tall', c1: '#c9a0bd', c2: '#fff0d0', eyes: 'star', mouth: 'smile', extras: ['horns', 'bigWings', 'gem', 'starHalo'] } },
      { name: 'セレスティアユニコーン', desc: 'よぞらを かけると、そこが あたらしい 星座に なる。', look: { body: 'star', c1: '#f0dcff', c2: '#ffe98a', eyes: 'star', mouth: 'open', extras: ['horns', 'orbit', 'rainbow', 'bigWings', 'gem', 'sparkle'] } },
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
