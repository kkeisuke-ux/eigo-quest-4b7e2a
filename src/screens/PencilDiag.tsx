// Apple Pencil診断（仕様 §4）。判定精度の調整に必要なため削除しないこと。
// pointerType / pressure / tilt / 取得点数 / getCoalescedEvents利用可否 / stroke数 を
// リアルタイム表示し、手のひらや指の入力が strokeにならないことを確認できる。
import { useRef, useState } from 'react'
import { InkCanvas, type InkCanvasHandle } from '../core/ink/InkCanvas'
import { emptyDiagnostics, type InkDiagnostics, type InkStroke } from '../core/ink/types'
import { Button, Card, TopBar } from '../ui/components'

export function PencilDiag() {
  const [diag, setDiag] = useState<InkDiagnostics>(emptyDiagnostics())
  const [strokes, setStrokes] = useState<InkStroke[]>([])
  const inkRef = useRef<InkCanvasHandle | null>(null)

  return (
    <div className="screen">
      <TopBar title="Apple Pencil診断" back={{ name: 'settings' }} />
      <div className="split">
        <div className="split-left diag-panel">
          <Card>
            <h3>リアルタイム入力</h3>
            <table className="diag-table">
              <tbody>
                <tr>
                  <th>pointerType</th>
                  <td className={diag.lastPointerType === 'pen' ? 'diag-pen' : ''}>{diag.lastPointerType ?? '—'}</td>
                </tr>
                <tr>
                  <th>pressure（筆圧）</th>
                  <td>
                    {diag.lastPressure.toFixed(3)}
                    <span className="pressure-bar">
                      <span className="pressure-fill" style={{ width: `${Math.min(100, diag.lastPressure * 100)}%` }} />
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>tiltX / tiltY（傾き）</th>
                  <td>
                    {diag.lastTiltX}° / {diag.lastTiltY}°
                  </td>
                </tr>
                <tr>
                  <th>getCoalescedEvents</th>
                  <td>{diag.coalescedSupported ? '利用可能' : '非対応（通常イベントで動作）'}</td>
                </tr>
                <tr>
                  <th>直近moveの取得点数</th>
                  <td>{diag.lastEventPointCount}</td>
                </tr>
                <tr>
                  <th>書いている画の点数</th>
                  <td>{diag.currentStrokePoints}</td>
                </tr>
                <tr>
                  <th>stroke数</th>
                  <td>{diag.strokeCount}</td>
                </tr>
                <tr className="diag-important">
                  <th>touch拒否回数（手のひら・指）</th>
                  <td>{diag.rejectedTouchCount}</td>
                </tr>
                <tr>
                  <th>キャンセルされた画</th>
                  <td>{diag.cancelledStrokes}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <Card>
            <h3>確認のしかた</h3>
            <ol className="diag-steps">
              <li>Apple Pencilで線を書く → pointerTypeが「pen」になり、strokeが増える</li>
              <li>書きながら手のひらを画面に置く → 「touch拒否回数」だけが増え、strokeは増えない</li>
              <li>指でなぞる → 線は引かれず「touch拒否回数」が増える</li>
            </ol>
          </Card>
          <Card>
            <h3>ストローク一覧</h3>
            {strokes.length === 0 ? (
              <p className="tile-sub">まだ何も書かれていません</p>
            ) : (
              <table className="diag-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>type</th>
                    <th>点数</th>
                    <th>coalesced</th>
                    <th>時間</th>
                  </tr>
                </thead>
                <tbody>
                  {strokes.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td>{s.pointerType}</td>
                      <td>{s.points.length}</td>
                      <td>{s.usedCoalesced ? '○' : '—'}</td>
                      <td>{s.endedAt - s.startedAt}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                inkRef.current?.clear()
                setStrokes([])
              }}
            >
              クリア
            </Button>
          </Card>
        </div>
        <div className="split-right">
          <InkCanvas
            inkRef={inkRef}
            showGrid
            allowTouchInk={false}
            onDiag={setDiag}
            onInkChange={setStrokes}
            className="pad-box"
          />
        </div>
      </div>
    </div>
  )
}
