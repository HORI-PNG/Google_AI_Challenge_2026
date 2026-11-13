"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { AnalyzeRequestError, analyzeAndSave, getLatestDiary, type Diary } from "@/lib/diaries";
import type { UserProfile } from "@/lib/userProfile";

type LoadState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "loaded"; diary: Diary }
  | { status: "error" };

// ホームに出す「最新の日記の結果」。分析に失敗していたら、ここからやり直せる
export function LatestDiary({ user, profile }: { user: User; profile: UserProfile }) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLatestDiary(user.uid)
      .then((diary) => {
        if (active) setLoad(diary ? { status: "loaded", diary } : { status: "empty" });
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [user.uid]);

  if (load.status === "loading") {
    return <p className="text-sm text-muted">読み込み中…</p>;
  }
  if (load.status === "error") {
    return (
      <p role="alert" className="text-sm text-accent">
        日記を読み込めませんでした。
      </p>
    );
  }
  if (load.status === "empty") {
    return (
      <section className="rounded-2xl bg-card p-5 text-base leading-relaxed shadow-sm">
        はじめての日記を書いてみよう。気持ちをそのまま書くだけで大丈夫だよ。
      </section>
    );
  }

  const { diary } = load;
  if (diary.analysisStatus === "done" && diary.analysis) {
    return <AnalysisResult analysis={diary.analysis} nickname={profile.nickname} />;
  }

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const analysis = await analyzeAndSave(
        user,
        diary.id,
        diary.rawText,
        profile.grade,
        diary.createdAt ?? new Date(),
      );
      setLoad({
        status: "loaded",
        diary: { ...diary, analysisStatus: "done", analysis },
      });
    } catch (e) {
      setRetryError(e instanceof AnalyzeRequestError ? e.message : "分析できませんでした");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm">
      <p className="text-base leading-relaxed">最新の日記は、まだ分析できていません。</p>
      {retryError && (
        <p role="alert" className="text-sm text-accent">
          {retryError}
        </p>
      )}
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="h-12 w-full rounded-full border border-accent text-sm font-bold text-accent disabled:opacity-60"
      >
        {retrying ? "分析しています…" : "今から分析する"}
      </button>
    </section>
  );
}
