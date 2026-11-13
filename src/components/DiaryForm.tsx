"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { toMessage } from "@/components/AuthProvider";
import { SelectDiaryForm } from "@/components/SelectDiaryForm";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ApiRequestError, analyzeAndSave, createDiary, type SavedDiary } from "@/lib/diaries";
import type { DiaryAnalysis, InputType } from "@/lib/diaryAnalysis";
import type { UserProfile } from "@/lib/userProfile";

const MAX_LENGTH = 4000;

const MODES: { type: InputType; label: string }[] = [
  { type: "text", label: "✏️ 書く" },
  { type: "voice", label: "🎙️ 話す" },
  { type: "select", label: "☑️ 選ぶ" },
];

type Phase =
  | { step: "writing" }
  | { step: "saving" }
  | { step: "analyzing" }
  | { step: "done"; analysis: DiaryAnalysis }
  /** 本文は保存できたが、分析に失敗した */
  | { step: "analysisFailed"; diary: SavedDiary; message: string };

export function DiaryForm({ user, profile }: { user: User; profile: UserProfile }) {
  const [mode, setMode] = useState<InputType>("text");
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "writing" });
  const [saveError, setSaveError] = useState<string | null>(null);

  async function analyze(diary: SavedDiary) {
    setPhase({ step: "analyzing" });
    try {
      const analysis = await analyzeAndSave(user, diary, profile.grade);
      setPhase({ step: "done", analysis });
    } catch (e) {
      const message = e instanceof ApiRequestError ? e.message : "分析できませんでした";
      setPhase({ step: "analysisFailed", diary, message });
    }
  }

  /** どの書き方でも、先に本文を保存してから分析する。Gemini が失敗しても日記は残る */
  async function submit(rawText: string, inputType: InputType) {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setSaveError("日記を書いてください");
      return;
    }
    setSaveError(null);
    setPhase({ step: "saving" });

    const writtenAt = new Date();
    let id: string;
    try {
      id = await createDiary(user.uid, trimmed, inputType);
    } catch (e) {
      setSaveError(toMessage(e, "日記を保存できませんでした"));
      setPhase({ step: "writing" });
      return;
    }
    await analyze({ id, rawText: trimmed, inputType, writtenAt });
  }

  function handleTextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(text, "text");
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
            onClick={() => analyze(phase.diary)}
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
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-base">{profile.nickname} さん、今日はどんな一日だった？</p>

      <div role="tablist" aria-label="日記のつけ方" className="grid grid-cols-3 gap-1 rounded-full bg-card p-1 shadow-sm">
        {MODES.map((m) => (
          <button
            key={m.type}
            type="button"
            role="tab"
            aria-selected={mode === m.type}
            disabled={saving}
            onClick={() => {
              setMode(m.type);
              setSaveError(null);
            }}
            className={`h-10 rounded-full text-sm ${
              mode === m.type ? "bg-accent font-bold text-accent-foreground" : "text-muted"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-accent">
          {saveError}
        </p>
      )}

      {mode === "text" && (
        <form onSubmit={handleTextSubmit} className="flex flex-1 flex-col gap-4">
          <label className="flex flex-1 flex-col gap-2">
            <span className="sr-only">日記</span>
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
          <button
            type="submit"
            disabled={saving}
            className="h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存して分析する"}
          </button>
        </form>
      )}

      {mode === "voice" && (
        <VoiceRecorder
          user={user}
          saving={saving}
          onSubmit={(transcript) => void submit(transcript, "voice")}
        />
      )}

      {mode === "select" && (
        <SelectDiaryForm
          saving={saving}
          onSubmit={(selected) => void submit(selected, "select")}
        />
      )}
    </div>
  );
}
