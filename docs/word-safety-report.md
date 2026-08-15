# 収録語・例文の安全性チェック結果

- 実行: `npx vite-node scripts/audit-safety.ts`
- 対象: 収録単語 **2400語** ／ 絵日記の例文 **153文**
- 検出: 原則削除(ng) **2件** / 要確認(check) **9件**

## 暴力・殺傷（原則削除）: 1件

| 種別 | ID | 一致 | 内容 |
|---|---|---|---|
| word | shoot | shoot | shoot / シュートする |

## 死・病気（要確認）: 4件

| 種別 | ID | 一致 | 内容 |
|---|---|---|---|
| word | die | die | die / 死ぬ |
| word | death | death | death / 死 |
| word | disease | disease | disease / 病気 |
| word | cancer | cancer | cancer / がん |

## 戦争（要確認）: 5件

| 種別 | ID | 一致 | 内容 |
|---|---|---|---|
| word | war | war | war / せんそう |
| word | nuclear | nuclear | nuclear / 核の |
| word | weapon | weapon | weapon / 武器 |
| word | army | army | army / 軍隊 |
| word | soldier | soldier | soldier / 兵士 |

## 犯罪・薬物（原則削除）: 1件

| 種別 | ID | 一致 | 内容 |
|---|---|---|---|
| word | bomb | bomb | bomb / 爆弾 |

