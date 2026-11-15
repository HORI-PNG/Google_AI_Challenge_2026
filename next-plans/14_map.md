# 段階14：はかどり場所マップ（予定）

## 目的
日記を書いた場所を地図に出し、「はかどった場所」を色で見せる。予報の「おすすめ場所」の根拠を、自分の目で確かめられるようにする。

## 決めたこと（ユーザーに確認済み）
- 補助機能の ④。デモ動画の準備より先に作る
- 地図は Google マップではなく **OpenStreetMap ＋ Leaflet**（無料・キー不要。有料のサービスは避ける方針）

## やること
- 位置の記録（任意・初期はオフ。privacy.md）
  - 設定画面に「日記に場所を記録する」のオン・オフ（`settings.locationEnabled` を使う。段階9 で隠していた設定を、この用途で出し直す）
  - オンのときだけ、日記を保存したあとに位置を読み、約 100m に丸めて `diaries/{id}.location{lat, lng}` に保存する（保存や分析は待たせない。位置が読めなくても日記は保存される）
  - 日記の画面に「📍 この日記の場所も記録します」と出す
- 地図の画面 `/map`「はかどり場所マップ」
  - 最近 60 日の、場所のある日記を、約 100m ごとにまとめて丸で出す（丸の大きさ＝日記の数）
  - 色＝はかどり（「はかどった？」の答えの平均。答えがなければ集中の点数から目安）
  - 丸を押すと、日記の数・はかどった日・平均の気分と集中
  - 場所のある日記がないときは、設定をオンにするよう案内する
  - 地図の出典（© OpenStreetMap contributors）を必ず出す
- 気分のグラフとホームから入れるようにする
- デモ用の日記に、架空の場所（東京の図書館・カフェ・家のあたり）を入れる
- テスト（丸め、まとめ方、色の決め方）、PLAN.md

## 作る・変えるファイル
- 新規：`src/lib/placeMap.ts`、`src/app/map/page.tsx`、`src/components/MapScreen.tsx`、`src/components/LeafletMap.tsx`、`tests/unit/placeMap.test.mjs`
- 変更：`src/lib/diaries.ts`、`src/components/DiaryForm.tsx`、`src/components/SettingsScreen.tsx`、`src/lib/demoDiaries.ts`、ホーム・気分のグラフの入り口、`package.json`（leaflet）、PLAN.md

## ユーザーに確認したいこと
- なし（位置の記録は任意・初期オフ、地図は無料のもの）
