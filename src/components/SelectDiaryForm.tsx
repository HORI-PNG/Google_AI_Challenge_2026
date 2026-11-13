"use client";

import { type FormEvent, useState } from "react";
import {
  buildSelectText,
  CONDITION_OPTIONS,
  EVENT_OPTIONS,
  isSelectComplete,
  MOOD_OPTIONS,
  NOTE_MAX_LENGTH,
  type SelectDiaryInput,
} from "@/lib/selectDiary";

// 項目を選んでつける日記（書くのが面倒な日でも続けられるように）

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm ${
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-black/10 bg-card"
      }`}
    >
      {label}
    </button>
  );
}

export function SelectDiaryForm({
  onSubmit,
  saving,
}: {
  onSubmit: (text: string) => void;
  saving: boolean;
}) {
  const [input, setInput] = useState<SelectDiaryInput>({
    mood: "",
    condition: "",
    events: [],
    note: "",
  });

  function toggleEvent(event: string) {
    setInput((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSelectComplete(input)) return;
    onSubmit(buildSelectText(input));
  }

  const complete = isSelectComplete(input);

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">気分</legend>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((o) => (
            <Chip
              key={o}
              label={o}
              selected={input.mood === o}
              onClick={() => setInput((p) => ({ ...p, mood: o }))}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">体調</legend>
        <div className="flex flex-wrap gap-2">
          {CONDITION_OPTIONS.map((o) => (
            <Chip
              key={o}
              label={o}
              selected={input.condition === o}
              onClick={() => setInput((p) => ({ ...p, condition: o }))}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          今日あったこと<span className="ml-1 text-xs text-muted">（いくつでも）</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((o) => (
            <Chip
              key={o}
              label={o}
              selected={input.events.includes(o)}
              onClick={() => toggleEvent(o)}
            />
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          ひとこと<span className="ml-1 text-xs text-muted">（なくてもOK）</span>
        </span>
        <input
          value={input.note}
          onChange={(e) => setInput((p) => ({ ...p, note: e.target.value }))}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="例：英単語あんまり覚えられなかった"
          className="h-12 w-full rounded-xl border border-black/10 bg-card px-4 text-base outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={!complete || saving}
        className="mt-auto h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm disabled:opacity-60"
      >
        {saving ? "保存中…" : complete ? "保存して分析する" : "気分と体調を選んでね"}
      </button>
    </form>
  );
}
