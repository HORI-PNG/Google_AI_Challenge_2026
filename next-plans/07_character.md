# 段階7：キャラクター（表情の切り替え、話しかけ）（予定）

## 目的
ハカドリを「気分に合わせて表情が変わり、過去の日記をふまえて話しかけてくる聞き役」にする（PLAN.md 5章「キャラクター」）。
日記を書く前のきっかけを作り、続けたくなる理由にする。

## やること
### 1. 表情の切り替え
- 点数から表情を決める関数 `mascotMoodFromScores`（テストを書く）
  - つらい気持ち（`urgent`・`watch`）、ストレス 70 以上、気分 40 未満 → 心配
  - 元気 35 未満 → ねむい
  - 気分 70 以上 → にっこり
  - 集中 70 以上 → おうえん
  - それ以外 → ふつう
- ホームの話しかけ、結果の画面、最新の日記のふりかえりで、この表情を使う（今は画面ごとに固定）

### 2. 日記を書く前の話しかけ（Gemini）
- `POST /api/character`（mode: greeting）。プロンプトは `src/prompts/03_character_chat.md` をそのまま読み込む
- 入力：今の日時、学年、最近の日記 3 件（本文の先頭 60 字と点数）。名前とニックネームは送らない
- 出力は 80 字以内の文章。長すぎるときや失敗したときは、決まった話しかけ（例：「今日いちばん笑ったのはいつ？」）を出す
- 段階3 の「やり直し → 別の Gemini モデル」を使うが、話しかけは待たせないよう、1 モデルにつき 2 回まで
- Gemini の回数を節約するため、同じ日・同じ最新の日記なら、ブラウザに置いた話しかけを使い回す（日記の本文は置かない）
- 表示する場所：ホームのハカドリの吹き出し、日記を書く画面の上
- 「はかどり予報」はまだないので、`today_forecast` は「まだなし」で渡す（段階8 で入れる）

### 3. テスト
- 表情の決め方、プロンプトへの入力の組み立て、話しかけの長さの確認

## 作る・変えるファイル
- 新規：`src/lib/mascotMood.ts`、`src/lib/characterMessage.ts`、`src/app/api/character/route.ts`、`src/components/CharacterGreeting.tsx`、テスト
- 変更：`src/lib/server/gemini.ts`（文章で返す呼び出し）、`src/lib/server/prompts.ts`、`src/components/home/*`、`src/components/AnalysisResult.tsx`、`src/components/DiaryForm.tsx`、`next.config.ts`

## 確認したいこと
- ハカドリとの会話（「先週の私はどうだった？」に答える、mode: chat）を、この段階で入れるか
