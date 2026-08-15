# 同梱している第三者素材と、その出典・条件

えいごクエストは、効果音・BGM・発音音声に第三者の素材やツールを利用しています。
これらは**元の提供条件のまま**で、本アプリのライセンス（CC BY-NC-SA 4.0、LICENSE参照）の
非営利条件は適用されません。

| 素材 | 出典 | 条件 | 該当ファイル |
|---|---|---|---|
| 効果音（正解音・ジングル等） | [OtoLogic](https://otologic.jp) | CC BY 4.0（**クレジット表記が必要**。アプリ内「設定 → つかっている音の素材」に表示） | `public/audio/se-*.mp3` |
| BGM「ポップン・ダッシュ」「おでかけしましょ」 | [DOVA-SYNDROME](https://dova-s.jp) | 利用規約に従う。**素材ファイルそのものの二次的な公開・配布は禁止**されているため、本リポジトリには含めない（`.gitignore`）。アプリへの組み込み利用のみ | `public/audio/bgm-home.mp3` / `bgm-study.mp3`（リポジトリ非同梱） |
| 発音音声（アルファベット・単語・例文） | [Piper TTS](https://github.com/rhasspy/piper)（MIT）＋ 音声モデル `en_US-amy-medium`（[piper-voices](https://huggingface.co/rhasspy/piper-voices)。[Mimic 3 voices](https://github.com/MycroftAI/mimic3-voices) 由来、同リポジトリは CC BY-SA 4.0） | ローカル合成した音声。出力音声そのものの権利について明示的な規定が無いため、出典を明記のうえ非営利利用に留める | `public/audio/voice/*.mp3`（リポジトリ非同梱。`node scripts/gen-voice.mjs` で再生成） |

## 補足

- 音源ファイルが無い場合は、アプリ内蔵の Web Audio API による合成音にフォールバックします
  （音源を同梱しなくてもアプリは動作します）。
- 単語・例文・キャラクター・イラスト・UI・コードは本プロジェクトのオリジナルです。
- 発音音声（`public/audio/voice/`）も、権利関係が明示されていないためリポジトリには含めていません。
  `node scripts/gen-voice.mjs`（Piper TTS）で再生成できます。音声ファイルが無い場合は
  ブラウザ内蔵のTTS（SpeechSynthesis）にフォールバックします。
- BGMを再配置したい場合は、DOVA-SYNDROME から各自ダウンロードし、
  `public/audio/bgm-home.mp3` / `bgm-study.mp3` として置いてください（README §4 の対応表を参照）。
