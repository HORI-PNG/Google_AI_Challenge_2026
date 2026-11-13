"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Ui";
import {
  buildSelectText,
  CONDITION_OPTIONS,
  EVENT_OPTIONS,
  isSelectComplete,
  MOOD_OPTIONS,
  NOTE_MAX_LENGTH,
  type SelectDiaryInput,
} from "@/lib/selectDiary";

// 項目を選んでつける日記（書くのが面倒な日でも続けられるように）。見た目は Figma Make の ChoosePanel から移した

function ChipGroup({
  title,
  subtitle,
  items,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  items: readonly string[];
  selected: string[];
  onSelect: (item: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-display text-lg font-bold">
        {title} <span className="ml-1 text-xs font-normal text-muted">{subtitle}</span>
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(item)}
              className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${
                active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SelectDiaryForm({ onSubmit, saving }: { onSubmit: (text: string) => void; saving: boolean }) {
  const [input, setInput] = useState<SelectDiaryInput>({ mood: "", condition: "", events: [], note: "" });

  function toggleEvent(event: string) {
    setInput((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isSelectComplete(input)) return;
    onSubmit(buildSelectText(input));
  }

  const complete = isSelectComplete(input);

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-7">
      <ChipGroup
        title="気分"
        subtitle="1つ選んでね"
        items={MOOD_OPTIONS}
        selected={[input.mood]}
        onSelect={(o) => setInput((p) => ({ ...p, mood: o }))}
      />
      <ChipGroup
        title="体調"
        subtitle="1つ選んでね"
        items={CONDITION_OPTIONS}
        selected={[input.condition]}
        onSelect={(o) => setInput((p) => ({ ...p, condition: o }))}
      />
      <ChipGroup
        title="今日あったこと"
        subtitle="いくつでも"
        items={EVENT_OPTIONS}
        selected={input.events}
        onSelect={toggleEvent}
      />
      <label className="block font-bold">
        ひとこと <span className="text-sm font-normal text-muted">（任意）</span>
        <textarea
          className="field mt-2 min-h-28 resize-none"
          maxLength={NOTE_MAX_LENGTH}
          value={input.note}
          onChange={(e) => setInput((p) => ({ ...p, note: e.target.value }))}
          placeholder="例：英単語あんまり覚えられなかった"
        />
        <span className="mt-1 block text-right text-xs font-normal text-muted tabular-nums">
          {input.note.length} / {NOTE_MAX_LENGTH}
        </span>
      </label>
      <Button type="submit" className="w-full" disabled={!complete || saving}>
        {saving ? "保存中…" : complete ? "保存して分析する" : "気分と体調を選んでね"}
      </Button>
    </form>
  );
}
