"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LatestDiary } from "@/components/LatestDiary";
import { LoginButton } from "@/components/LoginButton";

// UI は段階6・7 で作り直す。この段階では動作の確認ができる最小限の画面にする
export function HomeScreen() {
  const { state, profile, error, signOut } = useAuth();
  const router = useRouter();

  // 基本情報がまだの人は、先に登録してもらう
  useEffect(() => {
    if (state.status === "signedIn" && profile.status === "missing") {
      router.replace("/welcome");
    }
  }, [state.status, profile.status, router]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Re:Note</h1>
        <p className="text-sm text-muted">
          気持ちを書くと、今日の「はかどり」が分かる。
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-card px-4 py-3 text-sm leading-relaxed text-accent shadow-sm"
        >
          {error}
        </p>
      )}

      {state.status === "loading" && (
        <p className="text-sm text-muted">読み込み中…</p>
      )}

      {state.status === "signedOut" && (
        <div className="mt-auto flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted">
            日記はあなただけが読めるように保存されます。
          </p>
          <LoginButton />
        </div>
      )}

      {state.status === "signedIn" && profile.status === "loading" && (
        <p className="text-sm text-muted">読み込み中…</p>
      )}

      {state.status === "signedIn" && profile.status === "ready" && (
        <>
          <LatestDiary user={state.user} profile={profile.profile} />

          <section
            aria-label="今日のはかどり予報"
            className="flex flex-col gap-1 rounded-2xl bg-card p-5 shadow-sm"
          >
            <h2 className="text-sm font-medium text-muted">
              今日のはかどり予報
            </h2>
            <p className="text-base leading-relaxed">
              日記がたまると、ここに予報が出ます。
            </p>
          </section>

          <div className="mt-auto flex flex-col gap-3">
            <Link
              href="/diary/new"
              className="flex h-14 w-full items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm"
            >
              日記を書く
            </Link>
            <div className="flex justify-center gap-6 text-sm text-muted">
              <Link href="/welcome" className="underline-offset-4 hover:underline">
                基本情報
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="underline-offset-4 hover:underline"
              >
                ログアウト
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
