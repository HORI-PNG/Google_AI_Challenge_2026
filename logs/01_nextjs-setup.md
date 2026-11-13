# 段階1：Next.js の雛形（記録）

## 実装したこと
- `create-next-app@16.4.6` を一時フォルダで実行し、必要なファイルだけをリポジトリにコピーした
  - Next.js 16.4.6、React 19.3.0、TypeScript（strict）、App Router、Tailwind CSS 4.3.3、ESLint 9、`src/` ディレクトリ
  - Next.js 16 の初期設定で `cacheComponents` と `partialPrefetching` が有効になっている（そのまま使う）
- `package.json` の名前を `renote` にした
- `src/app/layout.tsx`：`lang="ja"`、タイトル「Re:Note」、スマホ向けの viewport、日本語フォント（Noto Sans JP）
- `src/app/globals.css`：色を CSS 変数（`--background`、`--card`、`--accent` など）で持つようにした。段階6 のテーマ切り替えで、この変数の値を差し替える
- `src/app/page.tsx`：仮のトップ画面（アプリ名、キャッチコピー、キャラクターの話しかけ、はかどり予報の枠、「日記を書く（準備中）」ボタン）
- `.env.example`：Gemini、Firebase、Google Maps の環境変数の項目名だけ（値は空）
- `README.md`：概要、起動のしかた、フォルダ構成
- `AGENTS.md`：Next.js 16 が `next dev` のたびに追記するブロック（「新しい Next.js の資料は `node_modules/next/dist/docs/` を読むこと」）を末尾に入れた
- `.gitignore`：雛形にあった `.pnp`、`coverage/`、`*.pem` を追記

## 変わったこと
- `npm run dev` でアプリが起動し、スマホ幅で「Re:Note」のトップ画面が見られるようになった
- 以降の段階（ログイン、日記、Gemini）を載せる土台ができた
- 環境変数の項目が `.env.example` で分かるようになった

## 動作確認
- `npm run lint`：エラーなし
- `npx tsc --noEmit`：エラーなし（`LayoutProps` の型はビルド時に `.next/types` に作られるので、ビルドの後に確認）
- `npm run build`：成功（`/` は静的ページ）
- 375px 幅の iframe に入れて Edge で撮影し、はみ出しや崩れがないことを確認した

## 予定から変わったこと
- `public/` の画像（Next.js や Vercel のロゴ）は使わないのでコピーしなかった。画像が必要になった段階で作る

## 残った課題・引き継ぎ
- `npm install` で「ESLint 9 はサポート終了」という警告が出る。`eslint-config-next@16.4.6` が ESLint 9 を指定しているので、今はそのままにする
- Node は WSL の nvm（v26.10.0）。非対話のシェルでは `source ~/.nvm/nvm.sh` が必要
- 段階2（Firebase ログイン）では、Firebase のプロジェクトと Web アプリの設定値が必要になる
