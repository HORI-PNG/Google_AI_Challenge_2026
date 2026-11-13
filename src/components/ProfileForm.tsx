"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toMessage, useAuth } from "@/components/AuthProvider";
import { Mascot } from "@/components/ui/Mascot";
import { Button, Loading } from "@/components/ui/Ui";
import { GRADES, userProfileSchema } from "@/lib/userProfile";

// 基本情報（名前・ニックネーム・学年）の登録と変更。見た目は Figma Make の OnboardingScreen から移した
export function ProfileForm() {
  const { state, profile, updateProfile } = useAuth();
  const router = useRouter();
  // null の間は、登録済みの値（初回は Google の名前や空欄）を表示する
  const [name, setName] = useState<string | null>(null);
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
    return <Loading />;
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
      router.push(saved ? "/settings" : "/");
    } catch (e) {
      setError(toMessage(e, "保存できませんでした"));
      setSaving(false);
    }
  }

  return (
    <>
      {saved && (
        <Link href="/settings" className="mb-4 inline-flex min-h-11 items-center font-bold" aria-label="設定に戻る">
          <span aria-hidden="true">←</span>
        </Link>
      )}
      <div className="flex items-center gap-3">
        <Mascot mood="happy" size={78} />
        <div>
          <p className="text-sm font-bold text-accent-strong">{saved ? "PROFILE" : "WELCOME TO RE:NOTE"}</p>
          <h1 className="font-display text-3xl font-bold">{saved ? "基本情報" : "はじめまして！"}</h1>
        </div>
      </div>
      {!saved && (
        <p className="mt-5 leading-relaxed text-muted">
          日記を書く前に、あなたのことを
          <br />
          少しだけ教えてください。
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <label className="block font-bold">
          名前
          <input
            className="field mt-2"
            value={currentName}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={50}
            required
          />
        </label>
        <label className="block font-bold">
          ニックネーム
          <span className="ml-2 text-xs font-normal text-muted">ハカドリがこの名前で呼びます</span>
          <input
            className="field mt-2"
            value={currentNickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="nickname"
            placeholder="例：ほり"
            maxLength={20}
            required
          />
        </label>
        <label className="block font-bold">
          学年
          <span className="ml-2 text-xs font-normal text-muted">分析や提案の言い方が変わります</span>
          <select className="field mt-2" value={currentGrade} onChange={(e) => setGrade(e.target.value)} required>
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

        <div className="rounded-[var(--radius-control)] bg-soft-accent p-4 text-sm leading-relaxed text-accent-strong">
          名前とニックネームは Gemini には送りません。安心して使ってね。
        </div>

        {error && (
          <p role="alert" className="text-sm font-bold text-accent-strong">
            {error}
          </p>
        )}

        <Button type="submit" disabled={saving} className="mt-3 w-full">
          {saving
            ? "保存中…"
            : saved
              ? "保存する"
              : currentNickname.trim()
                ? `${currentNickname.trim()}さん、はじめよう`
                : "はじめる"}
        </Button>
      </form>
    </>
  );
}
