// 学年ラベル（0=ようじ, 1-6=小1-小6, 7-9=中1-中3。仕様 §52「年齢または学年」）
export const GRADE_LABELS = ['ようじ', '小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3']

export function gradeLabelOf(grade: number): string {
  return GRADE_LABELS[grade] ?? `学年${grade}`
}
