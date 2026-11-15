"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ForgettingCurve } from "@/components/ForgettingCurve";
import { Mascot } from "@/components/ui/Mascot";
import { Card } from "@/components/ui/Ui";
import { Icon } from "@/components/ui/Icon";
import { calendarUrl } from "@/lib/calendar";
import { ApiRequestError, requestQuiz } from "@/lib/diaries";
import { dateKey } from "@/lib/forecast";
import {
  daysAgoLabel,
  isDue,
  LEARNING_DAYS,
  nextReviewAt,
  retention,
  sortForReview,
  type LearningItem,
  type Quiz,
  type ReviewResult,
} from "@/lib/forgetting";
import { loadLearnings, saveReview } from "@/lib/learnings";
import type { UserProfile } from "@/lib/userProfile";

// 復習（忘却曲線。段階13）。
// 学んだことを、記憶の残りが少ない順に並べ、選んだものの忘却曲線と思い出しクイズを出す

type Load = { status: "loading" } | { status: "ready"; items: LearningItem[] } | { status: "error" };

type QuizState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; quiz: Quiz; showAnswer: boolean }
  | { status: "error"; message: string };

export function ReviewScreen({ user, profile }: { user: User; profile: UserProfile }) {
  const [now] = useState(() => new Date());
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadLearnings(user.uid, now)
      .then((items) => {
        if (!active) return;
        const sorted = sortForReview(items, now);
        setLoad({ status: "ready", items: sorted });
        setSelectedId(sorted[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [user.uid, now]);

  if (load.status === "loading") return <p className="text-sm text-muted">読み込み中…</p>;
  if (load.status === "error") {
    return (
      <p role="alert" className="text-sm font-bold text-accent-strong">
        学んだことを読み込めませんでした。
      </p>
    );
  }
  if (load.items.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <Mascot mood="cheer" size={66} />
        <p className="font-bold leading-relaxed">
          まだ「学んだこと」がないよ。日記に、勉強や部活で分かったことを書くと、ここに出てくるよ。
        </p>
      </div>
    );
  }

  const items = load.items;
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const dueCount = items.filter((i) => isDue(i, now)).length;

  function select(id: string) {
    setSelectedId(id);
    setQuiz({ status: "idle" });
    setMessage(null);
  }

  async function startQuiz() {
    setQuiz({ status: "loading" });
    try {
      const q = await requestQuiz(user, { grade: profile.grade, topic: selected.topic, point: selected.point });
      setQuiz({ status: "ready", quiz: q, showAnswer: false });
    } catch (e) {
      setQuiz({ status: "error", message: e instanceof ApiRequestError ? e.message : "クイズを作れませんでした" });
    }
  }

  async function answer(result: ReviewResult) {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await saveReview(user.uid, selected, result, new Date());
      setLoad({ status: "ready", items: items.map((i) => (i.id === updated.id ? updated : i)) });
      setQuiz({ status: "idle" });
      setMessage(
        result === "remembered"
          ? "思い出せました。前より忘れにくくなっています。"
          : "今思い出したので、ここからまた覚え直せます。",
      );
    } catch {
      setMessage("保存できませんでした。もう一度押してね");
    } finally {
      setSaving(false);
    }
  }

  const next = nextReviewAt(selected);
  const nextUrl = calendarUrl({
    title: `復習：${selected.topic}`,
    date: dateKey(next),
    range: "19:00〜19:15",
    details: `${selected.point}\n\nRe:Note の忘却曲線から追加しました（記憶の残りが 50% になるめやすの日）。`,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-xl leading-relaxed">
        {dueCount > 0 ? `忘れかけていることが ${dueCount} つあります。` : "今はどれもよく覚えています。"}
      </p>

      <Card className="p-5">
        <p className="text-xs font-bold text-muted">
          {daysAgoLabel(selected.learnedAt, now)}に学んだこと（復習 {selected.reviews.length} 回）
        </p>
        <h2 className="mt-1 font-display text-xl">{selected.topic}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{selected.point}</p>
        <div className="mt-4">
          <ForgettingCurve item={selected} now={now} />
        </div>

        {message && (
          <p className="mt-3 rounded-[var(--radius-control)] bg-soft-accent p-3 text-sm font-bold" aria-live="polite">
            {message}
          </p>
        )}

        <div className="mt-4" aria-live="polite">
          {quiz.status === "idle" && (
            <button
              type="button"
              onClick={startQuiz}
              className="min-h-12 w-full rounded-[var(--radius-control)] bg-accent px-5 font-bold text-accent-foreground"
            >
              思い出しクイズで復習する
            </button>
          )}
          {quiz.status === "loading" && <p className="text-sm text-muted">Gemini がクイズを作っています…</p>}
          {quiz.status === "error" && (
            <div>
              <p role="alert" className="text-sm font-bold text-accent-strong">
                {quiz.message}
              </p>
              <ReviewButtons saving={saving} onAnswer={answer} />
            </div>
          )}
          {quiz.status === "ready" && (
            <div className="rounded-[var(--radius-control)] border border-border bg-subtle p-4">
              <p className="text-xs font-bold text-accent-strong">Q.</p>
              <p className="mt-1 font-bold leading-relaxed">{quiz.quiz.question}</p>
              {!quiz.showAnswer && quiz.quiz.hint && <p className="mt-2 text-xs text-muted">ヒント：{quiz.quiz.hint}</p>}
              {quiz.showAnswer ? (
                <>
                  <p className="mt-3 text-xs font-bold text-accent-strong">A.</p>
                  <p className="mt-1 text-sm leading-relaxed">{quiz.quiz.answer}</p>
                  <ReviewButtons saving={saving} onAnswer={answer} />
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuiz({ ...quiz, showAnswer: true })}
                  className="mt-3 min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-card font-bold"
                >
                  答えを見る
                </button>
              )}
            </div>
          )}
        </div>

        {nextUrl && (
          <a
            href={nextUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-border px-4 py-2 text-sm font-bold"
          >
            <Icon name="calendar" size={18} className="text-accent-strong" />
            <span className="flex-1">次の復習（{next.getMonth() + 1}/{next.getDate()} ごろ）をカレンダーに入れる</span>
            <Icon name="external" size={16} className="text-muted" />
          </a>
        )}
      </Card>

      <section>
        <h2 className="text-sm font-bold">学んだこと（最近 {LEARNING_DAYS} 日、忘れかけている順）</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => {
            const r = Math.round(retention(item, now) * 100);
            const due = isDue(item, now);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => select(item.id)}
                  aria-pressed={item.id === selected.id}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] border-2 bg-card px-4 py-2 text-left ${
                    item.id === selected.id ? "border-accent" : "border-border"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{item.topic}</strong>
                    <span className="text-xs text-muted">
                      {daysAgoLabel(item.learnedAt, now)}、復習 {item.reviews.length} 回{due && "（そろそろ復習）"}
                    </span>
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    <strong className={`font-num text-lg ${due ? "text-accent-strong" : ""}`}>{r}%</strong>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-track">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${r}%` }} />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          記憶の残り（%）は、エビングハウスの忘却曲線をもとにした目安です。「思い出せた」と答えるほど、忘れにくくなるように計算しています。
        </p>
        <Link href="/diary/new" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-accent-strong underline">
          今日学んだことを日記に書く
        </Link>
      </section>
    </div>
  );
}

function ReviewButtons({ saving, onAnswer }: { saving: boolean; onAnswer: (r: ReviewResult) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={saving}
        onClick={() => onAnswer("remembered")}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-accent font-bold text-accent-foreground disabled:opacity-50"
      >
        <Icon name="face3" size={20} />
        思い出せた
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => onAnswer("forgot")}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-card font-bold disabled:opacity-50"
      >
        <Icon name="face1" size={20} />
        忘れてた
      </button>
    </div>
  );
}
