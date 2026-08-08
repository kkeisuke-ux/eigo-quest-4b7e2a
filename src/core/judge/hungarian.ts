// Hungarian algorithm（Jonker–Volgenant系のポテンシャル法, O(n^3)）。
// 正方コスト行列 cost[n][n] に対して、行→列の最小コスト割当を返す（仕様 §6）。
export function hungarian(cost: number[][]): number[] {
  const n = cost.length
  if (n === 0) return []
  const u = new Float64Array(n + 1)
  const v = new Float64Array(n + 1)
  const p = new Int32Array(n + 1) // p[j] = 列jに割当てられた行（1始まり、0=なし）
  const way = new Int32Array(n + 1)

  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Float64Array(n + 1).fill(Infinity)
    const used = new Uint8Array(n + 1)
    do {
      used[j0] = 1
      const i0 = p[j0]
      let delta = Infinity
      let j1 = 0
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue
        const curCost = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (curCost < minv[j]) {
          minv[j] = curCost
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)
    // 増加路をたどって割当を更新
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }

  const assignment = new Array<number>(n).fill(-1)
  for (let j = 1; j <= n; j++) {
    if (p[j] > 0) assignment[p[j] - 1] = j - 1
  }
  return assignment
}
