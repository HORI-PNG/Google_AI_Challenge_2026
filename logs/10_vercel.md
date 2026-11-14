# 段階10：Vercel で公開（記録）

## 決めたこと（ユーザーに確認済み）
- 公開した URL は誰でも使えるようにし、Gemini は 1 人 1 日の上限をつける
- Gemini API キーは無料枠（請求先なし）。使いすぎても料金はかからず、上限に達すると一時的に使えなくなるだけ
- 公開の作業は Claude に任せる（Vercel の許可と、Firebase の承認済みドメインはユーザーが操作）
- Places API のキーは入れない（段階9 で決めたこと）

## 実装したこと
### 1 人 1 日の上限
- `src/lib/server/usage.ts`：Gemini を呼ぶ 4 つの API（分析・声・話しかけ・予報）で、呼ぶ前に 1 回数える。上限（`GEMINI_DAILY_LIMIT`、初期 50）に達したら 429（`daily_limit`）を返し、「今日 Gemini を使える回数の上限に達しました。明日また使えます。」と出す
- 回数は `users/{uid}/usage/{日本時間の日付}` に、本人の ID トークンで Firestore の REST API から書く（サービスアカウントの秘密鍵は使わない）。同時に数えてぶつかったら、読み直して 3 回までやり直す
- Firestore につながらないときは、アプリが止まらないよう数えずに通す（ログに状態コードだけ出す）
- `firestore.rules`：`usage` は 1 から始めて 1 ずつしか増やせない・消せない。ほかのコレクションは今までどおり本人だけ。`npm run deploy:rules` で本番に反映した
- テスト：単体（`tests/unit/usage.test.mjs`）3 件、ルール 2 件を追加

### Vercel
- Vercel プロジェクト `renote`（Hobby プラン・無料）を作り、GitHub のリポジトリとつないだ。`main` に merge すると本番が更新される
- 環境変数：Gemini（`GEMINI_API_KEY` は sensitive）、`GEMINI_MODEL`、`GEMINI_FALLBACK_MODEL`、`GEMINI_DAILY_LIMIT=50`、Firebase の 6 つ（本番とプレビュー）
- 本番の URL：**https://renote-olive.vercel.app**
- Firebase Authentication の承認済みドメインに `renote-olive.vercel.app` を足した（ユーザー）

### ドキュメント
- README：公開の手順と上限のこと。`.env.example`：`GEMINI_DAILY_LIMIT`。PLAN.md：`usage/{date}`

## 変わったこと
- スマホから URL を開くだけで使えるようになった（デモ動画の撮影、応募の作品 URL に使える）
- 誰か 1 人に Gemini の無料枠を使い切られることがなくなった

## 動作確認
- `npm test`（90 件）、`npm run test:rules`（7 件）、`npm run lint`、`npx tsc --noEmit`：成功
- Vercel のビルド：成功
- ユーザーが公開版で確認：ログイン、日記の分析、ホームの表示
- Vercel のログ：`/api/analyze`・`/api/character` が呼ばれ、エラーなし（回数の読み書きの失敗もなし）

## 残った課題・引き継ぎ
- Vercel では、プロジェクトの最初の公開が本番扱いになるため、今の本番は段階10 のブランチから作られている。merge 後は `main` から作り直される
- サーバーはアメリカ東部（iad1）。遅いと感じたら東京（hnd1）に移せる
- PR ごとのプレビューの URL は Vercel のログインが必要（初期設定の保護）。プレビューで Google ログインを試すなら、そのドメインも Firebase に足す
- 段階11〜：補助機能（忘却曲線、マップ、カレンダー）
