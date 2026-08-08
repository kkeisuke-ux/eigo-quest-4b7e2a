// 開発・E2E検証用フック（window.__eigoDev）。
// ブラウザのコンソールから認識器や参照データへ直接アクセスできる。
import { judgeTraceStroke } from './core/judge/evaluate'
import { classifyLetter, judgeExpectedLetter, judgeWord } from './recognition/classify'
import { getRefLetter, listRefLetters } from './core/refdata'
import { getEffectiveJudgeConfig } from './config/judgeRuntime'
import { checkDiaryText } from './diary/correction'
import { DEFAULT_JUDGE_CONFIG } from './config/judgeConfig'

declare global {
  interface Window {
    __eigoDev?: Record<string, unknown>
  }
}

window.__eigoDev = {
  judgeTraceStroke,
  classifyLetter,
  judgeExpectedLetter,
  judgeWord,
  getRefLetter,
  listRefLetters,
  getEffectiveJudgeConfig,
  checkDiaryText,
  DEFAULT_JUDGE_CONFIG,
}

export {}
