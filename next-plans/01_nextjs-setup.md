# 段階1：Next.js の雛形（予定）

## 目的
アプリの土台を作り、スマホ幅で表示できる最初の画面を用意する。以降の段階（ログイン、日記、Gemini）はこの上に作る。

## やること
- `create-next-app`（Next.js 16.4.6）で雛形を作る
  - TypeScript（strict）、App Router、Tailwind CSS、ESLint、`src/` ディレクトリを使う
  - 既存のファイル（PLAN.md、`src/prompts/` など）があるので、一時フォルダで作ってからこのリポジトリにコピーする
- パッケージ管理は npm、Node は WSL の nvm（v26.10.0）
- `.env.example` を作り、今後使う環境変数の項目名だけを書く（値は書かない）
  - `GEMINI_API_KEY`、`GEMINI_MODEL`
  - `NEXT_PUBLIC_FIREBASE_*`（Firebase の Web 設定）
  - `GOOGLE_MAPS_API_KEY`（Places API 用）
- トップページを仮の「Re:Note」画面にする（アプリ名とキャッチコピー、日記を書くボタンの見た目だけ）
- `lang="ja"`、スマホ向けの viewport、日本語フォント（Noto Sans JP）を設定する
- `README.md` に起動の手順を書く
- `npm run build` と `npm run lint` が通ることを確認する
- 375px 幅で崩れないことを確認する

## 作る・変えるファイル
- 新規：`package.json`、`package-lock.json`、`tsconfig.json`、`next.config.ts`、`eslint.config.mjs`、`postcss.config.mjs`、`src/app/`（`layout.tsx`、`page.tsx`、`globals.css`）、`public/`、`.env.example`、`README.md`
- 変更：`.gitignore`（必要なら追記）
- 変えないもの：`src/prompts/`

## 確認したいこと・必要なもの
- この段階では API キーなどは不要
- 段階2 で Firebase のプロジェクト作成をお願いする予定
