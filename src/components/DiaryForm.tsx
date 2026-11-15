"use client";

import type { User } from "firebase/auth";
import { type FormEvent, useState } from "react";
import { AnalysisResult } from "@/components/AnalysisResult";
import Link from "next/link";
import { toMessage, useAuth } from "@/components/AuthProvider";
import { SelectDiaryForm } from "@/components/SelectDiaryForm";
import { Mascot } from "@/components/ui/Mascot";
import { Icon, type IconName } from "@/components/ui/Icon";
import { placeholderGreeting } from "@/components/home/HomeParts";
import { BackHeader, Button, ButtonLink, SpeechBubble } from "@/components/ui/Ui";
import { useGreeting } from "@/components/useGreeting";
import { WaitAnimation } from "@/components/ui/WaitAnimation";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ApiRequestError, analyzeAndSave, createDiary, saveDiaryLocation, type SavedDiary } from "@/lib/diaries";
import type { DiaryAnalysis, InputType } from "@/lib/diaryAnalysis";
import type { UserProfile } from "@/lib/userProfile";

const MAX_LENGTH = 4000;

const MODES: { type: InputType; label: string; icon: IconName }[] = [
  { type: "text", label: "書く", icon: "edit" },
  { type: "voice", label: "話す", icon: "mic" },
  { type: "select", label: "選ぶ", icon: "check" },
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
  const greeting = useGreeting(user, profile, null);
  const { settings } = useAuth();

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
    // 場所の記録は、設定でオンにした人だけ。分析は待たせない（位置が読めなくても日記はもう保存されている）
    if (settings?.locationEnabled) void recordLocation(user.uid, id);
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
        {/* ハカドリが最近の日記をふまえて話しかける（書くきっかけ） */}
        <div className="mb-5 grid grid-cols-[56px_1fr] items-end gap-2">
          <Mascot mood={greeting.mood} size={60} />
          <SpeechBubble className="text-sm">
            <span aria-live="polite">{greeting.text ?? placeholderGreeting(profile.nickname)}</span>
          </SpeechBubble>
        </div>
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
              className={`flex min-h-12 items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-3px)] font-bold transition ${
                mode === m.type ? "bg-card text-accent-strong shadow-sm" : "text-muted"
              }`}
            >
              <Icon name={m.icon} size={18} />
              {m.label}
            </button>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-1 text-xs text-muted">
          {settings?.locationEnabled ? (
            <>
              <Icon name="pin" size={14} className="mt-px" />
              この日記の場所も記録して、はかどり場所マップに出します（設定で変えられます）
            </>
          ) : (
            <span>
              場所を記録すると、はかどる場所が地図で分かります（
              <Link href="/settings" className="font-bold text-accent-strong underline">
                設定
              </Link>
              ）
            </span>
          )}
        </p>

        {saveError && (
          <p role="alert" className="mt-4 text-sm font-bold text-accent-strong">
            {saveError}
          </p>
        )}

        {mode === "text" && (
          <form onSubmit={handleTextSubmit} className="mt-6">
            <p className="mb-3 text-sm text-muted">うまくまとめなくて大丈夫です。</p>
            <label>
              <span className="sr-only">日記</span>
              <textarea
                className="field notebook-paper min-h-72 resize-none"
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

/** 今いる場所を読み、日記に保存する（失敗しても何もしない。位置はログに出さない） */
function recordLocation(uid: string, diaryId: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveDiaryLocation(uid, diaryId, pos.coords.latitude, pos.coords.longitude)
          .catch(() => undefined)
          .finally(resolve);
      },
      () => resolve(),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/** 分析中（Figma Make の AnalyzingScreen） */
function AnalyzingView() {
  return (
    <main className="grid min-h-dvh place-items-center px-7 text-center">
      <div className="w-full">
        <div className="mx-auto mb-8 rounded-[calc(var(--radius)*1.5)] bg-hero px-2 pt-6">
          <WaitAnimation label="日記を分析しています" />
        </div>
        <h1 className="font-display text-2xl leading-relaxed" role="status">
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
