// 短い英文の練習データ（LEVEL 5-6。仕様 §27-§28）。
// 覚えた単語を使った例文。まずお手本を書き写し、徐々に日本語を見て書く。
// アプリの中心は単語学習であり、英文はステップアップ用の少数精鋭とする。

export interface SentenceItem {
  id: string
  en: string
  ja: string
  /** 使っている収録単語のid（この単語を覚えていたら解放の目安になる） */
  usesWords: string[]
}

export const SENTENCES: SentenceItem[] = [
  { id: 's-like-soccer', en: 'I like soccer.', ja: 'わたしはサッカーがすきです。', usesWords: ['i', 'like', 'soccer'] },
  { id: 's-like-apples', en: 'I like apples.', ja: 'わたしはりんごがすきです。', usesWords: ['i', 'like', 'apple'] },
  { id: 's-have-dog', en: 'I have a dog.', ja: 'わたしはいぬをかっています。', usesWords: ['i', 'dog'] },
  { id: 's-have-cat', en: 'I have a cat.', ja: 'わたしはねこをかっています。', usesWords: ['i', 'cat'] },
  { id: 's-am-happy', en: 'I am happy.', ja: 'わたしはうれしいです。', usesWords: ['i', 'happy'] },
  { id: 's-am-hungry', en: 'I am hungry.', ja: 'おなかがすきました。', usesWords: ['i', 'hungry'] },
  { id: 's-it-sunny', en: 'It is sunny today.', ja: 'きょうは はれです。', usesWords: ['sunny', 'today'] },
  { id: 's-went-park', en: 'I went to the park.', ja: 'わたしはこうえんにいきました。', usesWords: ['i', 'go', 'park'] },
  { id: 's-went-zoo', en: 'I went to the zoo.', ja: 'わたしはどうぶつえんにいきました。', usesWords: ['i', 'go', 'zoo'] },
  { id: 's-was-fun', en: 'It was fun.', ja: 'たのしかったです。', usesWords: [] },
  { id: 's-play-tennis', en: 'I play tennis.', ja: 'わたしはテニスをします。', usesWords: ['i', 'play', 'tennis'] },
  { id: 's-drink-milk', en: 'I drink milk every morning.', ja: 'わたしはまいあさ ぎゅうにゅうをのみます。', usesWords: ['i', 'drink', 'milk', 'morning'] },
]
