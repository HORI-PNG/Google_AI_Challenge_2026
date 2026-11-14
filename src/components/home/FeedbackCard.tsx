"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Ui";
import { Mascot } from "@/components/ui/Mascot";
import type { FeedbackState } from "@/components/useForecast";
import {
  PLACE_LABELS,
  PLACES,
  PRODUCTIVITY_LABELS,
  STUDY_TIME_LABELS,
  STUDY_TIMES,
  type Place,
  type Productivity,
  type StudyTime,
} from "@/lib/forecast";

// 「昨日ははかどった？」（PLAN.md 4章 ⑤）。3 段階は 1 タップで保存する。
// 時間帯と場所は任意（先に選んでおくと、いっしょに保存する）。予報の「はかどった日に多い時間帯・場所」の根拠になる

const ANSWERS: { value: Productivity; face: string }[] = [
  { value: 1, face: "😣" },
  { value: 2, face: "🙂" },
  { value: 3, face: "😆" },
];

export function FeedbackCard({ state }: { state: FeedbackState }) {
  const [studyTime, setStudyTime] = useState<StudyTime | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  if (state.status === "hidden") return null;

  if (state.status === "thanks") {
    return (
      <Card className="feedback-card">
        <div className="flex items-center gap-3" role="status">
          <Mascot mood="happy" size={56} />
          <p className="font-bold leading-relaxed">{state.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="feedback-card" aria-labelledby="feedback-title">
      <div className="flex items-center gap-3">
        <Mascot mood="cheer" size={56} />
        <div>
          <p className="text-xs font-bold text-accent-strong">YESTERDAY</p>
          <h2 id="feedback-title" className="font-display text-lg font-bold leading-snug">
            昨日（{state.dayLabel}）の勉強は、はかどった？
          </h2>
        </div>
      </div>

      <Chips
        legend="主に勉強した時間帯（任意）"
        options={STUDY_TIMES.map((v) => ({ value: v, label: STUDY_TIME_LABELS[v] }))}
        selected={studyTime}
        onSelect={setStudyTime}
      />
      <Chips
        legend="場所（任意）"
        options={PLACES.map((v) => ({ value: v, label: PLACE_LABELS[v] }))}
        selected={place}
        onSelect={setPlace}
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {ANSWERS.map((a) => (
          <button
            key={a.value}
            type="button"
            disabled={state.saving}
            onClick={() => state.onAnswer({ productivity: a.value, studyTime, place })}
            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border border-border bg-subtle px-1 text-xs font-bold transition active:scale-[.97] disabled:opacity-60"
          >
            <span className="text-2xl" aria-hidden="true">
              {a.face}
            </span>
            {PRODUCTIVITY_LABELS[a.value]}
          </button>
        ))}
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-accent-strong">
          {state.error}
        </p>
      )}
      <button
        type="button"
        onClick={state.onSkip}
        disabled={state.saving}
        className="mt-2 min-h-11 w-full text-sm font-bold text-muted underline underline-offset-4"
      >
        あとで答える
      </button>
    </Card>
  );
}

function Chips<T extends string>({
  legend,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T | null) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-xs font-bold text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              // もう一度押すと選択を外す（任意の項目なので）
              onClick={() => onSelect(on ? null : o.value)}
              className={`min-h-10 rounded-full border px-4 text-sm font-bold transition ${
                on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
