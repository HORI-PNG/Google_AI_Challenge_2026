"use client";

import Link from "next/link";
import { DiaryForm } from "@/components/DiaryForm";
import { RequireProfile } from "@/components/RequireProfile";

export default function NewDiaryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">日記を書く</h1>
        <Link href="/" className="text-sm text-muted">
          閉じる
        </Link>
      </header>
      <RequireProfile>
        {(user, profile) => <DiaryForm user={user} profile={profile} />}
      </RequireProfile>
    </main>
  );
}
