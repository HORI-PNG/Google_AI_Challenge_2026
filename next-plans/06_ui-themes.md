# 段階6：UI テーマと全画面の見た目（予定）

## 目的
これまで後回しにしてきた見た目を、Figma Make で作ったデザイン（`design/figma_make/`）をもとに作り直す。
テーマを切り替えると、色・フォント・背景に加えて、画面の構成も変わるようにする（PLAN.md 5章「UIテーマの切り替え」）。

## これまでに決めたこと（ユーザーに確認済み）
- 範囲：テーマの仕組み ＋ 全画面の見た目（キャラクターの絵は段階7）
- テーマの選び方：自分で選ぶ ＋ 気分でおすすめ（切り替えるかは本人が決める）
- デザインは Figma Make で作り、Next.js に移植する（指示書：`design/figma-make-brief.md`）
- テーマは 7 種類（手帳の系統 5 つ ＋ クリア・ビジネス）。メタルはやめた

## Figma Make のデザインの中身
- 画面：ログイン、はじめまして、ホーム、日記（書く・話す・選ぶ）、分析中、結果（通常・分析失敗・つらい気持ち）、気分のグラフ、テーマ・設定
- テーマ：7 種類（`kotori`、`yozora`、`mori`、`soda`、`sakura`、`clear`、`office`）。**メタルは入っていない**
- 構成が系統ごとに違うのはホームだけ（`notebook`／`glass`／`office`）。ほかの画面は CSS 変数で見た目を変える
- 部品：`Button`、`Card`、`BackHeader`、`SpeechBubble`、`ScoreBar`、`Mascot`（ハカドリの SVG、表情 5 種類）

## やること
### テーマの仕組み
- `src/lib/themes.ts`：テーマの定義（ID、名前、説明、系統、まとまり）と、気分でのおすすめを決める関数
  - おすすめの目安（指示書どおり）：気分が高い日 → ソーダ／ストレスが高い日 → もりのとしょかん／夜遅い時間 → よぞら／ふつう → ことり
- `src/app/globals.css`：Figma Make の `index.css` のテーマごとの CSS 変数と、背景の模様、すりガラスなどの見た目を移す
- フォント：Google Fonts の `@import` ではなく `next/font` で読み込む（Zen Maru Gothic、M PLUS Rounded 1c、Klee One、Noto Sans JP、Roboto Mono）
- テーマの保存：Firestore の `users/{uid}.settings.themeId`（PLAN.md のデータ構造どおり）。開いた瞬間に色がちらつかないよう、ブラウザにも控えを置き、ページの描画前に `data-theme` を付ける
- グラフの 4 色は、テーマごとの背景で配色の検証をやり直す（段階5 と同じ検証）

### 画面の移植（データと動きは今のものを使う）
- 共通の部品：`src/components/ui/`（`Button`、`Card`、`BackHeader`、`SpeechBubble`、`ScoreBar`、`Mascot`）
- ログイン、はじめまして（`/welcome`）、ホーム（系統ごとの 3 つの版）、日記（`/diary/new`）、分析中、結果、気分のグラフ（`/mood`）
- 新しい画面：テーマ・設定（`/settings`）。テーマを選ぶ、気分でのおすすめ、基本情報の変更、ログアウト
- ホームの「今日のはかどり予報」と「昨日ははかどった？」は段階8・9 で動かす。この段階では見た目だけ置き、「日記がたまると予報が出ます」と表示する
- 気分のグラフは、段階5 の `MoodChart`（実際のデータ、ツールチップ、キーボード操作）をそのまま使い、見た目だけ Figma に合わせる
- デザインのダミーデータ（メールアドレスなど）は使わず、実際のデータを表示する

### その他
- `design/figma_make/` は、このアプリの TypeScript・ESLint の対象から外す（Vite の設定なので、型チェックと lint が通らなくなるため）
- `PLAN.md` の「まず 5 種類、最終的に 10 種類」を、実際のテーマの数に合わせて更新する
- 375px 幅で、全テーマ × 全画面を撮影して確認する

## 作る・変えるファイル
- 新規：`src/lib/themes.ts`、`src/components/ThemeProvider.tsx`、`src/components/ui/*`、`src/components/home/*`（系統ごとのホーム）、`src/app/settings/page.tsx`、テスト
- 変更：`src/app/globals.css`、`src/app/layout.tsx`、`src/components/*Screen.tsx` と各画面、`src/lib/userProfile.ts`（テーマの保存）、`tsconfig.json`、`eslint.config.mjs`、`PLAN.md`、`README.md`

## 確認したこと（ユーザーに確認済み）
- メタルのテーマはやめる → **テーマは 7 種類**（手帳の系統 5 つ ＋ クリア ＋ ビジネス）。指示書からもメタルを外す
- 学年の選択肢は今のまま（大学1〜4年）。Figma の「大学・短大」には合わせない
- Figma Make のファイルは **ソースだけ** コミットする（`src/`、`package.json`、`index.html` など）。ダウンロードの記録（`*:Zone.Identifier`）、Figma Make の動作用のファイル（`.figma/`、`.mise.toml`、`pnpm-lock.yaml`、`vite.config.ts`、`AGENTS.md`、`CLAUDE.md`、`.gitattributes`）は入れない
