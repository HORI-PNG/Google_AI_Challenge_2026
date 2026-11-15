"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mascot } from "@/components/ui/Mascot";
import { SpeechBubble } from "@/components/ui/Ui";
import {
  ASK_DAILY_LIMIT,
  ASK_HISTORY_DAYS,
  MAX_HISTORY_TURNS,
  MAX_QUESTION_LENGTH,
  shortenForAsk,
  SUGGESTED_QUESTIONS,
  type AskDiary,
  type AskTurn,
} from "@/lib/ask";
import { ApiRequestError, formatDateTime, getDiariesSince, requestAsk } from "@/lib/diaries";
import { getFeedbackSince, getForecast } from "@/lib/feedback";
import { dateKey, describeForecast, startOfDay } from "@/lib/forecast";
import type { UserProfile } from "@/lib/userProfile";

// 「ハカドリに聞く」（自分専用 AI への質問。段階12）。
// 会話は保存しない（画面を閉じると消える）。日記の本文は要点だけを Gemini に送る

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Material = { diaries: AskDiary[]; forecast: string | null };

type Turn = AskTurn & { id: number };

export function AskScreen({ user, profile }: { user: User; profile: UserProfile }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  // 最近 14 日の日記・「はかどった？」・今日の予報を読む
  useEffect(() => {
    let active = true;
    const now = new Date();
    const since = startOfDay(now, ASK_HISTORY_DAYS);
    Promise.all([
      getDiariesSince(user.uid, since),
      getFeedbackSince(user.uid, dateKey(since)).catch(() => []),
      getForecast(user.uid, dateKey(now)).catch(() => null),
    ])
      .then(([diaries, feedback, saved]) => {
        if (!active) return;
        const productivity = new Map(feedback.map((f) => [f.date, f.productivity]));
        const list: AskDiary[] = diaries
          .filter((d) => d.createdAt && d.rawText.trim())
          .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
          .map((d) => {
            const at = d.createdAt as Date;
            return {
              date: `${at.getMonth() + 1}/${at.getDate()}（${WEEKDAYS[at.getDay()]}）`,
              text: shortenForAsk(d.rawText),
              scores: d.analysis?.scores ?? null,
              labels: (d.analysis?.emotion_labels ?? []).slice(0, 6),
              productivity: productivity.get(dateKey(at)) ?? null,
            };
          });
        setMaterial({ diaries: list, forecast: saved ? describeForecast(saved.forecast) : null });
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [user.uid]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, sending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || !material || sending) return;
    setError(null);
    setSending(true);
    const history = turns.slice(-MAX_HISTORY_TURNS).map(({ role, text }) => ({ role, text }));
    setTurns((prev) => [...prev, { id: nextId.current++, role: "user", text: q }]);
    setInput("");
    const { date, time } = formatDateTime(new Date());
    try {
      const answer = await requestAsk(user, {
        now: `${date}${time}`,
        grade: profile.grade,
        diaries: material.diaries,
        forecast: material.forecast,
        history,
        question: q,
      });
      setTurns((prev) => [...prev, { id: nextId.current++, role: "hakadori", text: answer }]);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "答えられませんでした");
    } finally {
      setSending(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[72px_1fr] items-end gap-2">
        <Mascot mood="normal" size={78} />
        <SpeechBubble>
          最近 {ASK_HISTORY_DAYS} 日の日記を読んで答えるよ。自分のこと、なんでも聞いてみて。
        </SpeechBubble>
      </div>

      {loadError && (
        <p role="alert" className="text-sm font-bold text-accent-strong">
          日記を読み込めませんでした。開き直してみてね。
        </p>
      )}
      {material && material.diaries.length === 0 && (
        <p className="text-sm leading-relaxed text-muted">
          まだ最近の日記がないから、答えられることが少ないかも。日記を書いてから聞いてみてね。
        </p>
      )}

      <ul className="flex flex-col gap-3" aria-live="polite">
        {turns.map((t) =>
          t.role === "user" ? (
            <li key={t.id} className="ml-auto max-w-[85%] rounded-[var(--radius-control)] bg-accent px-4 py-3 text-sm font-bold leading-relaxed text-accent-foreground">
              {t.text}
            </li>
          ) : (
            <li key={t.id} className="grid grid-cols-[44px_1fr] items-start gap-2">
              <Mascot mood="normal" size={44} />
              <p className="whitespace-pre-wrap rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm leading-relaxed">
                {t.text}
              </p>
            </li>
          ),
        )}
        {sending && (
          <li className="grid grid-cols-[44px_1fr] items-center gap-2">
            <Mascot mood="normal" size={44} />
            <p className="text-sm text-muted">日記を読み返しています…</p>
          </li>
        )}
      </ul>
      <div ref={bottom} />

      {error && (
        <p role="alert" className="text-sm font-bold text-accent-strong">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void ask(q)}
            disabled={!material || sending}
            className="min-h-11 rounded-full border border-border bg-subtle px-4 text-sm font-bold disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2">
        <label className="sr-only" htmlFor="ask-input">
          ハカドリへの質問
        </label>
        <textarea
          id="ask-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          rows={2}
          placeholder="例：テスト前の自分ってどんな感じ？"
          className="min-h-12 flex-1 resize-none rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-base"
        />
        <button
          type="submit"
          disabled={!material || sending || !input.trim()}
          className="min-h-12 rounded-[var(--radius-control)] bg-accent px-5 font-bold text-accent-foreground disabled:opacity-50"
        >
          聞く
        </button>
      </form>
      <p className="text-xs leading-relaxed text-muted">
        答えは日記をもとに AI（Gemini）が考えたものです。1 日 {ASK_DAILY_LIMIT} 回まで。会話は保存しません。
      </p>
    </div>
  );
}
