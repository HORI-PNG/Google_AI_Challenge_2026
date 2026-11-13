# 段階0：作業ルールの追加（記録）

## 実装したこと
- `main` に既存のファイルを初回コミットし、GitHub に `Google_AI_Challenge_2026`（Public）を作って push した
- git のコミット用メールアドレスを GitHub の noreply に設定した（以前は `user.emal` と綴りを誤っていて未設定だった）
- `.rules/workflow.md` を作り、開発の進め方を書いた
  - 確認が必要な場面では実行前に確認する
  - Python は仮想環境（`.venv`）で使う
  - 1 段階 ＝ 1 ブランチ ＝ 1 PR。ブランチは merge 後も残す
  - 段階の前に `next-plans/`、段階の後に `logs/` へ md を残す
  - 段階の一覧（0〜11）
- `AGENTS.md` から `.rules/workflow.md` を参照するようにした
- `PLAN.md` 7章の設定ファイルの一覧に `.rules/`、`next-plans/`、`logs/` を追記した
- `.gitignore` を作った（`.env.local`、`node_modules/`、`.next/`、`.venv/` など）

## 変わったこと
- どの AI エージェント（Claude Code、Antigravity）も、`AGENTS.md` 経由で同じ手順で開発を進めるようになった
- 各段階の予定と結果がファイルで残るので、あとからエントリーシートや資料に「どう作ったか」を書きやすくなった
- 秘密の値やビルド成果物が誤って公開リポジトリに入らないようになった

## 動作確認
- `gh repo create` でリポジトリを作り、`main` の push を確認した

## 次の段階への引き継ぎ
- 段階1：Next.js の雛形（TypeScript / App Router / Tailwind）、`.env.example`
- Node は WSL の nvm（v26.10.0）を使う。非対話のシェルでは `source ~/.nvm/nvm.sh` が必要
