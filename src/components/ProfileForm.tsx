"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toMessage, useAuth } from "@/components/AuthProvider";
import { GRADES, userProfileSchema } from "@/lib/userProfile";

// 初回の基本情報の登録（名前・ニックネーム・学年）
export function ProfileForm() {
  const { state, profile, updateProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  // null の間は、登録済みの値（初回は Google の名前や空欄）を表示する
  const [nickname, setNickname] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.status === "signedOut") {
      router.replace("/");
    }
  }, [state.status, router]);

  if (state.status !== "signedIn" || profile.status === "loading") {
    return <p className="text-sm text-muted">読み込み中…</p>;
  }

  const saved = profile.status === "ready" ? profile.profile : null;
  // 名前は Google アカウントの名前を最初から入れておく（登録済みならその値）
  const currentName = name ?? saved?.name ?? state.user.displayName ?? "";
  const currentNickname = nickname ?? saved?.nickname ?? "";
  const currentGrade = grade ?? saved?.grade ?? "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = userProfileSchema.safeParse({
      name: currentName,
      nickname: currentNickname,
      grade: currentGrade,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力を確認してください");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(parsed.data);
      router.push("/");
    } catch (e) {
      setError(toMessage(e, "保存できませんでした"));
      setSaving(false);
    }
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-black/10 bg-card px-4 text-base outline-none focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6" noValidate>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">名前</span>
        <input
          className={inputClass}
          value={currentName}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={50}
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">ニックネーム</span>
        <span className="text-xs text-muted">ハカドリがこの名前で呼びます</span>
        <input
          className={inputClass}
          value={currentNickname}
          onChange={(e) => setNickname(e.target.value)}
          autoComplete="nickname"
          maxLength={20}
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">学年</span>
        <span className="text-xs text-muted">学年に合わせて、分析や提案の言い方が変わります</span>
        <select
          className={inputClass}
          value={currentGrade}
          onChange={(e) => setGrade(e.target.value)}
          required
        >
          <option value="" disabled>
            選んでください
          </option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs leading-relaxed text-muted">
        名前とニックネームはあなたのアカウントにだけ保存され、Gemini には送りません。
      </p>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-auto h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm disabled:opacity-60"
      >
        {saving ? "保存中…" : saved ? "保存する" : "はじめる"}
      </button>
    </form>
  );
}
