// 単語の提示カード（仕様 §11-§13, §17）。
// イラスト＋英語＋日本語＋発音ボタンの組み合わせを、学習ステップに応じて出し分ける。
import { getWord } from '../data/words'
import { SpeakButton } from '../ui/SpeakButton'

export function WordIllustrationView({ value, size = 'lg' }: { value: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`word-illust word-illust-${size}`}>{value}</span>
}

export function WordCard({
  wordId,
  showEn = true,
  showJa = true,
  showIllustration = true,
  showSpeak = true,
  big = false,
}: {
  wordId: string
  showEn?: boolean
  showJa?: boolean
  showIllustration?: boolean
  /** 音声再生ボタンを出すか（テスト中は答えを読み上げない。仕様 §17） */
  showSpeak?: boolean
  big?: boolean
}) {
  const word = getWord(wordId)
  if (!word) return null
  return (
    <div className={`card word-card ${big ? 'word-card-big' : ''}`}>
      {showIllustration && <WordIllustrationView value={word.illustration.value} size={big ? 'lg' : 'md'} />}
      {showEn && (
        <div className="word-card-en">
          <span className="word-card-word">{word.en}</span>
          {showSpeak && <SpeakButton text={word.en} kind="word" size="lg" />}
        </div>
      )}
      {!showEn && showSpeak && (
        <div className="word-card-en">
          <SpeakButton text={word.en} kind="word" size="lg" label="もういちど きく" />
        </div>
      )}
      {showJa && <div className="word-card-ja">{word.ja}</div>}
    </div>
  )
}
