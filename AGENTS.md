# AGENTS.md

このファイルは、このプロジェクトで作業する AI エージェント（Google Antigravity、Claude Code など）共通の指示書です。
ルールの本体はここと `.agents/rules/` に置き、ツールごとの設定ファイルはここを参照するだけにします。

## プロジェクト概要
- 仮称：Re:Note（気持ちを書くと、今日の「はかどり」が分かる日記）
- Google AI Challenge（Google Japan 25周年）② Work & Learning 部門への応募作品
- 対象は中学生〜大学院生の学生全般
- Gemini が日記から感情を点数にし、過去の日記から「今日のはかどり予報」と、おすすめの時間帯・場所・ラッキーアイテムを提案する
- UIテーマの切り替えとキャラクターは、続けてもらうための核の機能として扱う（後回しにしない）
- 計画の詳細は `PLAN.md` を読むこと
- 締切：2026年11月30日 23:59 JST。完成度より「デモ動画で伝わること」を優先する

## 技術構成
- Next.js（TypeScript、App Router）、Tailwind CSS、スマホで使える Web アプリ
- Firebase Authentication（Google ログイン）、Cloud Firestore
- Gemini API（アプリの中心の AI）
- Places API（場所の提案）。補助として Google Maps JavaScript API、Google Calendar API
- 公開先：Vercel

## 詳細ルール
次のファイルに従うこと。
- @.agents/rules/coding.md
- @.agents/rules/gemini.md
- @.agents/rules/privacy.md

## 作業の進め方
- 返答、コメント、コミットメッセージは日本語で書く
- 大きな変更の前に計画を示し、確認をとる
- PLAN.md の「核（MVP）」の機能を最優先にし、補助機能は後回しにする
