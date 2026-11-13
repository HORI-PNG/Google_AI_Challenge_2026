"use client";

import type { User } from "firebase/auth";
import { type FormEvent, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import { toMessage } from "@/components/AuthProvider";
import { SelectDiaryForm } from "@/components/SelectDiaryForm";
import { Mascot } from "@/components/ui/Mascot";
import { BackHeader, Button, ButtonLink } from "@/components/ui/Ui";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ApiRequestError, analyzeAndSave, createDiary, type SavedDiary } from "@/lib/diaries";
import type { DiaryAnalysis, InputType } from "@/lib/diaryAnalysis";
import type { UserProfile } from "@/lib/userProfile";

const MAX_LENGTH = 4000;

const MODES: { type: InputType; label: string }[] = [
  { type: "text", label: "✎ 書く" },
  { type: "voice", label: "◉ 話す" },
  { type: "select", label: "✓ 選ぶ" },
];

type Phase =
  | { step: "writing" }
  | { step: "saving" }
  | { step: "analyzing" }
  | { step: "done"; analysis: DiaryAnalysis; writtenAt: Date }
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
      setPhase({ step: "done", analysis, writtenAt: diary.writtenAt });
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
    return <AnalysisResult analysis={phase.analysis} nickname={profile.nickname} writtenAt={phase.writtenAt} />;
  }

  if (phase.step === "analyzing") {
    return <AnalyzingView />;
  }

  if (phase.step === "analysisFailed") {
    return (
      <main className="min-h-dvh px-4 pb-8 pt-14 text-center">
        <Mascot mood="worried" size={146} className="mx-auto" />
        <h1 className="mt-4 font-display text-2xl font-bold">日記は保存できたよ</h1>
        <p className="mx-auto mt-4 max-w-sm leading-relaxed text-muted">
          {phase.message}。少し時間をおいて、もう一度分析できます（ホームからもやり直せます）。
        </p>
        <Button onClick={() => analyze(phase.diary)} className="mt-9 w-full">
          もう一度分析する
        </Button>
        <ButtonLink href="/" variant="ghost" className="mt-2 w-full">
          あとで分析する
        </ButtonLink>
      </main>
    );
  }

  const saving = phase.step === "saving";
  return (
    <main className="min-h-dvh pb-8">
      <BackHeader title="今日の日記" />
      <div className="p-4">
        <div role="tablist" aria-label="日記のつけ方" className="grid grid-cols-3 rounded-[var(--radius-control)] bg-subtle p-1">
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
              className={`min-h-12 rounded-[calc(var(--radius-control)-4px)] font-bold transition ${
                mode === m.type ? "bg-card text-accent-strong shadow-sm" : "text-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {saveError && (
          <p role="alert" className="mt-4 text-sm font-bold text-accent-strong">
            {saveError}
          </p>
        )}

        {mode === "text" && (
          <form onSubmit={handleTextSubmit} className="mt-6">
            <div className="mb-4">
              <p className="font-display text-xl font-bold">{profile.nickname}さん、思ったまま書いてみよう</p>
              <p className="mt-1 text-sm text-muted">うまくまとめなくて大丈夫です。</p>
            </div>
            <label>
              <span className="sr-only">日記</span>
              <textarea
                className="field min-h-72 resize-none leading-relaxed"
                maxLength={MAX_LENGTH}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="うれしかったこと、疲れたこと、分かったこと…思ったままに書いてね"
              />
            </label>
            <p className="mt-2 text-right text-sm text-muted tabular-nums">
              {text.length} / {MAX_LENGTH}
            </p>
            <Button type="submit" className="mt-5 w-full" disabled={saving || !text.trim()}>
              {saving ? "保存中…" : "保存して分析する"}
            </Button>
          </form>
        )}

        {mode === "voice" && (
          <VoiceRecorder user={user} saving={saving} onSubmit={(transcript) => void submit(transcript, "voice")} />
        )}

        {mode === "select" && (
          <SelectDiaryForm saving={saving} onSubmit={(selected) => void submit(selected, "select")} />
        )}
      </div>
    </main>
  );
}

/** 分析中（Figma Make の AnalyzingScreen） */
function AnalyzingView() {
  return (
    <main className="grid min-h-dvh place-items-center px-7 text-center">
      <div>
        <div className="relative mx-auto mb-8 grid size-56 place-items-center rounded-full bg-hero">
          <span className="absolute left-5 top-10 size-3 animate-pulse rounded-full bg-decor" />
          <span className="absolute right-8 top-5 size-4 animate-bounce rounded-full border-2 border-decor" />
          <Mascot mood="normal" size={144} className="mascot-thinking" />
        </div>
        <p className="text-sm font-bold tracking-widest text-accent-strong">READING YOUR NOTE</p>
        <h1 className="mt-3 font-display text-2xl font-bold leading-relaxed" role="status">
          日記を保存しました。
          <br />
          ハカドリが日記を読んでいます…
        </h1>
        <div className="mx-auto mt-6 flex w-24 justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 140}ms` }} />
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted">
          混み合っているときは、
          <br />
          少し時間がかかります。
        </p>
      </div>
    </main>
  );
}
