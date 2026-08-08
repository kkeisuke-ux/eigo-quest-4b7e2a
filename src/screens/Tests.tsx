// テスト画面のラッパー（5問テスト / まとめテスト）。実体は learn/TestRunner。
import { getStageLocation, parseTermId, termTestTitle, termWordIds } from '../data/words'
import { TestRunner } from '../learn/TestRunner'
import { LoadingView } from '../ui/components'

/** 5問テスト（仕様 §17）: 5語ステージの各語を1問ずつ、日本語→英単語筆記 */
export function StageTestScreen({ stageId }: { stageId: string }) {
  const loc = getStageLocation(stageId)
  if (!loc) return <LoadingView label="ステージが見つかりません" />
  return (
    <TestRunner
      kind="stage"
      targetId={stageId}
      wordIds={loc.stage.wordIds}
      title={`${loc.stage.label} ５もんテスト`}
      backRoute={{ name: 'stages' }}
    />
  )
}

/** まとめテスト（仕様 §25）: 学期の全単語を連続出題。途中保存あり */
export function TermTestScreen({ termId }: { termId: string }) {
  const parsed = parseTermId(termId)
  if (!parsed) return <LoadingView label="テストが見つかりません" />
  const ids = termWordIds(parsed.levelId, parsed.termIndex)
  if (ids.length === 0) return <LoadingView label="このテストは じゅんびちゅうです" />
  return (
    <TestRunner
      kind="term"
      targetId={termId}
      wordIds={ids}
      title={termTestTitle(parsed.levelId, parsed.termIndex)}
      backRoute={{ name: 'tests' }}
    />
  )
}
