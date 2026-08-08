// 永続化データのモデル定義（仕様 §59, §63）。
// 仕様のエンティティ対応:
//   Profile→profiles / AlphabetProgress→alphabetProgress / WordProgress→wordProgress
//   PracticeSession→practiceSessions / TestResult→testResults / UnknownWord→unknownWords
//   ReviewSchedule→wordProgress内のsrs項目 / DiaryEntry→diaryEntries
//   CoinBalance・StarBalance→profiles.coins/stars / CoinTransaction→coinHistory
//   Character(マスタ)→src/data/species.ts / OwnedCharacter・CharacterProgress→ownedCharacters
//   GachaHistory→gachaHistory / わたしの単語帳(§34)→myWords

export interface Profile {
  id: string
  name: string
  /** 0=ようじ, 1-6=小1-小6, 7-9=中1-中3 */
  grade: number
  color: string
  coins: number
  stars: number
  /** いっしょに勉強している仲間（ownedCharactersのid） */
  buddyId: number | null
  gachaCount: number
  gachaMissStreak: number
  /** 文字の判定 1=やさしい / 2=ふつう / 3=きびしい。初期値は1（やさしい。仕様 §15） */
  judgeStrictness?: number
  createdAt: number
  lastActiveAt: number
}

/** アルファベット1文字（'A'..'Z' | 'a'..'z'）の進捗 */
export interface AlphabetProgress {
  profileId: string
  letter: string
  traceDone: number
  writes: number
  correct: number
  wrong: number
  /** なぞり練習を完了した日時 */
  practicedAt: number | null
  /** テストで「読める字形」と判定され習得扱いになった日時（仕様 §8） */
  masteredAt: number | null
  lastSeenAt: number | null
}

/** 英単語1語の進捗（SRS＝間隔反復を含む） */
export interface WordProgress {
  profileId: string
  wordId: string
  correct: number
  wrong: number
  unknown: number
  /** なぞり完了回数（STEP1+2） */
  traceDone: number
  /** お手本を見ながら書けた回数（STEP3） */
  copyDone: number
  /** 日本語だけを見て書けた回数（STEP4） */
  recallDone: number
  /** 4ステップ練習フローを完了した日時 */
  practicedAt: number | null
  /** テストで正解して習得扱いになった日時 */
  masteredAt: number | null
  srsLevel: number
  nextReviewAt: number | null
  lastSeenAt: number | null
}

export interface StoredStroke {
  pointerType: string
  usedCoalesced: boolean
  /** [x, y] のリスト（容量対策で再サンプリング済み） */
  points: [number, number][]
  /** ストローク色（絵日記の色ペン。未設定は既定色） */
  color?: string
  /** ストローク太さ（未設定は既定） */
  width?: number
}

/** 筆記サンプル（認識しきい値調整用。設定→判定デバッグで人間ラベル付け） */
export interface StrokeSampleRecord {
  id?: number
  profileId: string
  /** 書こうとした文字または単語 */
  target: string
  at: number
  boxSize: number
  strokes: StoredStroke[]
  summary: {
    verdict: string
    /** 認識された文字列 */
    recognized: string
    score: number
  }
  context: 'practice' | 'test' | 'review' | 'diary' | 'debug'
  humanLabel: 'correct' | 'incorrect' | null
}

export type AnswerOutcome = 'correct' | 'wrong' | 'unknown'

export interface TestItemRecord {
  wordId: string
  result: AnswerOutcome
  /** 認識された文字列（分析用） */
  recognized?: string
  /** 正解までに書き直した回数 */
  retries?: number
}

export interface TestResultRecord {
  id?: number
  profileId: string
  /** stage=5問テスト / term=まとめテスト / alphabet=アルファベットテスト */
  kind: 'stage' | 'term' | 'alphabet'
  targetId: string
  at: number
  total: number
  correct: number
  items: TestItemRecord[]
}

/** まとめテストの途中保存（仕様 §25: 途中経過は自動保存） */
export interface TestSessionRecord {
  profileId: string
  /** 'term:<termId>' */
  testKey: string
  kind: 'term'
  targetId: string
  wordIds: string[]
  currentIndex: number
  items: TestItemRecord[]
  startedAt: number
  updatedAt: number
}

/** ステージれんしゅうの途中保存（途中でやめても続きから再開できる） */
export interface PracticeSessionRecord {
  profileId: string
  stageId: string
  wordIdx: number
  /** 0=なぞり1 / 1=なぞり2 / 2=見て書く / 3=思い出して書く */
  step: number
  updatedAt: number
}

/** わからなかった単語（仕様 §21-22） */
export interface UnknownWordRecord {
  profileId: string
  wordId: string
  addedAt: number
  reason: 'unknown' | 'wrong'
  lastFailedAt: number
}

export interface CoinHistoryRecord {
  id?: number
  profileId: string
  delta: number
  reason: string
  balanceAfter: number
  at: number
}

export interface OwnedCharacterRecord {
  id?: number
  profileId: string
  speciesId: string
  /** 進化段階（0始まり） */
  stage: number
  level: number
  exp: number
  /** ガチャの重複などで貯まった なかよしEXP の累計 */
  friendExp: number
  obtainedAt: number
}

export interface DexEntryRecord {
  profileId: string
  speciesId: string
  stage: number
  discoveredAt: number
}

export interface GachaHistoryRecord {
  id?: number
  profileId: string
  cost: number
  /** 出会えなかった場合 null */
  resultSpeciesId: string | null
  duplicated: boolean
  at: number
}

/** えいご絵日記 1日1ページ（仕様 §29-§33） */
export interface DiaryEntryRecord {
  profileId: string
  /** 'YYYY-MM-DD' */
  dateKey: string
  /** Apple Pencilで描いた絵 */
  drawing: StoredStroke[]
  /** 描画時のキャンバス幅（CSS px。表示時のリスケール用） */
  drawingSize: number
  /** 本人が書いた英文（手書き→認識→本人確認済みテキスト）。原文は必ず保存する（仕様 §30） */
  originalText: string
  /** 英文の手書きストローク（見返し用） */
  textStrokes: StoredStroke[]
  textBoxWidth: number
  /** 添削後の自然な英文（チェック未実施なら null）。原文は置き換えない */
  correctedText: string | null
  /** 添削コメント（「こう書くともっと自然だよ」の説明） */
  correctionNotes: string[]
  createdAt: number
  updatedAt: number
}

/** わたしの単語帳（仕様 §34） */
export interface MyWordRecord {
  profileId: string
  /** 収録単語のid。辞書外の語は 'custom:<en>' */
  wordId: string
  en: string
  ja: string
  addedAt: number
  source: 'lookup' | 'diary'
}

export interface ActivityRecord {
  id?: number
  profileId: string
  profileName: string
  type: 'join' | 'stageClear' | 'termTest' | 'gacha' | 'evolve' | 'milestone' | 'alphabet' | 'diary'
  message: string
  at: number
}

export interface SettingsRecord {
  key: string
  value: unknown
}
