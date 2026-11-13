# 段階2：Firebase ログイン（Google）＋ Firestore のセキュリティルール（記録）

## 準備（ユーザーが Firebase コンソールで行ったこと）
- Firebase プロジェクト `ai-challenge-2026` を作成（Spark プラン、Google アナリティクスなし）
- Authentication で Google ログインを有効化
- Firestore（Standard、`asia-northeast1`、本番環境モード）を作成
- Web アプリを登録し、設定値を `.env.local` に入れた
- WSL で `npx firebase login`

## 実装したこと
- `firebase`（Web SDK 13.3.0）を追加
- `src/lib/firebase.ts`：`.env.local` の値から Firebase を初期化。サーバーでの事前描画で動かないよう、使うときに初めて初期化する。設定が足りないときは画面に分かる説明を出す
- `src/lib/userProfile.ts`：初めてログインした人の `users/{uid}` を作り、`settings`（`themeId: "default"`、`characterId: "default"`、`locationEnabled: false`）と `createdAt` を入れる。名前やメールアドレスは Firestore に保存しない
- `src/components/AuthProvider.tsx`：ログイン状態（読み込み中／ログアウト／ログイン）を画面全体で共有。Google ログインはポップアップ方式。ポップアップを自分で閉じたときはエラーにしない。ブロックされたときや保存が拒否されたときは日本語で説明を出す
- `src/components/LoginButton.tsx`、`src/components/HomeScreen.tsx`：ログアウト中は「Google でログイン」、ログイン中は「◯◯ さん、今日はどんな一日だった？」とログアウトボタン（UI は段階6・7 で作り直す）
- `firestore.rules`：`users/{uid}` とその下は、ログインした本人だけが読み書きできる。それ以外はすべて拒否
- `firebase.json`、`.firebaserc`：Firebase CLI でルールを反映するための設定
- `tests/firestore.rules.test.mjs`：エミュレータでルールを確かめるテスト 5 件
- `package.json` に `test:rules`（エミュレータでテスト）と `deploy:rules`（ルールの反映）を追加。開発用に `firebase-tools` と `@firebase/rules-unit-testing` を追加
- `.gitignore` にエミュレータのログを追加。`README.md` にコマンドとフォルダを追記

## 変わったこと
- Google アカウントでログイン・ログアウトできるようになった
- 初めてログインすると Firestore に `users/{uid}` が作られ、段階3 で日記を保存する場所ができた
- 日記を含む `users/{uid}` の下は、本人以外（他人、ログインしていない人）からは読めず、書けなくなった

## 動作確認
- `npm run lint`、`npx tsc --noEmit`、`npm run build`：すべて成功
- `npm run test:rules`：5 件すべて成功
  - 本人は自分の `users/{uid}` と日記を作って読める
  - 他人の `users/{uid}` と日記は読めない・書けない
  - ログインしていない人は読めない・書けない
  - `users` 以外の場所は拒否される
- `npm run deploy:rules` で `ai-challenge-2026` にルールを反映した
- ユーザーがブラウザで Google ログインし、Firestore に `users/{uid}`（`settings` と `createdAt`）が作られたことをコンソールで確認した
  - ルールの反映より前にログインしたときは「データの保存が許可されませんでした」と表示された（本番環境モードの初期ルールで拒否されたため）。反映後は解消

## 予定から変わったこと
- ログイン後の画面を `src/components/HomeScreen.tsx` に分けた（`page.tsx` はそれを表示するだけ）
- ルールの確認用にテスト（`tests/`）とエミュレータの仕組みを足した

## 残った課題・引き継ぎ
- npm がインストール用スクリプトを3つ止めている（`@firebase/util`、`protobufjs`、`re2`）。どれも今回の用途には不要で、動作に問題はない
- Vercel で公開するときは、Firebase の Authentication の「承認済みドメイン」に Vercel のドメインを追加する必要がある（段階10）
- 公開前に、Firebase の API キーを自分のドメインからだけ使えるように制限する（段階10）
- 段階3（日記と Gemini）では、Google AI Studio で Gemini の API キーを作り、`.env.local` の `GEMINI_API_KEY` と `GEMINI_MODEL` に入れてもらう必要がある
