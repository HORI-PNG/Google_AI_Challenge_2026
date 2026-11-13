export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Re:Note</h1>
        <p className="text-sm text-muted">
          気持ちを書くと、今日の「はかどり」が分かる。
        </p>
      </header>

      <section
        aria-label="キャラクターからの話しかけ"
        className="flex items-start gap-3"
      >
        {/* キャラクターの画像は段階7 で差し替える */}
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card text-2xl shadow-sm"
        >
          🙂
        </div>
        <p className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-base leading-relaxed shadow-sm">
          今日はどんな一日だった？
        </p>
      </section>

      <section
        aria-label="今日のはかどり予報"
        className="flex flex-col gap-1 rounded-2xl bg-card p-5 shadow-sm"
      >
        <h2 className="text-sm font-medium text-muted">今日のはかどり予報</h2>
        <p className="text-base leading-relaxed">
          日記がたまると、ここに予報が出ます。
        </p>
      </section>

      {/* 日記の入力画面は段階3 で作る */}
      <button
        type="button"
        disabled
        className="mt-auto h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm disabled:opacity-60"
      >
        日記を書く（準備中）
      </button>
    </main>
  );
}
