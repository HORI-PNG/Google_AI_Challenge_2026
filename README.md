# Re:Note（仮称）

気持ちを書くと、今日の「はかどり」が分かる日記。
Gemini が日記から感情を点数にし、過去の日記から「今日のはかどり予報」と、おすすめの時間帯・場所・ラッキーアイテムを提案します。

Google AI Challenge（Google Japan 25周年）② Work & Learning 部門への応募作品です。計画は [PLAN.md](PLAN.md) を見てください。

## 技術構成
- Next.js 16（TypeScript、App Router）、Tailwind CSS 4
- Firebase Authentication、Cloud Firestore
- Gemini API、Places API
- 公開先：Vercel

## 起動のしかた
Node.js（v20 以上）が必要です。開発では WSL（Ubuntu）の nvm で入れた Node を使っています。

```bash
npm install
cp .env.example .env.local   # 値を入れる（段階2 以降で必要）
npm run dev                  # http://localhost:3000
```

その他のコマンド：

```bash
npm run lint    # ESLint
npm run build   # 本番用のビルド
```

## フォルダ構成
```
src/app/        画面（App Router）
src/prompts/    Gemini へのプロンプト（Google AI Studio で試したもの）
next-plans/     各段階を始める前の予定
logs/           各段階で実装したことの記録
.agents/rules/  AI エージェント向けのルール
```
