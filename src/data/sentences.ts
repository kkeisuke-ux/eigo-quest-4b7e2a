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
  // ---------- 第20回で追加: 「きょうしたこと」「きもち」を書きやすく ----------
  // したこと・あそび
  { id: 's-dodgeball', en: 'I played dodgeball.', ja: 'ドッジボールをしました。', usesWords: ['i', 'play'], keywords: ['ドッジボール', 'ドッジ', 'した', 'あそんだ', 'たいいく'] },
  { id: 's-played-tag', en: 'I played tag with my friends.', ja: 'ともだちとおにごっこをしました。', usesWords: ['i', 'play', 'friend'], keywords: ['おにごっこ', 'おに', 'あそんだ', 'こうえん', 'やすみじかん'] },
  { id: 's-jumped-rope', en: 'I jumped rope.', ja: 'なわとびをしました。', usesWords: ['i'], keywords: ['なわとび', 'とんだ', 'れんしゅう', 'たいいく'] },
  { id: 's-library', en: 'I went to the library.', ja: 'としょかんにいきました。', usesWords: ['i', 'go', 'library'], keywords: ['としょかん', '図書館', 'ほん', 'いった', 'かりた'] },
  { id: 's-played-park', en: 'I played in the park.', ja: 'こうえんであそびました。', usesWords: ['i', 'play', 'park'], keywords: ['こうえん', 'あそんだ', 'そと', 'ブランコ', 'すべりだい'] },
  { id: 's-took-bath', en: 'I took a bath with my brother.', ja: 'おとうととおふろにはいりました。', usesWords: ['i'], keywords: ['おふろ', 'はいった', 'おとうと', 'おにいちゃん'] },
  { id: 's-got-up-early', en: 'I got up early today.', ja: 'きょうははやおきしました。', usesWords: ['i', 'today'], keywords: ['はやおき', 'おきた', 'あさ', 'はやい'] },
  { id: 's-slept-late', en: 'I went to bed late.', ja: 'よるおそくねました。', usesWords: ['i', 'bed'], keywords: ['おそく', 'ねた', 'よる', 'よふかし'] },
  { id: 's-talked-friend', en: 'I talked with my friend.', ja: 'ともだちとおしゃべりしました。', usesWords: ['i', 'friend'], keywords: ['はなした', 'おしゃべり', 'ともだち', 'たのしい'] },
  { id: 's-sang', en: 'I sang songs.', ja: 'うたをうたいました。', usesWords: ['i', 'sing'], keywords: ['うた', 'うたった', 'おんがく', 'カラオケ'] },
  { id: 's-danced', en: 'I danced.', ja: 'ダンスをしました。', usesWords: ['i', 'dance'], keywords: ['ダンス', 'おどった', 'おどり', 'ならいごと'] },
  { id: 's-origami', en: 'I did origami.', ja: 'おりがみをしました。', usesWords: ['i'], keywords: ['おりがみ', 'おった', 'こうさく', 'つくった'] },
  { id: 's-caught-insects', en: 'I caught insects.', ja: 'むしとりをしました。', usesWords: ['i'], keywords: ['むし', 'むしとり', 'つかまえた', 'カブトムシ', 'セミ', 'なつ'] },
  { id: 's-fishing', en: 'I went fishing.', ja: 'つりにいきました。', usesWords: ['i', 'go'], keywords: ['つり', 'さかな', 'いった', 'うみ', 'かわ'] },
  { id: 's-snowman', en: 'I made a snowman.', ja: 'ゆきだるまをつくりました。', usesWords: ['i'], keywords: ['ゆきだるま', 'ゆき', 'つくった', 'ふゆ'] },
  { id: 's-played-snow', en: 'I played in the snow.', ja: 'ゆきであそびました。', usesWords: ['i', 'play'], keywords: ['ゆき', 'あそんだ', 'ふゆ', 'ゆきがっせん'] },
  { id: 's-watered-flowers', en: 'I watered the flowers.', ja: 'はなにみずをやりました。', usesWords: ['i', 'flower'], keywords: ['はな', 'みず', 'やった', 'おてつだい', 'うえき', 'アサガオ'] },
  { id: 's-walk', en: 'I went for a walk.', ja: 'さんぽにいきました。', usesWords: ['i', 'go', 'walk'], keywords: ['さんぽ', 'あるいた', 'いった'] },
  { id: 's-took-pictures', en: 'I took pictures.', ja: 'しゃしんをとりました。', usesWords: ['i'], keywords: ['しゃしん', 'とった', 'カメラ'] },
  { id: 's-blocks', en: 'I played with blocks.', ja: 'ブロックであそびました。', usesWords: ['i', 'play'], keywords: ['ブロック', 'レゴ', 'つくった', 'あそんだ'] },
  { id: 's-puzzle', en: 'I did a puzzle.', ja: 'パズルをしました。', usesWords: ['i'], keywords: ['パズル', 'した', 'あそんだ'] },
  { id: 's-cards', en: 'I played cards with my family.', ja: 'かぞくでトランプをしました。', usesWords: ['i', 'play', 'family'], keywords: ['トランプ', 'カード', 'あそんだ', 'かぞく', 'ゲーム'] },
  { id: 's-dentist', en: 'I went to the dentist.', ja: 'はいしゃにいきました。', usesWords: ['i', 'go'], keywords: ['はいしゃ', 'は', 'いった', 'びょういん'] },
  { id: 's-haircut', en: 'I got a haircut.', ja: 'かみをきりました。', usesWords: ['i'], keywords: ['かみ', 'きった', 'びよういん', 'さんぱつ', 'すっきり'] },
  { id: 's-doctor', en: 'I went to the doctor.', ja: 'びょういんにいきました。', usesWords: ['i', 'go'], keywords: ['びょういん', 'いった', 'ちゅうしゃ', 'かぜ', 'おいしゃさん'] },
  // がっこう
  { id: 's-went-school', en: 'I went to school.', ja: 'がっこうにいきました。', usesWords: ['i', 'go', 'school'], keywords: ['がっこう', '学校', 'いった'] },
  { id: 's-music-class', en: 'We had music class.', ja: 'おんがくのじゅぎょうがありました。', usesWords: ['music'], keywords: ['おんがく', '音楽', 'じゅぎょう', 'がっこう', 'けんばん', 'リコーダー'] },
  { id: 's-art-class', en: 'We had art class.', ja: 'ずこうのじゅぎょうがありました。', usesWords: [], keywords: ['ずこう', '図工', 'え', 'じゅぎょう', 'こうさく'] },
  { id: 's-studied-math', en: 'I studied math.', ja: 'さんすうをべんきょうしました。', usesWords: ['i', 'math'], keywords: ['さんすう', '算数', 'べんきょう', 'しゅくだい', 'けいさん'] },
  { id: 's-good-score', en: 'I got a good score.', ja: 'テストでいいてんをとりました。', usesWords: ['i'], keywords: ['てん', '点', 'テスト', 'とった', 'やった', '100てん', 'まんてん'] },
  { id: 's-field-trip', en: 'We went on a field trip.', ja: 'えんそくにいきました。', usesWords: ['go'], keywords: ['えんそく', '遠足', 'いった', 'ぎょうじ', 'おべんとう'] },
  { id: 's-swimming-class', en: 'We had swimming class.', ja: 'すいえいのじゅぎょうがありました。', usesWords: ['swimming'], keywords: ['すいえい', '水泳', 'プール', 'じゅぎょう', 'がっこう'] },
  { id: 's-new-friend', en: 'I made a new friend.', ja: 'あたらしいともだちができました。', usesWords: ['i', 'friend', 'new'], keywords: ['ともだち', 'できた', 'あたらしい', 'なかよし'] },
  { id: 's-cleaned-classroom', en: 'We cleaned the classroom.', ja: 'きょうしつのそうじをしました。', usesWords: [], keywords: ['そうじ', '掃除', 'きょうしつ', 'がっこう'] },
  { id: 's-school-holiday', en: 'School was closed today.', ja: 'きょうはがっこうがおやすみでした。', usesWords: ['school', 'today'], keywords: ['やすみ', '休み', 'きゅうじつ', 'がっこう'] },
  // きもち・ようす
  { id: 's-was-sad', en: 'I was sad.', ja: 'かなしかったです。', usesWords: ['i', 'sad'], keywords: ['かなしい', 'かなしかった', 'ないた', 'きもち'] },
  { id: 's-was-angry', en: 'I was angry.', ja: 'おこりました。', usesWords: ['i'], keywords: ['おこった', 'いかり', 'ぷんぷん', 'いや', 'きもち'] },
  { id: 's-was-scared', en: 'I was scared.', ja: 'こわかったです。', usesWords: ['i'], keywords: ['こわい', 'こわかった', 'おばけ', 'きもち'] },
  { id: 's-was-nervous', en: 'I was nervous.', ja: 'ドキドキしました。', usesWords: ['i'], keywords: ['ドキドキ', 'きんちょう', 'はっぴょう', 'きもち'] },
  { id: 's-interesting', en: 'It was interesting.', ja: 'おもしろかったです。', usesWords: [], keywords: ['おもしろい', 'おもしろかった', 'きもち'] },
  { id: 's-difficult', en: 'It was difficult.', ja: 'むずかしかったです。', usesWords: [], keywords: ['むずかしい', 'むずかしかった', 'たいへん'] },
  { id: 's-easy', en: 'It was easy.', ja: 'かんたんでした。', usesWords: [], keywords: ['かんたん', 'できた', 'よゆう'] },
  { id: 's-did-best', en: 'I did my best.', ja: 'がんばりました。', usesWords: ['i'], keywords: ['がんばった', 'がんばり', 'いっしょうけんめい', 'どりょく'] },
  { id: 's-lucky', en: 'I was lucky today.', ja: 'きょうはラッキーでした。', usesWords: ['i', 'today'], keywords: ['ラッキー', 'うんがいい', 'いいこと'] },
  { id: 's-laughed', en: 'I laughed a lot.', ja: 'たくさんわらいました。', usesWords: ['i'], keywords: ['わらった', 'わらい', 'おもしろい', 'たのしい'] },
  { id: 's-cried', en: 'I cried a little.', ja: 'すこしなきました。', usesWords: ['i'], keywords: ['ないた', 'なみだ', 'かなしい'] },
  { id: 's-again', en: 'I want to do it again.', ja: 'またやりたいです。', usesWords: ['i'], keywords: ['また', 'やりたい', 'たのしかった', 'もういちど'] },
  // たべもの
  { id: 's-watermelon', en: 'I ate watermelon.', ja: 'すいかをたべました。', usesWords: ['i', 'eat'], keywords: ['すいか', 'たべた', 'なつ', 'くだもの'] },
  { id: 's-shaved-ice', en: 'I ate shaved ice.', ja: 'かきごおりをたべました。', usesWords: ['i', 'eat'], keywords: ['かきごおり', 'たべた', 'なつ', 'つめたい', 'おまつり'] },
  { id: 's-breakfast', en: 'Breakfast was delicious.', ja: 'あさごはんがおいしかったです。', usesWords: ['breakfast'], keywords: ['あさごはん', 'おいしい', 'たべた', 'あさ'] },
  { id: 's-big-dinner', en: 'I ate a big dinner.', ja: 'ばんごはんをたくさんたべました。', usesWords: ['i', 'eat', 'dinner'], keywords: ['ばんごはん', 'たくさん', 'たべた', 'おなかいっぱい'] },
  { id: 's-rice-balls', en: 'I made rice balls.', ja: 'おにぎりをつくりました。', usesWords: ['i', 'rice'], keywords: ['おにぎり', 'つくった', 'ごはん', 'りょうり'] },
  { id: 's-snacks', en: 'I ate snacks with my sister.', ja: 'いもうととおやつをたべました。', usesWords: ['i', 'eat'], keywords: ['おやつ', 'たべた', 'いもうと', 'おねえちゃん', 'おかし'] },
  // できごと・からだ
  { id: 's-cold', en: 'I caught a cold.', ja: 'かぜをひきました。', usesWords: ['i'], keywords: ['かぜ', 'ひいた', 'びょうき', 'ねつ', 'せき'] },
  { id: 's-tooth-out', en: 'My tooth came out.', ja: 'はがぬけました。', usesWords: [], keywords: ['は', '歯', 'ぬけた', 'はいしゃ'] },
  { id: 's-hurt-knee', en: 'I hurt my knee.', ja: 'ひざをけがしました。', usesWords: ['i'], keywords: ['けが', 'ひざ', 'いたい', 'ころんだ', 'すりむいた'] },
  { id: 's-clover', en: 'I found a four-leaf clover.', ja: 'よつばのクローバーをみつけました。', usesWords: ['i'], keywords: ['クローバー', 'よつば', 'みつけた', 'ラッキー', 'しあわせ'] },
  { id: 's-shooting-star', en: 'I saw a shooting star.', ja: 'ながれぼしをみました。', usesWords: ['i', 'see', 'star'], keywords: ['ながれぼし', 'ほし', 'みた', 'よる', 'そら'] },
  { id: 's-lost-toy', en: 'I lost my toy.', ja: 'おもちゃをなくしました。', usesWords: ['i', 'toy'], keywords: ['なくした', 'おもちゃ', 'かなしい', 'さがした'] },
  { id: 's-found-toy', en: 'I found my toy.', ja: 'おもちゃがみつかりました。', usesWords: ['i', 'toy'], keywords: ['みつかった', 'みつけた', 'おもちゃ', 'よかった'] },
  // てんき
  { id: 's-cloudy', en: 'It was cloudy today.', ja: 'きょうはくもりでした。', usesWords: ['cloudy', 'today'], keywords: ['くもり', 'てんき'] },
  { id: 's-windy', en: 'It was windy.', ja: 'かぜがつよかったです。', usesWords: ['windy'], keywords: ['かぜ', '風', 'つよい', 'てんき'] },
  { id: 's-typhoon', en: 'A typhoon came.', ja: 'たいふうがきました。', usesWords: ['come'], keywords: ['たいふう', '台風', 'あめ', 'かぜ', 'てんき'] },
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
