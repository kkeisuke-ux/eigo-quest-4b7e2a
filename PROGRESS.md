# えいごクエスト PROGRESS

## 現在の状態（2026-08-08）

**MVP完成・ビルド成功・主要フロー動作確認済み。実機（iPad + Apple Pencil）検証が次の一手。**

- 仕様 §67 の完成条件 A〜O をすべて実装（詳細は README §2）
- `npm run build` 成功、Service Worker生成済み、PWAとしてオフライン動作可
- Playwright（PC Chrome）で動作確認済み:
  - プロフィール作成 → ホーム → アルファベットなぞり（書き順ガイド・始点●・方向アニメ表示）
  - 単語4ステップ練習: 合成ポインタで「dog」を筆記 → 自動判定 → 正解○ → STEP2へ進行
  - 絵日記: 添削「i go park yesterday」→「I went to the park yesterday.」＋説明4件（仕様§30の例どおり）
- 認識エンジンの自動テスト: 自己分類 52/52、ノイズ・回転・書き順逆転 156/156、
  別文字の誤受理 0/120、約85ms/判定（README §3）

## 次の一手

1. **実機検証**: `npm run deploy`（GitHub Pages: リポジトリ `eigo-quest-4b7e2a`）→ iPadのSafariで開き
   「ホーム画面に追加」→ Apple Pencilで書いて、設定→Apple Pencil診断で palm rejection を確認
2. 子どもの実筆記で判定のきびしさを調整（設定 → 判定デバッグ。サンプル収集・ラベル付け機能あり）
3. 音源ファイルの配置（README §4 の対応表。OtoLogic / DOVA-SYNDROME からダウンロードして
   `public/audio/` へ。無くても合成音で全機能動作する）

## 残タスク（MVP外・優先度低）

- 英文練習モード（sentences.ts のお手本書き写し画面。データは準備済み）
- 単語イラストの本格画像化（現在は絵文字。構造は差し替え可能）
- 語彙の拡張（現在120語: ようじ×3学期＋小1相当×3学期。words.jsonに追記するだけ）
- キャラクター追加（現在10系列25段階。species.tsに追記するだけ）

## 技術メモ

- かんじクエストがポート4173/4174等を使っていることがあるため、previewは空きポートに自動移動する
  （起動ログに実際のURLが出る）
- PC開発時はマウスでも書ける（pointerType 'mouse' を許可。'touch' は既定で拒否 = palm rejection）
- 旧Service Workerが残っている場合は DevTools → Application → Service Workers から削除
