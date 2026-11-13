"use client";

import Link from "next/link";
import { MoodScreen } from "@/components/MoodScreen";
import { RequireProfile } from "@/components/RequireProfile";

export default function MoodPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">気分のグラフ</h1>
        <Link href="/" className="text-sm text-muted">
          ホームへ
        </Link>
      </header>
      <RequireProfile>{(user) => <MoodScreen user={user} />}</RequireProfile>
    </main>
  );
}
