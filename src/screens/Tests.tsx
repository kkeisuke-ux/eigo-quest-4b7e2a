// テスト画面のラッパー（5問テスト / まとめテスト）。実体は learn/TestRunner。
import { useEffect } from 'react'
import { findTermTest, getStageLocation } from '../data/words'
import { TestRunner } from '../learn/TestRunner'
import { useAppState } from '../state/store'
import { putSetting } from '../storage/repo'
import { LoadingView } from '../ui/components'

/** 開いたテストのレベルを記憶（一覧やホームのおすすめが続きのレベルを指すように。第21回） */
function useRememberLevel(levelId: string | undefined) {
  const profileId = useAppState((s) => s.profileId)
  useEffect(() => {
    if (profileId && levelId) void putSetting(`stageMapLevel:${profileId}`, levelId)
  }, [profileId, levelId])
}

/** 5問テスト（仕様 §17）: 5語ステージの各語を1問ずつ、日本語→英単語筆記 */
export function StageTestScreen({ stageId }: { stageId: string }) {
  const loc = getStageLocation(stageId)
  useRememberLevel(loc?.level.id)
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

/** まとめテスト（第24回: 4ステージ=最大20問の通し番号テスト）。途中保存あり */
export function TermTestScreen({ termId }: { termId: string }) {
  const test = findTermTest(termId)
  useRememberLevel(test?.levelId)
  if (!test) return <LoadingView label="テストが見つかりません" />
  return (
    <TestRunner
      kind="term"
      targetId={termId}
      wordIds={test.wordIds}
      title={test.label}
      backRoute={{ name: 'tests' }}
    />
  )
}
