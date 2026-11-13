# コーディング規約

- TypeScript の strict モードを使う。`any` は使わない
- コンポーネントは関数コンポーネントで書き、ファイル名は PascalCase（例：`DiaryInput.tsx`）
- サーバーでしか使わない処理（Gemini API、Calendar API の呼び出し）は Route Handler か Server Action に置く
- 秘密の値（API キーなど）は `.env.local` に置き、Git に入れない。`.env.example` に項目名だけ書く
- Firestore のデータ構造は PLAN.md の「データ構造」に合わせる。変える場合は PLAN.md も更新する
- 画面はスマホ幅（375px）で崩れないことを確認する
