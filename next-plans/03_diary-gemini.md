# 段階3：文章の日記 ＋ Gemini で感情の点数化 ＋ 保存（予定）

## 目的
アプリの核である「気持ちを書く → Gemini が感情を点数にする → キャラクターがひとこと返す」を動かす。
無料版の Gemini API で接続が切れやすいことへの対策（やり直し、別の Gemini モデルへの切り替え）もこの段階で入れる。

## 計画の変更（ユーザーと決めたこと）
- 無料版の Gemini は接続が切れやすいので、次の順で粘る。**Claude など他社の AI には切り替えない**（応募条件と `.agents/rules/gemini.md` に合わせる）
  1. 失敗したら 1 秒、2 秒と待って、同じモデルで最大 3 回まで試す（混雑 `503`、回数制限 `429`、タイムアウト、JSON の形の崩れ）
  2. 3 回とも失敗したら、別の Gemini モデル（`GEMINI_FALLBACK_MODEL`、例：Flash-Lite）に切り替えて、同じように最大 3 回
  3. それでも失敗したら、日記の本文だけ保存し、「あとで分析する」ボタンを出す
- 回数は「1 回の呼び出しの中」で数える（Vercel ではサーバーが呼び出しごとに変わることがあり、呼び出しをまたいで数えられないため）
- デモ動画の撮影期間だけ、Gemini を有料プランにすることも検討する（任意）
- `PLAN.md` と `.agents/rules/gemini.md` に、この方針を書き足す

## やること
### 初回の基本情報の登録（ユーザーの希望で追加）
- 初めてログインした人には、日記を書く前に `/welcome` で基本情報を登録してもらう
  - 名前（Google アカウントの名前を最初から入れておく。変えてもよい）
  - ニックネーム（ハカドリが呼ぶときの名前）
  - 学年（中学1〜3年、高校1〜3年、大学1〜4年、大学院（修士）、大学院（博士）、その他）
- `users/{uid}.profile` に `{ name, nickname, grade }` として保存する。登録が済むまでトップ画面は `/welcome` に案内する
- Gemini に渡すのは **学年だけ**（名前とニックネームは送らない）。ニックネームは画面の表示に使う

### 日記の保存と分析の流れ
1. ブラウザで日記を書き、Firestore の `users/{uid}/diaries/{diaryId}` に **先に本文を保存**する（`analysisStatus: "pending"`）
2. ブラウザから Route Handler `POST /api/analyze` に本文を送る。Firebase の ID トークンを付け、サーバーで本物かを確かめる（他人が API を使って Gemini の回数を使い切らないように）
3. サーバーで Gemini を呼ぶ（上の「粘る」仕組み）。結果を JSON スキーマで確かめてからブラウザに返す
4. ブラウザで日記のドキュメントに点数などを書き足す（`analysisStatus: "done"`）。失敗したら `"failed"` にして「あとで分析する」ボタンを出す
- サーバーは Firestore に書かないので、Firebase の秘密鍵（サービスアカウント）は不要。ID トークンは Google の公開鍵で確かめる（`jose`）

### Gemini
- `@google/genai`（3.3.0）を使う。サーバー側だけで呼ぶ
- モデル名は環境変数 `GEMINI_MODEL`（メイン）と `GEMINI_FALLBACK_MODEL`（切り替え先）
- プロンプトは `src/prompts/01_diary_analysis.md` の「システム指示」と「出力スキーマ」をそのまま読み込んで使う（AI Studio で試したものと同じにするため、コードに書き写さない）
- Temperature 0.3、構造化出力（JSON スキーマ）
- 返ってきた JSON は `zod` で形を確かめる（点数が 0〜100 の整数か、感情ラベルが一覧にあるか、など）
- ログに日記の本文を出さない（エラーの種類とモデル名だけ）

### 画面（最小限。UI は段階6・7 で作り直す）
- `/diary/new`：日記を書く画面（文章のみ。音声と項目選択は段階4）
- 分析の結果：4 つの点数、感情ラベル、理由、ハカドリのひとこと、学んだこと
- `concern_level` が `urgent` のときは、点数を出さず、相談窓口の案内を出す。`watch` のときは、やさしい案内を添える
- トップ画面：「日記を書く」ボタンを使えるようにし、最新の日記の結果を出す

### データ構造（PLAN.md の更新）
`users/{uid}` に `profile { name, nickname, grade }` を足す。
`users/{uid}/diaries/{diaryId}` に、プロンプトの出力に合わせて次を足す。
- `reason`、`confidence`、`concernLevel`
- `analysisStatus`（`pending` / `done` / `failed`）、`analyzedModel`（どのモデルで分析したか）

## 作る・変えるファイル
- 新規：`src/app/welcome/page.tsx`、`src/components/ProfileForm.tsx`、`src/app/diary/new/page.tsx`、`src/app/api/analyze/route.ts`、`src/lib/gemini.ts`（呼び出しとやり直し）、`src/lib/prompts.ts`（md の読み込み）、`src/lib/diaryAnalysis.ts`（型と zod スキーマ）、`src/lib/verifyIdToken.ts`、`src/lib/diaries.ts`（Firestore の読み書き）、`src/components/DiaryForm.tsx`、`src/components/AnalysisResult.tsx`、`src/components/ConcernNotice.tsx`、テスト
- 変更：`src/components/HomeScreen.tsx`、`.env.example`、`PLAN.md`、`.agents/rules/gemini.md`、`README.md`、`package.json`

## 確認したいこと・必要なもの
- `.env.local` に `GEMINI_API_KEY`、`GEMINI_MODEL`、`GEMINI_FALLBACK_MODEL` を入れてもらう（モデル名は、キーが入ったら API で使えるモデルの一覧を出して一緒に決める）
- プロンプトの入力にある `grade`（学年）の扱い → 初回に基本情報（名前・ニックネーム・学年）を登録してもらう（確認済み）
