# 段階8：「昨日ははかどった？」と今日のはかどり予報（予定）

## 目的
アプリの軸である「感情の点数 → 今日のはかどり予報」を動かす（PLAN.md 4章 ⑤⑥、5章「今日のはかどり予報」、8章「はかどり予報の考え方」）。
日記の点数と、翌日の「はかどった？」の答えをペアでため、Gemini（予報士）が今日のはかどり度と過ごし方を出す。

## やること
### 1. 「昨日ははかどった？」（3 段階）
- ホームの上に、昨日の日記があって、まだ答えていないときだけカードを出す
  - 「はかどらなかった／ふつう／はかどった」の 3 つのボタン（1 タップで保存）
  - 任意で「主に勉強した時間帯（朝・昼・夕方・夜）」「場所（家・図書館・カフェ・学校・公園）」も 1 タップで選べる（※確認したいこと 1）
- 保存先：`users/{uid}/feedback/{昨日の日付}`
- 答えたら、ハカドリがひとこと返して（決まった文）カードを閉じる

### 2. 今日のはかどり予報（Gemini）
- `POST /api/forecast`：プロンプト②（`src/prompts/02_forecast.md`）をそのまま読み込む。構造化出力（JSON スキーマ）、Temperature 0.6
- 入力
  - today：最新の日記の点数（昨日か今日の日記。なければ予報は出さず「日記を書くと予報が出る」）
  - history：過去 30 日の「その日の点数＋はかどった？（＋時間帯・場所）」。日記の本文は送らない
  - 日付、学年
- 7 日分未満のときは「記録がたまると予報が自分に合っていく」と出す（プロンプトの data_sufficiency）
- 段階3 の「やり直し → 別の Gemini モデル」を使う。失敗したら「予報を出せませんでした。もう一度」のボタン
- 保存先：`users/{uid}/forecasts/{今日の日付}`。1 日 1 回作り、同じ日は使い回す（Gemini の回数の節約）
  - その日に新しい日記を書いたら、作り直す（※確認したいこと 2）
- AI の返事は zod で確かめる（はかどり度 0〜100、天気は 4 種類、時間帯の形など）。形が崩れていたら使わない

### 3. 画面
- ホームの予報カード（今は「準備中」）に中身を出す（手帳・クリア・ビジネスの 3 系統とも）
  - はかどり度（%）と天気（☀️ 晴れ／🌤️ 晴れときどきくもり／☁️ くもり／🌧️ 雨）
  - おすすめ時間（と理由）、おすすめ場所（種類だけ。近くの実際の場所は段階9 の Places API）、ラッキーアイテム（と理由）、向いている勉強のしかた、休み方のひとこと
  - 予報の根拠（evidence）を小さく出す（「根拠がない」と思われないため）
- ハカドリの話しかけ（段階7）の `today_forecast` に、予報（はかどり度と天気）を入れる
- 気分のグラフに、はかどった日の印を重ねる（PLAN.md 5章「気分のグラフ」）

### 4. デモ用のデータ
- 設定画面の「デモ用の日記を入れる」に、「はかどった？」の答え（時間帯・場所つき）も 14 日分入れる
  - 予報が「記録が十分（enough）」の状態で、デモ動画を撮れるようにする

### 5. テスト
- 「はかどった？」を出す条件（昨日の日記があるか、答え済みか）
- 予報への入力の組み立て（日記と答えのペア、30 日分、本文を含めない）
- AI の返事の確認（範囲外の数字、知らない天気、形の崩れ）
- 天気と % の対応、予報を作り直す条件

## 作る・変えるファイル
- 新規：`src/lib/feedback.ts`、`src/lib/forecast.ts`（入力の組み立て・返事の確認）、`src/app/api/forecast/route.ts`、`src/components/home/FeedbackCard.tsx`、`src/components/useForecast.ts`、テスト
- 変更：`src/lib/server/prompts.ts`、`next.config.ts`（プロンプトを本番に含める）、`src/components/home/HomeParts.tsx`・`HomeViews.tsx`・`homeTypes.ts`、`src/components/HomeScreen.tsx`、`src/components/useGreeting.ts`、`src/lib/characterMessage.ts`、`src/components/MoodChart.tsx`、`src/lib/demoDiaries.ts`、`PLAN.md`（データ構造）

## データ構造の変更（PLAN.md も直す）
```
feedback/{date}        ← date は「はかどったか」を答えた対象の日（＝昨日）
  productivity(1|2|3), studyTime(morning|noon|evening|night)?, place(home|library|cafe|school|park)?, answeredAt
forecasts/{date}
  percent, weather, dataSufficiency(few|enough), bestTime{range, reason}, places[], luckyItem{name, reason},
  studyStyle, restAdvice, message, evidence[], basedOnDiaryId, model, createdAt
```

## 決めたこと（ユーザーに確認済み）
1. 「はかどった？」は 3 段階に加えて、時間帯と場所も任意・1 タップで聞く
2. 予報は 1 日 1 回作って使い回し、その日に新しい日記を書いたときだけ作り直す
