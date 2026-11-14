# 段階10：Vercel で公開（予定）

## 目的
スマホから使える URL でアプリを公開し、デモ動画の撮影と応募（作品の URL）に使えるようにする。

## やること
- Vercel（Hobby プラン・無料）に GitHub のリポジトリをつなぎ、`main` を本番として公開する
  - `main` に merge するたびに自動で公開し直される。PR ごとにプレビューの URL もできる
- 環境変数を Vercel に設定する（値は `.env.local` と同じ。Git には入れない）
  - `GEMINI_API_KEY`、`GEMINI_MODEL`、`GEMINI_FALLBACK_MODEL`、`NEXT_PUBLIC_FIREBASE_*`（6 つ）
  - Places API は使わない（段階9 で決めたこと）ので、`GOOGLE_MAPS_API_KEY` は入れない
- Firebase Authentication の「承認済みドメイン」に、公開した URL（`〇〇.vercel.app`）を足す（Google ログインに必要）
- 公開した URL で確かめる：ログイン、日記の分析、音声入力、予報、テーマ、スマホ（375px）での表示
- 公開したことで、誰でも Google ログインして Gemini を使えるようになるため、使いすぎを防ぐ仕組みを入れる（下の確認による）
- README に公開 URL と、ローカルでの動かし方を書く

## 作る・変えるファイル
- 変更：README.md、（使いすぎ対策を入れるなら）`src/lib/server/` と Gemini を呼ぶ 3 つの API、`.env.example`、PLAN.md
- Vercel 用の設定ファイル（`vercel.json`）は要らない見込み（Next.js は自動で判定される）

## ユーザーに確認したいこと・必要なもの
- Vercel のアカウント（GitHub でログイン）と、リポジトリをつなぐ操作
- 環境変数の値の入力（秘密の値なので、ご自身で Vercel の画面に入れてもらう）
- Gemini API キーが無料枠（請求先なし）かどうか
- 公開した URL を、誰でも使えるようにするか、自分（と審査の人）だけにするか
