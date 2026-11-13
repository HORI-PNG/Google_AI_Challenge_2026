# 段階3：文章の日記 ＋ Gemini で感情の点数化 ＋ 保存（記録）

## 計画の変更（ユーザーと決めたこと）
- 無料版の Gemini は接続が切れやすいので、**Gemini の中で粘る**仕組みを入れた。Claude など他社の AI への切り替えは、応募条件（Google AI を主要な制作手段にする）に合わせて入れないことにした
  - 同じモデルで最大 3 回（間に 1 秒、2 秒待つ）→ 別の Gemini モデルで最大 3 回 → それでもだめなら日記だけ保存して、あとで分析し直せる
- 初回に基本情報（名前・ニックネーム・学年）を登録してもらうことにした（学年をプロンプトに渡すため）
- `PLAN.md`（データ構造、「Gemini がつながらないときの方針」）と `.agents/rules/gemini.md` に反映した

## 準備（ユーザーが行ったこと）
- Google AI Studio で、Firebase と同じプロジェクト `ai-challenge-2026` に Gemini の API キーを作り、`.env.local` に入れた
- 使えるモデルの一覧から、メイン `gemini-3.8-flash`、切り替え先 `gemini-3.5-flash-lite` に決めた

## 実装したこと
### サーバー側（Gemini）
- `@google/genai` 3.3.0、`zod`、`jose`、`server-only` を追加
- `src/lib/retry.ts`：「同じモデルで3回 → 次のモデル」のやり直しの仕組み。失敗の種類を 3 つに分けた
  - やり直す：混雑 `503`、回数制限 `429`、`408`・`500`・`502`・`504`、タイムアウト、JSON の崩れ、スキーマに合わない返事
  - 次のモデルへ：`404`（モデルが見つからない）
  - すぐにやめる：`400`・`401`・`403`（API キーなどの設定の誤り）
- `src/lib/server/gemini.ts`：構造化出力（JSON スキーマ）で Gemini を呼び、返事を zod で確かめる。1 回の待ち時間は最大 20 秒。SDK の自動やり直し（初期設定では最大 5 回、最大 60 秒待つ）は止め、上の仕組みで数える。ログにはモデル名と失敗の種類だけを出し、日記の本文は出さない
- `src/lib/server/prompts.ts`、`src/lib/promptFile.ts`：`src/prompts/01_diary_analysis.md` の「システム指示」と「出力スキーマ」を実行時にそのまま読み込む（AI Studio で試したものとずれないように、コードに書き写さない）。`next.config.ts` の `outputFileTracingIncludes` で、本番にも md を含める
- `src/lib/server/verifyIdToken.ts`：Firebase の ID トークンを Google の公開鍵で確かめる。秘密鍵（サービスアカウント）は不要
- `src/app/api/analyze/route.ts`：`POST /api/analyze`。ログインの確認 → 入力の確認 → プロンプトの「入力の形」に合わせて Gemini に渡す → 結果を返す。`maxDuration` は 150 秒
- `src/lib/diaryAnalysis.ts`：分析結果の zod スキーマ（点数は 0〜100 の整数、感情ラベルは一覧から。多すぎるときは先頭の 3 つだけ使う）

### ブラウザ側
- `src/lib/userProfile.ts`、`src/components/ProfileForm.tsx`、`src/app/welcome/page.tsx`：初回の基本情報の登録。名前は Google アカウントの名前を最初から入れておく。Gemini には学年だけを渡し、名前とニックネームは送らない
- `src/components/AuthProvider.tsx`：基本情報の読み込み状態も共有するようにした
- `src/components/RequireProfile.tsx`：ログインと基本情報の登録が済んでいないページでは、トップや `/welcome` に案内する
- `src/lib/diaries.ts`：日記の保存（**先に本文を保存** → 分析 → 結果を書き足す）、失敗したときは `analysisStatus: "failed"` にする、最新の日記の読み込み
- `src/app/diary/new/page.tsx`、`src/components/DiaryForm.tsx`：日記を書く画面。分析中の表示、失敗したときの「もう一度分析する」「あとで分析する」
- `src/components/AnalysisResult.tsx`：4 つの点数、感情ラベル、理由、ハカドリのひとこと、学んだこと
- `src/components/ConcernNotice.tsx`：`watch` のときはやさしい案内、`urgent` のときは点数を出さず相談窓口（24時間子供SOSダイヤル、よりそいホットライン、まもろうよ こころ）を案内する
- `src/components/LatestDiary.tsx`、`src/components/HomeScreen.tsx`：ホームに最新の日記の結果を出す。分析できていない日記は、ホームから「今から分析する」でやり直せる

### テスト
- `tests/unit/retry.test.mjs`：やり直しと切り替えの 7 件（3 回目で成功、3 回失敗で切り替え、合計 6 回で失敗、404 は次のモデルへ、403 はすぐやめる、など）
- `tests/unit/diaryAnalysisPrompt.test.mjs`：md のプロンプトを読み込めること、md の出力スキーマとアプリ側のスキーマ（必須項目、感情ラベル）が一致していること、点数の範囲など 7 件
- ルールのテストは `tests/rules/` に移した。`npm test`（単体）と `npm run test:rules`（ルール）に分けた

## 変わったこと
- 日記を書くと、Gemini が感情を点数にし、ハカドリがひとこと返すようになった（アプリの核が動いた）
- Gemini が混んでいても、別の Gemini モデルに切り替えて結果を返せるようになった。全部失敗しても日記は消えず、あとから分析し直せる
- 初回に基本情報を登録し、ハカドリがニックネームで呼ぶようになった
- 自分を傷つける気持ちが書かれた日記には、点数ではなく相談窓口が表示されるようになった
- Gemini を呼ぶ API は、ログインした本人しか使えない

## 動作確認
- `npm test`：14 件成功
- `npm run lint`、`npx tsc --noEmit`、`npm run build`：成功
- `POST /api/analyze` は、トークンなし・偽のトークンのとき 401 を返すことを確認
- 本番の成果物（`.next/server/app/api/analyze/route.js.nft.json`）に `src/prompts/*.md` が含まれることを確認
- 架空の日記（`test_data.md` の A1・A8）で両方のモデルを試した
  - `gemini-3.8-flash`：`503`（混雑）と `504`（タイムアウト）で失敗。無料版で切れやすいことを確認した
  - `gemini-3.5-flash-lite`：2 件とも成功。A1 は期待どおり（energy 低め、stress やや高め、学んだこと「数学」）。A8 は `concern_level: urgent` で、相談をすすめる返事になった
- ユーザーがブラウザで基本情報の登録 → 日記 → 分析結果の表示までを確認した

## 残った課題・引き継ぎ
- `gemini-3.8-flash` が混んでいると、3 回待ってから切り替えるため、結果まで数十秒かかることがある。混雑が続くようなら、メインを別のモデルにするか、撮影期間だけ有料プランにする
- A8 のハカドリの返事が、プロンプトの「60 字以内」を超えていた。AI Studio でプロンプトを調整するときに直す（`src/prompts/01_diary_analysis.md`）
- 相談窓口の電話番号と URL は、公開前にもう一度確認する
- `/api/analyze` には、1 人あたりの回数制限をまだ入れていない（公開前に検討）
- 段階4（音声入力・項目選択）では、`inputType` に `voice` と `select` を足し、音声は Gemini にそのまま渡す
