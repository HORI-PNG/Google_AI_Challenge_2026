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
npm test              # 単体テスト（Gemini のやり直し、プロンプトとスキーマの一致）
npm run lint          # ESLint
npm run build         # 本番用のビルド
npm run test:rules    # Firestore のセキュリティルールのテスト（エミュレータ。Java が必要）
npm run deploy:rules  # セキュリティルールを Firebase に反映（初回は npx firebase login）
```

## Firebase
- Google ログイン（Firebase Authentication）と Cloud Firestore を使います
- データは `users/{uid}` の下に保存し、本人だけが読み書きできます（[firestore.rules](firestore.rules)）

## Gemini
- 日記の分析は `POST /api/analyze`（サーバー側）で Gemini API を呼びます。ログインした人だけが使えます
- プロンプトは [src/prompts/](src/prompts/) の md をそのまま読み込みます
- つながらないときは、同じモデルで3回 → `GEMINI_FALLBACK_MODEL` で3回試し、それでもだめなら日記だけ保存して、あとから分析し直せます
- 声の日記は `POST /api/transcribe` で、音声をそのまま Gemini に渡して文章にします（音声は保存しません）
  - **音声はトークンを多く使います**：1 秒あたり約 32 トークン（2 分で約 3,800、3 分で約 5,800 トークン）。文章の日記の分析（千数百トークン）の数倍で、無料枠の制限にも当たりやすいので、録音は 2 分までにしています

## フォルダ構成
```
src/app/        画面（App Router）
src/components/ 画面の部品（ログイン状態の管理など）
src/lib/        Firebase の初期化、Firestore の読み書き、Gemini の結果の形
src/lib/server/ サーバーだけで使う処理（Gemini の呼び出し、ログインの確認）
src/prompts/    Gemini へのプロンプト（Google AI Studio で試したもの）
src/components/ui/   共通の部品（ボタン、カード、ハカドリ）
src/components/home/ ホームの3つの構成（手帳・クリア・ビジネス）
design/         Figma Make のデザイン（参考用。アプリのビルド対象外）
tests/unit/     単体テスト
tests/rules/    Firestore のセキュリティルールのテスト
next-plans/     各段階を始める前の予定
logs/           各段階で実装したことの記録
.agents/rules/  AI エージェント向けのルール
```
