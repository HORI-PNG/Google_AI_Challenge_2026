import { Mascot } from "../components/Ui";

export function AnalyzingScreen() {
  return (
    <main className="grid min-h-dvh place-items-center px-7 text-center">
      <div>
        <div className="relative mx-auto mb-8 grid size-56 place-items-center rounded-full bg-[var(--hero)]">
          <span className="absolute left-5 top-10 size-3 animate-pulse rounded-full bg-[var(--decor)]" />
          <span className="absolute right-8 top-5 size-4 animate-bounce rounded-full border-2 border-[var(--decor)]" />
          <Mascot mood="normal" size={144} className="mascot-thinking" />
        </div>
        <p className="text-sm font-bold tracking-widest text-[var(--accent-strong)]">
          READING YOUR NOTE
        </p>
        <h1 className="mt-3 font-[var(--font-heading)] text-2xl font-bold leading-relaxed">
          日記を保存しました。
          <br />
          ハカドリが日記を読んでいます…
        </h1>
        <div className="mx-auto mt-6 flex w-24 justify-center gap-2">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="size-2 animate-bounce rounded-full bg-[var(--accent)]"
              style={{ animationDelay: `${item * 140}ms` }}
            />
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-[var(--muted)]">
          混み合っているときは、
          <br />
          少し時間がかかります。
        </p>
      </div>
    </main>
  );
}
