# 段階16：1分間のマインドフルネス

## 目的
集中したいときやリフレッシュしたいときに、舞台へ跳び上がって静止するキャラクターを1分間見つめる。

## やること
- 黒と金の舞台衣装・サングラスで、ステージ下から跳び上がり、落下・着地して仁王立ちする演出を作る。
- 着地から60秒間は静止し、残り時間は表示しない。
- 60秒後は歌唱・スピン＋キック・ロボットダンス・ムーンウォークの4種類からランダムに選ぶ。直前のムーブの連続を避ける。
- 途中終了・再挑戦、動きを減らす設定、テーマ共通のホーム入口に対応する。
- 確認用ページでの確認を経て、ForkからPull Requestを作成する。

## 作る・変えるファイル
`src/app/mindfulness/page.tsx`、`src/components/MindfulnessScreen.tsx`、`src/lib/mindfulness.ts`、`src/components/home/HomeParts.tsx`、`src/components/GlassNav.tsx`、`src/app/globals.css`、静止用・歌唱用SVG、歌唱用SVGの生成スクリプト。

## 確認事項
API・データ保存・追加のAPIキーは不要。ユーザーによる確認後にPull Requestを作り、レビュー後にmainへ取り込む。
