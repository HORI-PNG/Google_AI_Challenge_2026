"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { toMessage } from "@/components/AuthProvider";
import { AnalyzeRequestError, analyzeAndSave, createDiary } from "@/lib/diaries";
import type { DiaryAnalysis } from "@/lib/diaryAnalysis";
import type { UserProfile } from "@/lib/userProfile";

const MAX_LENGTH = 4000;

type Phase =
  | { step: "writing" }
  | { step: "saving" }
  | { step: "analyzing"; diaryId: string; writtenAt: Date }
  | { step: "done"; analysis: DiaryAnalysis }
  /** 本文は保存できたが、分析に失敗した */
  | { step: "analysisFailed"; diaryId: string; writtenAt: Date; message: string };

export function DiaryForm({ user, profile }: { user: User; profile: UserProfile }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "writing" });
  const [saveError, setSaveError] = useState<string | null>(null);

  async function analyze(diaryId: string, writtenAt: Date) {
    setPhase({ step: "analyzing", diaryId, writtenAt });
    try {
      const analysis = await analyzeAndSave(
        user,
        diaryId,
        text.trim(),
        profile.grade,
        writtenAt,
      );
      setPhase({ step: "done", analysis });
    } catch (e) {
      const message =
        e instanceof AnalyzeRequestError ? e.message : "分析できませんでした";
      setPhase({ step: "analysisFailed", diaryId, writtenAt, message });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setSaveError("日記を書いてください");
      return;
    }
    setSaveError(null);
    setPhase({ step: "saving" });

    // 先に本文を保存する。Gemini が失敗しても日記は残る
    const writtenAt = new Date();
    let diaryId: string;
    try {
      diaryId = await createDiary(user.uid, trimmed);
    } catch (e) {
      setSaveError(toMessage(e, "日記を保存できませんでした"));
      setPhase({ step: "writing" });
      return;
    }
    await analyze(diaryId, writtenAt);
  }

  if (phase.step === "done") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <AnalysisResult analysis={phase.analysis} nickname={profile.nickname} />
        <Link
          href="/"
          className="mt-auto flex h-14 w-full items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm"
        >
          ホームへ
        </Link>
      </div>
    );
  }

  if (phase.step === "analyzing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-base">日記を保存しました。</p>
        <p className="text-sm text-muted" role="status">
          ハカドリが日記を読んでいます…
          <br />
          混み合っているときは、少し時間がかかります。
        </p>
      </div>
    );
  }

  if (phase.step === "analysisFailed") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <section className="flex flex-col gap-2 rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-base">日記は保存しました。</p>
          <p className="text-sm leading-relaxed text-muted">
            {phase.message}。少し時間をおいて、もう一度分析できます（ホームからもやり直せます）。
          </p>
        </section>
        <div className="mt-auto flex flex-col gap-3">
          <button
            type="button"
            onClick={() => analyze(phase.diaryId, phase.writtenAt)}
            className="h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm"
          >
            もう一度分析する
          </button>
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center text-sm text-muted"
          >
            あとで分析する（ホームへ）
          </Link>
        </div>
      </div>
    );
  }

  const saving = phase.step === "saving";
  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
      <label className="flex flex-1 flex-col gap-2">
        <span className="text-base">
          {profile.nickname} さん、今日はどんな一日だった？
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={10}
          placeholder="うれしかったこと、疲れたこと、分かったこと…思ったままに書いてね"
          className="min-h-60 w-full flex-1 resize-none rounded-2xl border border-black/10 bg-card p-4 text-base leading-relaxed outline-none focus:border-accent"
        />
        <span className="self-end text-xs text-muted tabular-nums">
          {text.length} / {MAX_LENGTH}
        </span>
      </label>

      {saveError && (
        <p role="alert" className="text-sm text-accent">
          {saveError}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm disabled:opacity-60"
      >
        {saving ? "保存中…" : "保存して分析する"}
      </button>
    </form>
  );
}
