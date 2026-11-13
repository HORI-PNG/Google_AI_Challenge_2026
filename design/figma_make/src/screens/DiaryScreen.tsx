import { useEffect, useState } from "react";
import { events } from "../data";
import { BackHeader, Button } from "../components/Ui";

type Tab = "write" | "speak" | "choose";
type VoiceState = "idle" | "recording" | "processing" | "review";

export function DiaryScreen({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  const [tab, setTab] = useState<Tab>("write");
  return (
    <main className="min-h-dvh pb-8">
      <BackHeader title="今日の日記" onBack={onBack} />
      <div className="p-4">
        <div className="grid grid-cols-3 rounded-[var(--radius-control)] bg-[var(--subtle)] p-1">
          {(
            [
              ["write", "✎ 書く"],
              ["speak", "◉ 話す"],
              ["choose", "✓ 選ぶ"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`min-h-12 rounded-[calc(var(--radius-control)-4px)] font-bold transition ${
                tab === id
                  ? "bg-[var(--card)] text-[var(--accent-strong)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "write" && <WritePanel onSave={onSave} />}
        {tab === "speak" && <SpeakPanel onSave={onSave} />}
        {tab === "choose" && <ChoosePanel onSave={onSave} />}
      </div>
    </main>
  );
}

function WritePanel({ onSave }: { onSave: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-6">
      <div className="mb-4">
        <p className="font-[var(--font-heading)] text-xl font-bold">思ったまま、書いてみよう</p>
        <p className="mt-1 text-sm text-[var(--muted)]">うまくまとめなくて大丈夫です。</p>
      </div>
      <textarea
        autoFocus
        className="field min-h-72 resize-none leading-relaxed"
        maxLength={4000}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="うれしかったこと、疲れたこと、分かったこと…思ったままに書いてね"
      />
      <p className="mt-2 text-right text-sm text-[var(--muted)]">{text.length} / 4000</p>
      <Button onClick={onSave} className="mt-5 w-full" disabled={!text.trim()}>
        保存して分析する
      </Button>
    </div>
  );
}

function SpeakPanel({ onSave }: { onSave: () => void }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [seconds, setSeconds] = useState(42);
  const [transcript, setTranscript] = useState(
    "今日は部活で少し疲れたけど、テストの問題が前より解けてうれしかった。二次関数の平方完成がやっと分かった。",
  );

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => setSeconds((value) => Math.min(value + 1, 120)), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  if (state === "processing") {
    return (
      <div className="grid min-h-[480px] place-items-center text-center">
        <div>
          <div className="mx-auto mb-7 flex size-24 items-center justify-center rounded-full bg-[var(--soft-accent)]">
            <div className="size-10 animate-pulse rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
          <h2 className="font-[var(--font-heading)] text-xl font-bold">声を文章にしています</h2>
          <p className="mt-3 text-[var(--muted)]">Gemini が声を文章にしています…</p>
          <button
            onClick={() => setState("review")}
            className="mt-8 min-h-11 text-sm font-bold text-[var(--accent-strong)] underline underline-offset-4"
          >
            デモ：文章を確認する
          </button>
        </div>
      </div>
    );
  }

  if (state === "review") {
    return (
      <div className="mt-6">
        <h2 className="font-[var(--font-heading)] text-xl font-bold">文章を確認してね</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">聞き間違いがあれば、ここで直せます。</p>
        <textarea
          className="field mt-5 min-h-64 resize-none leading-relaxed"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />
        <Button onClick={onSave} className="mt-5 w-full">
          保存して分析する
        </Button>
        <Button onClick={() => setState("idle")} variant="ghost" className="mt-2 w-full">
          録り直す
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
      {state === "recording" ? (
        <>
          <div className="relative mb-7 grid size-32 place-items-center rounded-full bg-[var(--soft-accent)]">
            <div className="absolute size-32 animate-ping rounded-full border border-[var(--recording)] opacity-30" />
            <div className="size-5 animate-pulse rounded-full bg-[var(--recording)]" />
          </div>
          <h2 className="font-[var(--font-heading)] text-2xl font-bold">聞いているよ</h2>
          <p className="mt-3 font-mono text-xl font-bold">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}{" "}
            <span className="text-[var(--muted)]">/ 2:00</span>
          </p>
          <Button onClick={() => setState("processing")} className="mt-10 w-full">
            話し終わった
          </Button>
        </>
      ) : (
        <>
          <div className="mb-7 grid size-32 place-items-center rounded-full bg-[var(--soft-accent)] text-4xl text-[var(--accent-strong)]">
            ◉
          </div>
          <h2 className="font-[var(--font-heading)] text-xl font-bold">
            今日あったことや気持ちを、
            <br />
            そのまま話してね
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            2分まで録音できます。長く話すと、
            <br />
            全部は文字にできないことがあるよ。
          </p>
          <Button
            onClick={() => {
              setSeconds(0);
              setState("recording");
            }}
            className="mt-10 w-full"
          >
            話しはじめる
          </Button>
        </>
      )}
    </div>
  );
}

function ChoosePanel({ onSave }: { onSave: () => void }) {
  const [mood, setMood] = useState("");
  const [condition, setCondition] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const toggleEvent = (item: string) => {
    setSelectedEvents((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  };

  return (
    <div className="mt-6 space-y-7">
      <ChipGroup
        title="気分"
        subtitle="1つ選んでね"
        items={["😄 とても良い", "🙂 良い", "😐 ふつう", "😞 いまいち", "😢 つらい"]}
        selected={[mood]}
        onSelect={setMood}
      />
      <ChipGroup
        title="体調"
        subtitle="1つ選んでね"
        items={["💪 元気", "🙂 ふつう", "😪 眠い", "🥱 疲れた", "🤒 体調が悪い"]}
        selected={[condition]}
        onSelect={setCondition}
      />
      <ChipGroup
        title="今日あったこと"
        subtitle="いくつでも"
        items={events}
        selected={selectedEvents}
        onSelect={toggleEvent}
      />
      <label className="block font-bold">
        ひとこと <span className="text-sm font-normal text-[var(--muted)]">（任意）</span>
        <textarea
          className="field mt-2 min-h-28 resize-none"
          maxLength={100}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="もう少し残しておきたいこと"
        />
        <span className="mt-1 block text-right text-xs font-normal text-[var(--muted)]">
          {note.length} / 100
        </span>
      </label>
      <Button onClick={onSave} className="w-full" disabled={!mood || !condition}>
        {mood && condition ? "保存して分析する" : "気分と体調を選んでね"}
      </Button>
    </div>
  );
}

function ChipGroup({
  title,
  subtitle,
  items,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  items: string[];
  selected: string[];
  onSelect: (item: string) => void;
}) {
  return (
    <fieldset>
      <legend className="font-[var(--font-heading)] text-lg font-bold">
        {title} <span className="ml-1 text-xs font-normal text-[var(--muted)]">{subtitle}</span>
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
              className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] bg-[var(--card)]"}`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
