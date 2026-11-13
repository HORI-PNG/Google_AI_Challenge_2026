import { Button, Mascot } from "../components/Ui";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-8 pt-14 text-center">
      <div className="mb-3 rounded-full bg-[var(--soft-accent)] px-4 py-2 text-sm font-bold text-[var(--accent-strong)]">
        気持ちから、明日のヒントを。
      </div>
      <h1 className="font-[var(--font-heading)] text-5xl font-bold tracking-tight">Re:Note</h1>
      <p className="mt-3 max-w-xs text-lg font-bold leading-relaxed">
        気持ちを書くと、
        <br />
        今日の「はかどり」が分かる。
      </p>

      <div className="relative my-8 grid h-56 w-full place-items-center rounded-[calc(var(--radius)*1.5)] bg-[var(--hero)]">
        <div className="absolute left-7 top-8 h-3 w-3 rounded-full bg-[var(--decor)]" />
        <div className="absolute right-8 top-12 h-5 w-5 rotate-12 rounded-[5px] border-2 border-[var(--decor)]" />
        <Mascot mood="happy" size={150} className="drop-shadow-sm" />
        <span className="absolute bottom-5 right-8 rotate-6 font-[var(--font-heading)] text-sm font-bold text-[var(--muted)]">
          きょうも、ピッ
        </span>
      </div>

      <div className="mt-auto w-full">
        <Button onClick={onLogin} className="flex w-full items-center justify-center gap-3">
          <span className="grid size-6 place-items-center rounded-full bg-[var(--accent-foreground)] text-sm text-[var(--accent)]">
            G
          </span>
          Google でログイン
        </Button>
        <p className="mt-5 text-sm leading-relaxed text-[var(--muted)]">
          日記はあなただけが読めるように
          <br />
          大切に保存されます
        </p>
      </div>
    </main>
  );
}
