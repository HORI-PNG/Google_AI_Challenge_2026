# 段階16：1分間のマインドフルネス

## 目的
集中したいときやリフレッシュしたいときに、舞台へ跳び上がって静止するキャラクターを1分間見つめる。

## やること
- 帽子を使わず、黒・金の舞台衣装、サングラス、脚を開いて腕を下ろす姿を描く。
- ステージの床下から勢いよく跳び上がり、落下・着地して静止する。
- 着地アニメーションの完了後から60秒を数える。
- 途中終了・再挑戦、動きを減らす設定、テーマ共通のホーム入口に対応する。
- 本人だけの確認用ページを更新し、元アプリへの取り込みは確認後に行う。

## 作る・変えるファイル
`src/app/mindfulness/page.tsx`、`src/components/MindfulnessScreen.tsx`、`src/lib/mindfulness.ts`、`src/components/home/HomeParts.tsx`、`src/components/GlassNav.tsx`、`src/app/globals.css`、`public/animations/mindfulness-stage-performer.svg`。

## 確認事項
ユーザー指定の機能として実装する。APIや保存は追加しない。元のGitHub mainと公開アプリには反映しない。
