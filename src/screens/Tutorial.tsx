// はじめてのチュートリアル（第31回。かんじクエスト第55回の仕組みを えいご用に）。
// プロフィールごとに1回だけ、ホームに入る前に出す。
// ねらいは4つ:
//   1. 書き方（指も使うか、ペンだけか）を、意味が分かったうえで自分で選ばせる
//   2. 「なんで×になるの？」を先に知っておく（あとで理不尽に感じないように）
//   3. 何をがんばると何がもらえるか（称号・レベル・コイン・スター・ずかん）
//   4. 読み終わったあと、どこから始めればいいかが分かる
// 文章はぜんぶ小学生が読める言葉にする。
import { useState } from 'react'
import { getAppFlags, setAllowTouchInk } from '../config/appFlags'
import { navigate } from '../state/store'
import { Button } from '../ui/components'

interface Props {
  onDone: () => void
}

const LAST_STEP = 5

export function Tutorial({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [touch, setTouch] = useState(getAppFlags().allowTouchInk)

  const choose = async (value: boolean) => {
    setTouch(value)
    await setAllowTouchInk(value)
  }

  const finish = async (to: 'alphabet' | 'home') => {
    await onDone()
    navigate({ name: to === 'alphabet' ? 'alphabet' : 'home' })
  }

  return (
    <div className="screen tutorial-screen">
      <div className="tutorial-card">
        <div className="tutorial-dots">
          {Array.from({ length: LAST_STEP + 1 }, (_, i) => (
            <span key={i} className={`tutorial-dot${i === step ? ' on' : ''}${i < step ? ' done' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🔤</p>
            <h2>えいごクエストへ ようこそ！</h2>
            <p className="tutorial-lead">
              アルファベットと えいたんごを <b>じぶんの手で 書いて</b> おぼえるアプリだよ。
              かいた ことばで えいご絵日記も かけるよ。
            </p>
            <p className="tutorial-note">はじめる まえに、5つだけ 大事なことを つたえるね。</p>
          </div>
        )}

        {step === 1 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🖊️</p>
            <h2>どうやって 書く？</h2>
            <p className="tutorial-lead">じぶんに あうほうを えらんでね。あとで「せってい」から かえられるよ。</p>
            <div className="tutorial-choices">
              <button className={`tutorial-choice${!touch ? ' selected' : ''}`} onClick={() => void choose(false)}>
                <span className="tutorial-choice-icon">🖊️</span>
                <span className="tutorial-choice-title">ペンだけで 書く</span>
                <span className="tutorial-choice-sub">
                  Apple Pencil だけが 線になるよ。
                  <b>手のひらを ついても、ゆびが あたっても、線に ならない</b>から、
                  えんぴつと おなじように 手を おいて 書けるよ。
                </span>
                <span className="tutorial-choice-rec">← ペンが あるなら こっち</span>
              </button>
              <button className={`tutorial-choice${touch ? ' selected' : ''}`} onClick={() => void choose(true)}>
                <span className="tutorial-choice-icon">👆</span>
                <span className="tutorial-choice-title">ゆびでも 書けるようにする</span>
                <span className="tutorial-choice-sub">
                  ペンが なくても ゆびで 書けるよ。
                  そのかわり <b>手のひらが 画面に ついたら、それも 線に なっちゃう</b>。
                  手を うかせて 書いてね。
                </span>
                <span className="tutorial-choice-rec">← ペンが ないときは こっち</span>
              </button>
            </div>
            <p className="tutorial-note">いま えらんでいるのは「{touch ? 'ゆびでも 書ける' : 'ペンだけ'}」だよ。</p>
          </div>
        )}

        {step === 2 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🙅</p>
            <h2>×に なるのは どんなとき？</h2>
            <p className="tutorial-lead">えいごは <b>4本の線の どこに 書くか</b>で 文字が かわるよ。</p>
            <ul className="tutorial-list">
              <li>
                <b>大きさ・いち</b>が ちがうとき（小さい c と 大きい C は、線の どこに 書くかで きまる）
              </li>
              <li>
                <b>しっぽ</b>が 出ていないとき（g・y・p は 下の線から 出すよ）
              </li>
              <li>
                かたちが くずれて <b>べつの文字</b>に 見えるとき（n と h、u と v など）
              </li>
            </ul>
            <p className="tutorial-note">
              だから <b>お手本を なぞってから</b> 書くのが 近道だよ。
              なぞる れんしゅうでは ○×を つけないから、あんしんして なぞってね。
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🏅</p>
            <h2>しょうごう と レベル</h2>
            <div className="tutorial-two">
              <div className="tutorial-half">
                <p className="tutorial-half-title">🏅 しょうごう</p>
                <p>
                  <b>まとめテストで 100てん</b>を とるたびに 1つ 上がるよ。
                  <b>大文字ぜんぶ・小文字ぜんぶ</b>を おぼえても 上がる。
                </p>
              </div>
              <div className="tutorial-half">
                <p className="tutorial-half-title">📗 レベル</p>
                <p>
                  <b>５もんテストで 100てん</b>を そろえていくと、
                  <b>どこまで できたか</b>が レベルで 出るよ。
                </p>
              </div>
            </div>
            <div className="tutorial-order">
              <p className="tutorial-order-title">すすめる じゅんばん</p>
              <div className="tutorial-order-row">
                <span className="tutorial-order-step">
                  <b>①</b> アルファベット
                  <small>まずは 26文字から</small>
                </span>
                <span className="tutorial-order-arrow">→</span>
                <span className="tutorial-order-step">
                  <b>②</b> たんご
                  <small>なぞって・見て・書く</small>
                </span>
                <span className="tutorial-order-arrow">→</span>
                <span className="tutorial-order-step">
                  <b>③</b> ５もんテスト
                  <small>おぼえた5語を ためす</small>
                </span>
                <span className="tutorial-order-arrow">→</span>
                <span className="tutorial-order-step">
                  <b>④</b> まとめテスト
                  <small>たくさん まとめて</small>
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🪙</p>
            <h2>コイン と スター と ずかん</h2>
            <div className="tutorial-three">
              <div className="tutorial-half">
                <p className="tutorial-half-title">🪙 コイン</p>
                <p>
                  れんしゅう・テスト・にっきで もらえるよ。コインで <b>なかまガチャ</b>や <b>スター</b>が 買える。
                  <b>まいにち つづけると、1日ぶんの ボーナスが ふえる</b>よ。
                </p>
              </div>
              <div className="tutorial-half">
                <p className="tutorial-half-title">⭐ スター</p>
                <p>
                  なかまに あげると <b>レベルが 上がる</b>よ。
                  レベルが 上がると すがたが かわって、どんどん たくましく なる。
                </p>
              </div>
              <div className="tutorial-half">
                <p className="tutorial-half-title">📔 ずかん</p>
                <p>
                  会った なかまと、その <b>すがたぜんぶ</b>が のっていくよ。
                  そだてないと 見られない すがたも あるから、たくさん そだてよう。
                </p>
              </div>
            </div>
            <p className="tutorial-note">
              なかまは <b>レベル3・6・20・50・99</b>で すがたが かわるよ。
              レベル99の すがたは、ずっと つづけた 人だけが 見られる。
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="tutorial-body">
            <p className="tutorial-emoji">🎒</p>
            <h2>さいごに、2つだけ</h2>
            <ul className="tutorial-list">
              <li>
                <b>きろくは この タブレットの 中</b>に しまわれるよ。べつの タブレットで つかいたいときは、
                「せってい」から データを もっていけるよ。
              </li>
              <li>
                音を けしたり、○×の きびしさを かえたりも <b>「せってい」</b>で できるよ。
                ホームの 右上に あるからね。
              </li>
            </ul>
            <p className="tutorial-start-lead">じゅんび OK！ どこから はじめる？</p>
            <div className="tutorial-start">
              <button className="tutorial-start-main" onClick={() => void finish('alphabet')}>
                <span className="tutorial-start-icon">🔤</span>
                <span className="tutorial-start-title">アルファベット</span>
                <span className="tutorial-start-sub">
                  まずは ここから。アルファベット → たんご → ５もんテスト → まとめテスト の じゅんばん
                </span>
              </button>
              <button className="tutorial-start-sub-btn" onClick={() => void finish('home')}>
                ホームを 見てみる
              </button>
            </div>
          </div>
        )}

        {step < LAST_STEP && (
          <div className="tutorial-nav">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                もどる
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={() => setStep(step + 1)}>つぎへ</Button>
          </div>
        )}
      </div>
    </div>
  )
}
