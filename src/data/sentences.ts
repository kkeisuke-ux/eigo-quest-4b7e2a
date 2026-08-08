// 短い英文の例文データ（LEVEL 5-6。仕様 §27-§28 + 2026-08-08 第5回フィードバック）。
// 絵日記の「れいぶんを さがす」で、日本語の言いたいことから例文を提案する。
// オフライン・追加料金なしで動く（外部AIは使わない。README参照）。

export interface SentenceItem {
  id: string
  en: string
  ja: string
  /** 使っている収録単語のid */
  usesWords: string[]
  /** 検索用の日本語キーワード（ja以外の言い方） */
  keywords: string[]
}

export const SENTENCES: SentenceItem[] = [
  // すきなもの
  { id: 's-like-soccer', en: 'I like soccer.', ja: 'わたしはサッカーがすきです。', usesWords: ['i', 'like', 'soccer'], keywords: ['すき', '好き', 'サッカー', 'スポーツ'] },
  { id: 's-like-apples', en: 'I like apples.', ja: 'わたしはりんごがすきです。', usesWords: ['i', 'like', 'apple'], keywords: ['すき', '好き', 'りんご', 'くだもの', 'たべもの'] },
  { id: 's-like-dogs', en: 'I like dogs.', ja: 'わたしはいぬがすきです。', usesWords: ['i', 'like', 'dog'], keywords: ['すき', '好き', 'いぬ', 'どうぶつ'] },
  { id: 's-fav-color', en: 'My favorite color is blue.', ja: 'わたしのすきないろはあおです。', usesWords: ['blue'], keywords: ['すき', 'いろ', '色', 'あお'] },
  // もっているもの・かぞく
  { id: 's-have-dog', en: 'I have a dog.', ja: 'わたしはいぬをかっています。', usesWords: ['i', 'dog'], keywords: ['かっている', 'ペット', 'いぬ', 'いる'] },
  { id: 's-have-cat', en: 'I have a cat.', ja: 'わたしはねこをかっています。', usesWords: ['i', 'cat'], keywords: ['かっている', 'ペット', 'ねこ', 'いる'] },
  { id: 's-have-brother', en: 'I have a brother.', ja: 'わたしにはおとうとがいます。', usesWords: ['i'], keywords: ['きょうだい', 'おとうと', 'おにいちゃん', '兄', '弟', 'いる'] },
  // きもち・ようす
  { id: 's-am-happy', en: 'I am happy.', ja: 'わたしはうれしいです。', usesWords: ['i', 'happy'], keywords: ['うれしい', 'しあわせ', 'きもち'] },
  { id: 's-am-hungry', en: 'I am hungry.', ja: 'おなかがすきました。', usesWords: ['i', 'hungry'], keywords: ['おなか', 'すいた', 'はらぺこ'] },
  { id: 's-am-sleepy', en: 'I am sleepy.', ja: 'ねむいです。', usesWords: ['i', 'sleepy'], keywords: ['ねむい', 'ねる', 'つかれた'] },
  { id: 's-was-fun', en: 'It was fun.', ja: 'たのしかったです。', usesWords: [], keywords: ['たのしい', 'たのしかった', '楽しかった'] },
  { id: 's-was-delicious', en: 'It was delicious.', ja: 'おいしかったです。', usesWords: [], keywords: ['おいしい', 'おいしかった', 'たべもの', 'ごはん'] },
  { id: 's-was-hot', en: 'It was very hot today.', ja: 'きょうはとてもあつかったです。', usesWords: ['hot', 'today'], keywords: ['あつい', 'あつかった', 'てんき', 'なつ'] },
  // てんき
  { id: 's-it-sunny', en: 'It is sunny today.', ja: 'きょうは はれです。', usesWords: ['sunny', 'today'], keywords: ['はれ', 'てんき', 'きょう'] },
  { id: 's-it-rainy', en: 'It was rainy today.', ja: 'きょうは あめでした。', usesWords: ['rainy', 'today'], keywords: ['あめ', '雨', 'てんき'] },
  // いったところ
  { id: 's-went-park', en: 'I went to the park.', ja: 'わたしはこうえんにいきました。', usesWords: ['i', 'go', 'park'], keywords: ['いった', '行った', 'こうえん', 'でかけた', 'あそんだ'] },
  { id: 's-went-zoo', en: 'I went to the zoo.', ja: 'わたしはどうぶつえんにいきました。', usesWords: ['i', 'go', 'zoo'], keywords: ['いった', 'どうぶつえん', 'どうぶつ', 'でかけた'] },
  { id: 's-went-pool', en: 'I went to the pool.', ja: 'プールにいきました。', usesWords: ['i', 'go'], keywords: ['いった', 'プール', 'およいだ', 'なつやすみ'] },
  { id: 's-went-sea', en: 'I went to the sea.', ja: 'うみにいきました。', usesWords: ['i', 'go'], keywords: ['いった', 'うみ', '海', 'なつやすみ', 'でかけた'] },
  { id: 's-went-grandma', en: 'I visited my grandma.', ja: 'おばあちゃんのいえにいきました。', usesWords: ['i'], keywords: ['おばあちゃん', 'おじいちゃん', 'いった', 'あそびにいった'] },
  { id: 's-went-shopping', en: 'I went shopping with my mother.', ja: 'おかあさんとかいものにいきました。', usesWords: ['i', 'go', 'mother'], keywords: ['かいもの', '買い物', 'おかあさん', 'いった'] },
  // したこと（あそび・スポーツ）
  { id: 's-play-tennis', en: 'I play tennis.', ja: 'わたしはテニスをします。', usesWords: ['i', 'play', 'tennis'], keywords: ['テニス', 'スポーツ', 'する'] },
  { id: 's-played-soccer', en: 'I played soccer with my friends.', ja: 'ともだちとサッカーをしました。', usesWords: ['i', 'play', 'soccer', 'friend'], keywords: ['サッカー', 'した', 'ともだち', 'あそんだ'] },
  { id: 's-played-games', en: 'I played games.', ja: 'ゲームをしました。', usesWords: ['i', 'play'], keywords: ['ゲーム', 'あそんだ', 'した'] },
  { id: 's-watched-tv', en: 'I watched TV.', ja: 'テレビをみました。', usesWords: ['i', 'see'], keywords: ['テレビ', 'みた', '見た', 'アニメ'] },
  { id: 's-watched-movie', en: 'I watched a movie.', ja: 'えいがをみました。', usesWords: ['i', 'see'], keywords: ['えいが', '映画', 'みた'] },
  { id: 's-read-book', en: 'I read a book.', ja: 'ほんをよみました。', usesWords: ['i', 'book'], keywords: ['ほん', '本', 'よんだ', '読んだ'] },
  { id: 's-swam', en: 'I swam in the pool.', ja: 'プールでおよぎました。', usesWords: ['i', 'swimming'], keywords: ['およいだ', '泳いだ', 'プール', 'すいえい'] },
  { id: 's-rode-bike', en: 'I rode my bike.', ja: 'じてんしゃにのりました。', usesWords: ['i', 'bike'], keywords: ['じてんしゃ', '自転車', 'のった', 'サイクリング'] },
  { id: 's-drew-picture', en: 'I drew a picture.', ja: 'えをかきました。', usesWords: ['i'], keywords: ['え', '絵', 'かいた', 'おえかき'] },
  { id: 's-made-cake', en: 'I made a cake with my mother.', ja: 'おかあさんとケーキをつくりました。', usesWords: ['i', 'mother'], keywords: ['ケーキ', 'つくった', '作った', 'おかし', 'りょうり'] },
  { id: 's-studied', en: 'I studied English.', ja: 'えいごをべんきょうしました。', usesWords: ['i'], keywords: ['べんきょう', '勉強', 'えいご', 'しゅくだい'] },
  // たべたもの
  { id: 's-ate-icecream', en: 'I ate ice cream.', ja: 'アイスクリームをたべました。', usesWords: ['i', 'eat'], keywords: ['アイス', 'たべた', '食べた', 'おやつ'] },
  { id: 's-ate-sushi', en: 'I ate sushi.', ja: 'おすしをたべました。', usesWords: ['i', 'eat'], keywords: ['すし', 'おすし', 'たべた', 'ばんごはん'] },
  { id: 's-ate-pizza', en: 'I ate pizza for dinner.', ja: 'ばんごはんにピザをたべました。', usesWords: ['i', 'eat'], keywords: ['ピザ', 'たべた', 'ばんごはん', 'ゆうしょく'] },
  { id: 's-drink-milk', en: 'I drink milk every morning.', ja: 'わたしはまいあさ ぎゅうにゅうをのみます。', usesWords: ['i', 'drink', 'milk', 'morning'], keywords: ['ぎゅうにゅう', 'のむ', 'あさ', 'まいあさ'] },
  // がっこう・ともだち
  { id: 's-school-fun', en: 'School was fun today.', ja: 'きょうのがっこうはたのしかったです。', usesWords: ['school', 'today'], keywords: ['がっこう', '学校', 'たのしかった', 'じゅぎょう'] },
  { id: 's-met-friend', en: 'I met my friend.', ja: 'ともだちにあいました。', usesWords: ['i', 'friend'], keywords: ['ともだち', '友だち', 'あった', 'あそんだ'] },
  // あした・これから
  { id: 's-tomorrow-park', en: 'I will go to the park tomorrow.', ja: 'あしたこうえんにいきます。', usesWords: ['i', 'go', 'park', 'tomorrow'], keywords: ['あした', '明日', 'よてい', 'いく'] },
  { id: 's-tomorrow-fun', en: 'Tomorrow will be fun.', ja: 'あしたがたのしみです。', usesWords: ['tomorrow'], keywords: ['あした', 'たのしみ', 'わくわく', 'よてい'] },
  { id: 's-want-dog', en: 'I want a dog.', ja: 'いぬがほしいです。', usesWords: ['i', 'dog'], keywords: ['ほしい', '欲しい', 'いぬ', 'ペット'] },
  { id: 's-want-play', en: 'I want to play with my friends.', ja: 'ともだちとあそびたいです。', usesWords: ['i', 'play', 'friend'], keywords: ['あそびたい', 'ともだち', 'したい'] },
  // 学校・行事
  { id: 's-pe-class', en: 'I had P.E. class today.', ja: 'きょうはたいいくがありました。', usesWords: ['today'], keywords: ['たいいく', '体育', 'じゅぎょう', 'がっこう'] },
  { id: 's-lunch-good', en: 'School lunch was good.', ja: 'きゅうしょくがおいしかったです。', usesWords: ['school'], keywords: ['きゅうしょく', '給食', 'おいしい', 'ひるごはん'] },
  { id: 's-test', en: 'I had a test today.', ja: 'きょうはテストがありました。', usesWords: ['today'], keywords: ['テスト', 'しけん', 'がっこう', 'べんきょう'] },
  { id: 's-homework', en: 'I did my homework.', ja: 'しゅくだいをしました。', usesWords: ['i'], keywords: ['しゅくだい', '宿題', 'べんきょう', 'した'] },
  { id: 's-sports-day', en: 'We had a sports day.', ja: 'うんどうかいがありました。', usesWords: [], keywords: ['うんどうかい', '運動会', 'かけっこ', 'ぎょうじ'] },
  { id: 's-ran-fast', en: 'I ran very fast.', ja: 'とてもはやくはしりました。', usesWords: ['i', 'run'], keywords: ['はしった', '走った', 'かけっこ', 'はやい'] },
  { id: 's-won', en: 'We won the game.', ja: 'しあいにかちました。', usesWords: [], keywords: ['かった', '勝った', 'しあい', 'ゲーム', 'やった'] },
  { id: 's-lost', en: 'We lost the game, but it was fun.', ja: 'しあいにまけたけど、たのしかったです。', usesWords: [], keywords: ['まけた', '負けた', 'しあい', 'くやしい'] },
  // ならいごと・練習
  { id: 's-piano', en: 'I practiced the piano.', ja: 'ピアノのれんしゅうをしました。', usesWords: ['i'], keywords: ['ピアノ', 'れんしゅう', 'ならいごと', 'おんがく'] },
  { id: 's-juku', en: 'I went to cram school.', ja: 'じゅくにいきました。', usesWords: ['i', 'go'], keywords: ['じゅく', '塾', 'べんきょう', 'いった'] },
  { id: 's-practiced-soccer', en: 'I practiced soccer hard.', ja: 'サッカーのれんしゅうをがんばりました。', usesWords: ['i', 'soccer'], keywords: ['れんしゅう', 'がんばった', 'サッカー', 'クラブ'] },
  // かぞく・おてつだい
  { id: 's-helped-mother', en: 'I helped my mother.', ja: 'おかあさんのおてつだいをしました。', usesWords: ['i', 'mother'], keywords: ['おてつだい', '手伝い', 'おかあさん', 'えらい'] },
  { id: 's-cooked', en: 'I cooked dinner with my father.', ja: 'おとうさんとばんごはんをつくりました。', usesWords: ['i', 'father'], keywords: ['りょうり', 'つくった', 'ばんごはん', 'おとうさん'] },
  { id: 's-cleaned', en: 'I cleaned my room.', ja: 'へやのそうじをしました。', usesWords: ['i'], keywords: ['そうじ', '掃除', 'へや', 'かたづけ'] },
  { id: 's-played-brother', en: 'I played with my brother.', ja: 'おとうととあそびました。', usesWords: ['i', 'play'], keywords: ['おとうと', 'おにいちゃん', 'きょうだい', 'あそんだ'] },
  { id: 's-played-sister', en: 'I played with my sister.', ja: 'いもうととあそびました。', usesWords: ['i', 'play'], keywords: ['いもうと', 'おねえちゃん', 'きょうだい', 'あそんだ'] },
  { id: 's-grandpa-came', en: 'My grandpa came to my house.', ja: 'おじいちゃんがいえにきました。', usesWords: ['house', 'come'], keywords: ['おじいちゃん', 'おばあちゃん', 'きた', 'あそびにきた'] },
  // どうぶつ・ペット
  { id: 's-walked-dog', en: 'I walked my dog.', ja: 'いぬのさんぽにいきました。', usesWords: ['i', 'walk', 'dog'], keywords: ['さんぽ', '散歩', 'いぬ', 'ペット'] },
  { id: 's-cat-cute', en: 'My cat is very cute.', ja: 'うちのねこはとてもかわいいです。', usesWords: ['cat'], keywords: ['ねこ', 'かわいい', 'ペット'] },
  { id: 's-saw-birds', en: 'I saw many birds.', ja: 'とりをたくさんみました。', usesWords: ['i', 'see', 'bird'], keywords: ['とり', 'みた', 'しぜん'] },
  // たべもの
  { id: 's-ate-curry', en: 'I ate curry and rice.', ja: 'カレーライスをたべました。', usesWords: ['i', 'eat', 'rice'], keywords: ['カレー', 'たべた', 'ばんごはん', 'すき'] },
  { id: 's-ate-ramen', en: 'I ate ramen for lunch.', ja: 'ひるごはんにラーメンをたべました。', usesWords: ['i', 'eat'], keywords: ['ラーメン', 'ひるごはん', 'たべた', 'めん'] },
  { id: 's-ate-fruit', en: 'I ate a sweet peach.', ja: 'あまいももをたべました。', usesWords: ['i', 'eat', 'peach'], keywords: ['もも', 'くだもの', 'あまい', 'たべた'] },
  { id: 's-baked-cookies', en: 'I baked cookies.', ja: 'クッキーをやきました。', usesWords: ['i'], keywords: ['クッキー', 'おかし', 'つくった', 'やいた'] },
  // かいもの・もらいもの
  { id: 's-bought-book', en: 'I bought a new book.', ja: 'あたらしいほんをかいました。', usesWords: ['i', 'book'], keywords: ['かった', '買った', 'ほん', 'かいもの'] },
  { id: 's-bought-shoes', en: 'I bought new shoes.', ja: 'あたらしいくつをかいました。', usesWords: ['i'], keywords: ['くつ', 'かった', 'かいもの', 'あたらしい'] },
  { id: 's-got-present', en: 'I got a present.', ja: 'プレゼントをもらいました。', usesWords: ['i'], keywords: ['プレゼント', 'もらった', 'うれしい', 'たんじょうび'] },
  // たんじょうび・イベント
  { id: 's-birthday', en: 'Today is my birthday.', ja: 'きょうはわたしのたんじょうびです。', usesWords: ['today'], keywords: ['たんじょうび', '誕生日', 'おいわい', 'ケーキ'] },
  { id: 's-birthday-party', en: 'We had a birthday party.', ja: 'たんじょうびパーティーをしました。', usesWords: [], keywords: ['たんじょうび', 'パーティー', 'おいわい', 'ケーキ'] },
  { id: 's-fireworks', en: 'I watched fireworks.', ja: 'はなびをみました。', usesWords: ['i', 'see'], keywords: ['はなび', '花火', 'なつ', 'まつり', 'みた'] },
  { id: 's-festival', en: 'I went to a festival.', ja: 'おまつりにいきました。', usesWords: ['i', 'go'], keywords: ['まつり', '祭り', 'やたい', 'いった'] },
  { id: 's-camping', en: 'I went camping.', ja: 'キャンプにいきました。', usesWords: ['i', 'go'], keywords: ['キャンプ', 'いった', 'そと', 'しぜん', 'なつやすみ'] },
  { id: 's-onsen', en: 'I went to a hot spring.', ja: 'おんせんにいきました。', usesWords: ['i', 'go'], keywords: ['おんせん', '温泉', 'おふろ', 'りょこう', 'いった'] },
  { id: 's-trip', en: 'I went on a trip with my family.', ja: 'かぞくでりょこうにいきました。', usesWords: ['i', 'go', 'family'], keywords: ['りょこう', '旅行', 'かぞく', 'おでかけ', 'いった'] },
  // てんき・きせつ
  { id: 's-snowed', en: 'It snowed today.', ja: 'きょうはゆきがふりました。', usesWords: ['snowy', 'today'], keywords: ['ゆき', '雪', 'ふった', 'ふゆ', 'さむい'] },
  { id: 's-cold', en: 'It was very cold.', ja: 'とてもさむかったです。', usesWords: [], keywords: ['さむい', 'さむかった', 'ふゆ', 'てんき'] },
  { id: 's-rainbow', en: 'I saw a rainbow.', ja: 'にじをみました。', usesWords: ['i', 'see'], keywords: ['にじ', '虹', 'みた', 'きれい', 'そら'] },
  { id: 's-pretty-moon', en: 'The moon was pretty.', ja: 'つきがきれいでした。', usesWords: ['moon'], keywords: ['つき', '月', 'きれい', 'よる', 'そら'] },
  // きもちのバリエーション
  { id: 's-excited', en: 'I was so excited.', ja: 'とてもわくわくしました。', usesWords: ['i'], keywords: ['わくわく', 'たのしみ', 'ドキドキ', 'きもち'] },
  { id: 's-surprised', en: 'I was surprised.', ja: 'びっくりしました。', usesWords: ['i'], keywords: ['びっくり', 'おどろいた', 'きもち'] },
  { id: 's-tired', en: 'I was tired today.', ja: 'きょうはつかれました。', usesWords: ['i', 'today'], keywords: ['つかれた', '疲れた', 'ねむい', 'たいへん'] },
  { id: 's-happy-day', en: 'Today was a happy day.', ja: 'きょうはうれしいいちにちでした。', usesWords: ['today', 'happy'], keywords: ['うれしい', 'いいひ', 'さいこう', 'きょう'] },
  { id: 's-best-day', en: 'Today was the best day.', ja: 'きょうはさいこうのいちにちでした。', usesWords: ['today'], keywords: ['さいこう', '最高', 'たのしかった', 'いちばん'] },
  { id: 's-try-again', en: 'I will try again tomorrow.', ja: 'あしたまたがんばります。', usesWords: ['i', 'tomorrow'], keywords: ['がんばる', 'あした', 'また', 'ちょうせん'] },
  // ゲーム・テレビ・ごろごろ
  { id: 's-watched-anime', en: 'I watched anime.', ja: 'アニメをみました。', usesWords: ['i', 'see'], keywords: ['アニメ', 'みた', 'テレビ'] },
  { id: 's-watched-youtube', en: 'I watched videos.', ja: 'どうがをみました。', usesWords: ['i', 'see'], keywords: ['どうが', '動画', 'ユーチューブ', 'みた'] },
  { id: 's-stayed-home', en: 'I stayed home today.', ja: 'きょうはいえにいました。', usesWords: ['i', 'today', 'house'], keywords: ['いえ', 'おうち', 'ごろごろ', 'やすみ'] },
  { id: 's-slept-early', en: 'I will go to bed early.', ja: 'きょうははやくねます。', usesWords: ['i', 'bed'], keywords: ['ねる', 'はやね', 'おやすみ', 'ねむい'] },
]

/** 日本語の「言いたいこと」から例文をさがす（部分一致スコア順） */
export function searchSentences(query: string, limit = 6): SentenceItem[] {
  const q = query.trim()
  if (!q) return []
  const terms = q.split(/[\s、。,.]+/).filter((t) => t.length >= 1)
  const scored = SENTENCES.map((s) => {
    let score = 0
    for (const t of terms) {
      if (s.ja.includes(t)) score += 3
      if (s.keywords.some((k) => k.includes(t) || t.includes(k))) score += 4
      if (s.en.toLowerCase().includes(t.toLowerCase())) score += 2
    }
    return { s, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.s)
}
