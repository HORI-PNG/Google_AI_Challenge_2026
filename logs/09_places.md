# 段階9：今日の過ごし方の提案（近くの場所）（記録）

## 決めたこと（ユーザーに確認済み）
- 初めは Places API (New) を使う予定で作ったが、請求先（クレジットカード）の登録が要り、費用が怖いので、**一旦は無料でできる範囲で進める**ことにした
- 初期は Places API を使わない。おすすめ場所ごとに「近くの〇〇を Google マップで探す」リンクを出す（キー不要・無料・アプリでは位置情報を使わない）
- Places API を使う作りは残し、あとで決めたら `.env.local` だけで切り替えられるようにした
- rules（`.agents/rules/workflow.md`）に「対話は日本語で行う」を足した

## 実装したこと
### 初期（Places API を使わない）
- `src/components/home/NearbyPlaces.tsx`：予報のおすすめ場所のうち、図書館・カフェ・公園に「📍 近くの〇〇を Google マップで探す」リンクを出す（家・学校は出さない）
- ホームの 3 系統（手帳・クリア・ビジネス）の予報に入れた

### Places API を使うとき（`NEXT_PUBLIC_PLACES_API_ENABLED=true` と `GOOGLE_MAPS_API_KEY`）
- `POST /api/places`（ログインした人だけ）：Places API (New) の Nearby Search を、サーバー側から呼ぶ
  - 半径 2km、近い順に 3 件。名前・徒歩の時間と距離・営業中かどうか・Google マップのリンク
  - 取る項目は最小限（フィールドマスク）
- 位置情報はボタンを押したときだけ使う。初めて押したときに許可を聞き、`settings.locationEnabled` をオンにする（初期はオフ）。設定画面にもオン・オフを出す
- 緯度・経度は約 100m に丸めて送り、保存しない・ログに出さない
- 同じ日・同じ種類・約 1km 以内なら、ブラウザに覚えた結果を使い、API を何度も呼ばない
- キーがない・位置情報を断られた・見つからないときは、Google マップで探すリンクを出す
- `src/lib/places.ts`：種類、丸め、距離、返事の整形（zod）。`tests/unit/places.test.mjs`

### そのほか
- `.env.example`：`NEXT_PUBLIC_PLACES_API_ENABLED` を追加し、Places API が任意であることを書いた
- PLAN.md：場所の提案のしかたと `settings.locationEnabled` の説明

## 変わったこと
- 予報の「おすすめ場所」から、そのまま Google マップで近くの場所を探せるようになった
- 費用は一切かからない

## 動作確認
- `npm test`（87 件）、`npm run lint`、`npx tsc --noEmit`、`npm run build`：成功
- ユーザーが PC で確認：リンクを押すと Google マップが開いた
- Places API を使う作りは、キーがないため実際の API では試していない（テストで本文の作り方と返事の整形を確かめた）

## 残った課題・引き継ぎ
- 応募の「使用プロダクト」に Places API は書けない（Google マップへのリンクのみ）。使うなら、請求先を登録し、割り当てで 1 日の上限を小さくしてから `/tmp/renote-scaffold/try-places.mjs` で試す
- スマホでのリンクの開き方（Google マップのアプリが開くか）は未確認
- 段階10：Vercel で公開
