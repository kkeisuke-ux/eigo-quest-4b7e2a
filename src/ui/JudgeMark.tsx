// 判定マーク: 正解は大きな赤丸を「描く」アニメーション、不正解は×、スキップは→。
export function JudgeMark({ kind }: { kind: 'correct' | 'wrong' | 'skip' }) {
  return (
    <div className={`judge-mark judge-mark-${kind}`}>
      {kind === 'correct' && (
        <svg viewBox="0 0 100 100">
          <circle
            className="mark-circle"
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="#e0454f"
            strokeWidth="9"
            strokeLinecap="round"
            transform="rotate(-80 50 50)"
          />
        </svg>
      )}
      {kind === 'wrong' && (
        <svg viewBox="0 0 100 100">
          <line className="mark-x mark-x1" x1="24" y1="24" x2="76" y2="76" stroke="#4a67d8" strokeWidth="9" strokeLinecap="round" />
          <line className="mark-x mark-x2" x1="76" y1="24" x2="24" y2="76" stroke="#4a67d8" strokeWidth="9" strokeLinecap="round" />
        </svg>
      )}
      {kind === 'skip' && <span className="mark-skip">→</span>}
    </div>
  )
}
