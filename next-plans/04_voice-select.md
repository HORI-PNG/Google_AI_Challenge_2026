# 段階4：音声入力・項目選択の入力（予定）

## 目的
PLAN.md の「日記入力（3つの方法）」のうち、残りの 2 つ（声で話す、項目を選ぶ）を作る。
書くのが面倒な日でも日記を続けられるようにし、デモ動画の「気持ちをそのまま話すだけで、Gemini が感情を点数にする」場面を撮れるようにする。

## やること
### 日記を書く画面に「書く／話す／選ぶ」の切り替えを付ける
- `/diary/new` の上部に 3 つのタブを置く。どれで書いても、そのあとの流れ（本文を先に保存 → 分析 → 結果）は段階3 と同じ

### 声で話す（音声日記）
- ブラウザの `MediaRecorder` でマイクから録音する（最大 3 分。残り時間を表示）
- 録音を `POST /api/transcribe` に送り、**Gemini に音声をそのまま渡して文章にする**（`.agents/rules/gemini.md`）
  - 新しいプロンプト `src/prompts/04_voice_transcription.md` を作る（話し言葉を読みやすい文章に整える。言いよどみは取るが、内容は足さない・まとめない）
  - 段階3 の「同じモデルで3回 → 別の Gemini モデルで3回」の仕組みをそのまま使う
- 文章になったものを画面に出し、**本人が確認・直してから**「保存して分析する」を押す（聞き間違いをそのまま保存しないため）
- 保存するのは文章だけ。**音声は Firestore にも、サーバーにも残さない**（privacy.md）
- 分析は `input_type: voice` で行う（プロンプト①は「話し言葉なので言いよどみは無視する」と指示している）
- 録音サイズの上限：Vercel の受け取れる大きさ（約 4.5MB）に収まるよう、3 分・低めのビットレートにする

### 項目を選ぶ
- 次の項目を選ぶ（ひとことは任意）
  - 気分（1つ）：😄 とても良い／🙂 良い／😐 ふつう／😞 いまいち／😢 つらい
  - 体調（1つ）：💪 元気／🙂 ふつう／😪 眠い／🥱 疲れた／🤒 体調が悪い
  - 今日あったこと（いくつでも）：授業、テスト勉強、宿題・課題、塾、部活、研究、バイト、友だちと過ごした、家族と過ごした、家でのんびり、その他
  - ひとこと（任意、100 文字まで）
- プロンプト①の「項目選択の場合の例」と同じ形の文章（`selected:` のあとに項目を並べる）にして `rawText` に保存し、`input_type: select` で分析する

### サーバー
- `POST /api/analyze` の `inputType` を `text`／`voice`／`select` に広げる
- `POST /api/transcribe` を新しく作る（ログインの確認、音声の形式と大きさの確認、Gemini の呼び出し）

## 作る・変えるファイル
- 新規：`src/prompts/04_voice_transcription.md`、`src/app/api/transcribe/route.ts`、`src/components/VoiceRecorder.tsx`、`src/components/SelectDiaryForm.tsx`、`src/lib/selectDiary.ts`（選択肢と文章への変換）、テスト
- 変更：`src/components/DiaryForm.tsx`（タブ）、`src/lib/diaryAnalysis.ts`、`src/lib/diaries.ts`、`src/lib/server/gemini.ts`（音声を渡せるように）、`src/app/api/analyze/route.ts`、`next.config.ts`、`src/prompts/README.md`、`PLAN.md`（必要なら）、`README.md`

## 確認したいこと・必要なもの
- 音声の流れ（文章にしたあと、本人が確認・修正してから保存）でよいか
- 項目選択の選択肢
- 新しいプロンプト `04_voice_transcription.md` は、まだ AI Studio で試していない。アプリで動かしたあと、AI Studio でも試して同じ内容にそろえる
- 動作確認ではマイクを使うので、ブラウザでの録音をお願いする
