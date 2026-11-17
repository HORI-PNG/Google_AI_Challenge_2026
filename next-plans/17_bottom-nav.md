# 段階17：下のメニューを全テーマ共通にする

## 目的
クリアのテーマにだけあった「すべらせて選ぶ下のメニュー」を、7 つのテーマすべてで使えるようにする（ユーザーの希望）。

## やること
- `GlassNav` を `BottomNav` に名前を変え、どのテーマでも、どの画面にも出す（ログイン後・最初の登録の画面以外）
- 色はテーマのトークンで描く（メニューの面＝カードの色、真ん中の丸＝アクセントの薄い色）。クリアは今のすりガラスの見た目を保つ
- メニューと役目がかぶるので、手帳・ビジネスのホームからも、ヘッダーの「日記を書く」・ユーザーのボタンと、入り口の列（`EntryRow`）を外す（クリアに合わせる）
- README の「瞑想機能だけを確認する」（Fork を clone して `--webpack` で起動する手順）を、merge 後の内容に直す

## 作る・変えるファイル
- `src/components/GlassNav.tsx` → `src/components/BottomNav.tsx`
- `src/app/layout.tsx`、`src/app/globals.css`
- `src/components/home/HomeParts.tsx`、`src/components/home/HomeViews.tsx`
- `README.md`

## 確認してほしいこと
- 手帳（ことり・よぞらなど）とビジネスのテーマで、下のメニューの色が浮いていないか（スマホ幅 375px）
