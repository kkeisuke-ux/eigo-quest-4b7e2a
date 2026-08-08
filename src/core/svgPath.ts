// SVGパス(d属性)のパーサ＆点列サンプラ。
// KanjiVGで使われるコマンド（M/m, C/c, S/s, L/l, H/h, V/v, Q/q, T/t, Z/z）をサポート。
// A(円弧)は未対応で終点への直線として近似する（KanjiVGでは使用されない）。
import type { Pt } from './geometry'

const TOKEN_RE = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g

interface Token {
  cmd?: string
  num?: number
}

function tokenize(d: string): Token[] {
  const tokens: Token[] = []
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(d)) !== null) {
    if (m[1]) tokens.push({ cmd: m[1] })
    else tokens.push({ num: parseFloat(m[2]!) })
  }
  return tokens
}

function cubicPoint(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  }
}

function quadPoint(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

/**
 * パスを折れ線に展開する。1ストローク=1パスを想定（KanjiVG形式）。
 * subdivisions: 曲線1本あたりの分割数。
 */
export function flattenPath(d: string, subdivisions = 16): Pt[] {
  const tokens = tokenize(d)
  const pts: Pt[] = []
  let cur: Pt = { x: 0, y: 0 }
  let start: Pt = { x: 0, y: 0 }
  let prevCubicCtrl: Pt | null = null
  let prevQuadCtrl: Pt | null = null
  let i = 0
  let cmd = ''

  const push = (p: Pt) => {
    const last = pts[pts.length - 1]
    if (!last || Math.abs(last.x - p.x) > 1e-9 || Math.abs(last.y - p.y) > 1e-9) pts.push(p)
  }
  const readNum = (): number => {
    const t = tokens[i]
    if (!t || t.num === undefined) throw new Error(`svgPath: number expected at token ${i} in "${d.slice(0, 40)}..."`)
    i++
    return t.num
  }
  const hasNum = (): boolean => i < tokens.length && tokens[i].num !== undefined

  while (i < tokens.length) {
    const tok = tokens[i]
    if (tok.cmd !== undefined) {
      cmd = tok.cmd
      i++
    } else if (cmd === 'M') {
      cmd = 'L' // 暗黙の繰り返し
    } else if (cmd === 'm') {
      cmd = 'l'
    }
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()

    switch (C) {
      case 'M': {
        const x = readNum()
        const y = readNum()
        cur = rel ? { x: cur.x + x, y: cur.y + y } : { x, y }
        start = cur
        push(cur)
        prevCubicCtrl = null
        prevQuadCtrl = null
        break
      }
      case 'L': {
        const x = readNum()
        const y = readNum()
        cur = rel ? { x: cur.x + x, y: cur.y + y } : { x, y }
        push(cur)
        prevCubicCtrl = null
        prevQuadCtrl = null
        break
      }
      case 'H': {
        const x = readNum()
        cur = { x: rel ? cur.x + x : x, y: cur.y }
        push(cur)
        prevCubicCtrl = null
        prevQuadCtrl = null
        break
      }
      case 'V': {
        const y = readNum()
        cur = { x: cur.x, y: rel ? cur.y + y : y }
        push(cur)
        prevCubicCtrl = null
        prevQuadCtrl = null
        break
      }
      case 'C':
      case 'S': {
        let c1: Pt
        if (C === 'C') {
          const x1 = readNum()
          const y1 = readNum()
          c1 = rel ? { x: cur.x + x1, y: cur.y + y1 } : { x: x1, y: y1 }
        } else {
          c1 = prevCubicCtrl ? { x: 2 * cur.x - prevCubicCtrl.x, y: 2 * cur.y - prevCubicCtrl.y } : cur
        }
        const x2 = readNum()
        const y2 = readNum()
        const x = readNum()
        const y = readNum()
        const c2 = rel ? { x: cur.x + x2, y: cur.y + y2 } : { x: x2, y: y2 }
        const end = rel ? { x: cur.x + x, y: cur.y + y } : { x, y }
        for (let k = 1; k <= subdivisions; k++) push(cubicPoint(cur, c1, c2, end, k / subdivisions))
        cur = end
        prevCubicCtrl = c2
        prevQuadCtrl = null
        break
      }
      case 'Q':
      case 'T': {
        let c1: Pt
        if (C === 'Q') {
          const x1 = readNum()
          const y1 = readNum()
          c1 = rel ? { x: cur.x + x1, y: cur.y + y1 } : { x: x1, y: y1 }
        } else {
          c1 = prevQuadCtrl ? { x: 2 * cur.x - prevQuadCtrl.x, y: 2 * cur.y - prevQuadCtrl.y } : cur
        }
        const x = readNum()
        const y = readNum()
        const end = rel ? { x: cur.x + x, y: cur.y + y } : { x, y }
        for (let k = 1; k <= subdivisions; k++) push(quadPoint(cur, c1, end, k / subdivisions))
        cur = end
        prevQuadCtrl = c1
        prevCubicCtrl = null
        break
      }
      case 'A': {
        // 未対応: 7引数読み捨てて終点へ直線
        readNum()
        readNum()
        readNum()
        readNum()
        readNum()
        const x = readNum()
        const y = readNum()
        cur = rel ? { x: cur.x + x, y: cur.y + y } : { x, y }
        push(cur)
        prevCubicCtrl = null
        prevQuadCtrl = null
        break
      }
      case 'Z': {
        push(start)
        cur = start
        prevCubicCtrl = null
        prevQuadCtrl = null
        break
      }
      default:
        // 未知コマンド: 数値をスキップして続行
        while (hasNum()) i++
        break
    }
  }
  return pts
}
