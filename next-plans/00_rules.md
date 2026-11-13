# 段階0：作業ルールの追加（予定）

## 目的
開発の進め方（確認、ブランチ、PR、記録の残し方）をファイルにして、どの AI エージェントでも同じ手順で作業できるようにする。

## やること
- `main` に既存のファイル（AGENTS.md、CLAUDE.md、PLAN.md、`.agents/rules/`、`src/prompts/`）を初回コミットする
- GitHub に `Google_AI_Challenge_2026`（Public）を作って `main` を push する
- ブランチ `stage-00-rules` を切る
- `.rules/workflow.md` に作業ルールを書く
- `AGENTS.md` から `.rules/workflow.md` を参照する
- `PLAN.md` 7章の設定ファイルの一覧に `.rules/` を追記する
- `next-plans/` と `logs/` を作る
- `.gitignore` を作る（`.env.local`、`node_modules/`、`.venv/` など）
- PR を作る

## 作る・変えるファイル
- 新規：`.rules/workflow.md`、`next-plans/00_rules.md`、`logs/00_rules.md`、`.gitignore`
- 変更：`AGENTS.md`、`PLAN.md`

## 確認したこと
- ルールの置き場所：`.rules/` を新設（確認済み）
- リポジトリの公開範囲：Public（確認済み）
- git のコミット用メールアドレス：GitHub の noreply に設定（確認済み）
- 段階の分け方：`.rules/workflow.md` の「段階の一覧」のとおり（確認済み）
