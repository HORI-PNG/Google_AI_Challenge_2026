# 段階2：Firebase ログイン（Google）＋ Firestore のセキュリティルール（予定）

## 目的
Google アカウントでログインできるようにし、日記を「本人だけが読み書きできる」場所に保存する準備をする。
段階3（日記の保存）は、この段階のログインとルールを前提にする。

## やること
- `firebase`（Web SDK 13.3.0）を入れる
- `src/lib/firebase.ts`：`.env.local` の `NEXT_PUBLIC_FIREBASE_*` から Firebase を初期化し、Auth と Firestore を使えるようにする
- `src/components/AuthProvider.tsx`：ログイン状態を画面全体で共有する（`onAuthStateChanged`）
- ログイン・ログアウト
  - Google ログインは `signInWithPopup` を使う（Vercel で公開したときにリダイレクト方式より安定するため）
  - 初めてログインした人には `users/{uid}` を作り、`settings`（`themeId`、`characterId`、`locationEnabled: false`）の初期値を入れる。位置情報は初期設定でオフ（privacy.md）
- 画面（UI は後の段階で作り直すので最小限）
  - ログアウト中：アプリ名と「Google でログイン」ボタン
  - ログイン中：「◯◯ さん、こんにちは」とログアウトボタン、今の仮のトップ画面
- `firestore.rules`：`users/{uid}` とその下（日記など）は、ログインした本人だけが読み書きできる。それ以外はすべて拒否
- `firebase.json`、`.firebaserc`：ルールを Firebase CLI で反映できるようにする
- ルールを Firebase に反映する（方法は下の「確認したいこと」）
- `npm run lint`、型チェック、`npm run build`、375px 幅での表示、実際のログインを確認する

## 作る・変えるファイル
- 新規：`src/lib/firebase.ts`、`src/lib/userProfile.ts`、`src/components/AuthProvider.tsx`、`src/components/LoginButton.tsx`、`firestore.rules`、`firebase.json`、`.firebaserc`
- 変更：`src/app/layout.tsx`、`src/app/page.tsx`、`package.json`、`package-lock.json`、`README.md`、`PLAN.md`（データ構造の `settings` の書き方を実装に合わせる場合のみ）

## 確認したいこと・必要なもの
- セキュリティルールの反映方法（Firebase CLI か、コンソールに貼るか）
- 実際のログインの確認は、ブラウザで Google アカウントを選ぶ操作が要るので、ユーザーにお願いする
