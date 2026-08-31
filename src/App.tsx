import { useEffect, useState } from 'react'
import { loadAppFlags } from './config/appFlags'
import { loadJudgeOverrides } from './config/judgeRuntime'
import { setBgmScene } from './audio/sound'
import { navigate, useAppState, type Route } from './state/store'
import { markTutorialDone } from './storage/repo'
import { Toasts } from './ui/components'
import { CoinFx } from './ui/CoinFx'
import { EvolutionModal } from './ui/EvolutionModal'
import { LevelUpFx } from './ui/LevelUpFx'
import { ProfileSelect } from './screens/ProfileSelect'
import { Home } from './screens/Home'
import { Tutorial } from './screens/Tutorial'
import { AlphabetHub } from './screens/Alphabet'
import { AlphabetLearn } from './screens/AlphabetLearn'
import { AlphabetTest } from './screens/AlphabetTest'
import { StageMap } from './screens/StageMap'
import { TestsHub } from './screens/TestsHub'
import { LearnFlow } from './screens/LearnFlow'
import { StageTestScreen, TermTestScreen } from './screens/Tests'
import { Review } from './screens/Review'
import { UnknownList } from './screens/UnknownList'
import { MyWords } from './screens/MyWords'
import { Diary } from './screens/Diary'
import { DiaryEdit } from './screens/DiaryEdit'
import { Gacha } from './screens/Gacha'
import { Friends } from './screens/Friends'
import { Dex } from './screens/Dex'
import { Minna } from './screens/Minna'
import { Settings } from './screens/Settings'
import { PencilDiag } from './screens/PencilDiag'
import { JudgeDebug } from './screens/JudgeDebug'

/** チュートリアルは「見おわったら二度と出さない」ので、完了フラグの保存だけここで面倒を見る */
function TutorialRoute() {
  const profileId = useAppState((s) => s.profileId)
  return <Tutorial onDone={async () => { if (profileId) await markTutorialDone(profileId) }} />
}

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'profiles':
      return <ProfileSelect />
    case 'tutorial':
      return <TutorialRoute />
    case 'home':
      return <Home />
    case 'alphabet':
      return <AlphabetHub />
    case 'alphabetLearn':
      return <AlphabetLearn kind={route.kind} startIndex={route.startIndex} letters={route.letters} />
    case 'alphabetTest':
      return <AlphabetTest kind={route.kind} letters={route.letters} />
    case 'stages':
      return <StageMap />
    case 'tests':
      return <TestsHub />
    case 'learn':
      return <LearnFlow stageId={route.stageId} />
    case 'stageTest':
      return <StageTestScreen stageId={route.stageId} />
    case 'termTest':
      return <TermTestScreen termId={route.termId} />
    case 'review':
      return <Review mode={route.mode} wordIds={route.wordIds} />
    case 'unknownList':
      return <UnknownList />
    case 'myWords':
      return <MyWords />
    case 'diary':
      return <Diary />
    case 'diaryEdit':
      return <DiaryEdit dateKey={route.dateKey} />
    case 'gacha':
      return <Gacha />
    case 'friends':
      return <Friends />
    case 'dex':
      return <Dex />
    case 'minna':
      return <Minna />
    case 'settings':
      return <Settings />
    case 'pencilDiag':
      return <PencilDiag />
    case 'judgeDebug':
      return <JudgeDebug />
  }
}

export default function App() {
  const route = useAppState((s) => s.route)
  const profileId = useAppState((s) => s.profileId)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    void Promise.all([loadJudgeOverrides(), loadAppFlags()]).then(() => setBooted(true))
  }, [])

  useEffect(() => {
    if (booted && !profileId && route.name !== 'profiles') navigate({ name: 'profiles' })
  }, [booted, profileId, route])

  // BGMのシーン切替: 学習・テスト系の画面では学習用の静かな曲、それ以外はホーム用の曲。
  // 学習画面のBGMは非常に小さく、英語発音中はさらに自動で下がる（audio ducking。仕様 §35-§36）
  useEffect(() => {
    const practiceScreens = [
      'alphabetLearn',
      'alphabetTest',
      'learn',
      'stageTest',
      'termTest',
      'review',
      'diaryEdit',
      'pencilDiag',
      'judgeDebug',
    ]
    setBgmScene(practiceScreens.includes(route.name) ? 'practice' : 'home')
  }, [route])

  if (!booted) return <div className="loading-view">よみこみちゅう…</div>

  return (
    <div className="app">
      <RouteView route={route} />
      <Toasts />
      <CoinFx />
      <EvolutionModal />
      <LevelUpFx />
    </div>
  )
}
