"use client";

import { useAuth } from "@/components/AuthProvider";
import { Mascot } from "@/components/ui/Mascot";
import { Button } from "@/components/ui/Ui";

// ログイン画面（Figma Make の LoginScreen から移した）
export function LoginView() {
  const { signIn, error } = useAuth();
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-8 pt-14 text-center">
      <div className="mb-3 rounded-full bg-soft-accent px-4 py-2 text-sm font-bold text-accent-strong">
        気持ちから、明日のヒントを。
      </div>
      <h1 className="font-display text-5xl font-bold tracking-tight">Re:Note</h1>
      <p className="mt-3 max-w-xs text-lg font-bold leading-relaxed">
        気持ちを書くと、
        <br />
        今日の「はかどり」が分かる。
      </p>

      <div className="relative my-8 grid h-56 w-full place-items-center rounded-[calc(var(--radius)*1.5)] bg-hero">
        <div className="absolute left-7 top-8 size-3 rounded-full bg-decor" />
        <div className="absolute right-8 top-12 size-5 rotate-12 rounded-[5px] border-2 border-decor" />
        <Mascot mood="happy" size={150} className="drop-shadow-sm" />
        <span className="absolute bottom-5 right-8 rotate-6 font-display text-sm font-bold text-muted">
          きょうも、ピッ
        </span>
      </div>

      <div className="mt-auto w-full">
        {error && (
          <p role="alert" className="mb-4 rounded-[var(--radius-control)] bg-card p-3 text-left text-sm leading-relaxed text-accent-strong">
            {error}
          </p>
        )}
        <Button onClick={signIn} className="flex w-full gap-3">
          <span className="grid size-6 place-items-center rounded-full bg-accent-foreground text-sm text-accent" aria-hidden="true">
            G
          </span>
          Google でログイン
        </Button>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          日記はあなただけが読めるように
          <br />
          大切に保存されます
        </p>
      </div>
    </main>
  );
}
