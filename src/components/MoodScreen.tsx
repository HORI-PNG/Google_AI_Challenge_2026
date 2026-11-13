"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoDataPanel } from "@/components/DemoDataPanel";
import { MoodChart, SERIES } from "@/components/MoodChart";
import { getDiariesSince } from "@/lib/diaries";
import {
  averageScores,
  buildDailySeries,
  formatDayLabel,
  periodStart,
  SCORE_KEYS,
  type ScoredEntry,
  type ScoreKey,
} from "@/lib/moodSeries";

const PERIODS = [
  { days: 7, label: "1週間" },
  { days: 30, label: "1か月" },
] as const;
const MAX_DAYS = 30;

type Load =
  | { status: "loading" }
  | { status: "ready"; entries: ScoredEntry[] }
  | { status: "error" };

export function MoodScreen({ user }: { user: User }) {
  const [days, setDays] = useState<number>(7);
  const [visible, setVisible] = useState<Record<ScoreKey, boolean>>({
    mood: true,
    energy: true,
    focus: true,
    stress: true,
  });
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  // 「今日」は読み込んだ時点で決める（日付をまたいでも、読み直すまでは同じ範囲）
  const [today, setToday] = useState(() => new Date());

  // 1か月分をまとめて読み、1週間はその中から切り出す
  useEffect(() => {
    let active = true;
    getDiariesSince(user.uid, periodStart(today, MAX_DAYS))
      .then((diaries) => {
        if (!active) return;
        const entries: ScoredEntry[] = diaries.flatMap((d) =>
          d.analysisStatus === "done" && d.analysis && d.createdAt
            ? [
                {
                  createdAt: d.createdAt,
                  scores: d.analysis.scores,
                  emotionLabels: d.analysis.emotion_labels,
                },
              ]
            : [],
        );
        setLoad({ status: "ready", entries });
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [user.uid, today, reloadKey]);

  const entries = load.status === "ready" ? load.entries : [];
  const points = buildDailySeries(entries, today, days);
  const average = averageScores(points);
  const recordedDays = points.filter((p) => p.scores).length;
  const periodLabel = PERIODS.find((p) => p.days === days)?.label ?? "";

  return (
    <div className="flex flex-col gap-5">
      {/* 期間（グラフ全体にかかるフィルターは、上に1列で） */}
      <div role="radiogroup" aria-label="期間" className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            role="radio"
            aria-checked={days === p.days}
            onClick={() => setDays(p.days)}
            className={`h-9 rounded-full px-4 text-sm ${
              days === p.days
                ? "bg-accent font-bold text-accent-foreground"
                : "border border-black/10 bg-card text-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {load.status === "error" && (
        <p role="alert" className="text-sm text-accent">
          日記を読み込めませんでした。
        </p>
      )}

      <section
        aria-label="感情の点数のグラフ"
        className={`flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm transition-opacity ${
          load.status === "loading" ? "opacity-50" : ""
        }`}
      >
        <h2 className="text-sm font-medium">
          感情の点数の移り変わり
          <span className="ml-2 text-xs font-normal text-muted">
            {periodLabel}・{recordedDays}日分の日記
          </span>
        </h2>

        {/* 凡例（押すと線の表示・非表示を切り替える） */}
        <ul className="flex flex-wrap gap-2" aria-label="凡例">
          {SCORE_KEYS.map((k) => (
            <li key={k}>
              <button
                type="button"
                aria-pressed={visible[k]}
                onClick={() => setVisible((v) => ({ ...v, [k]: !v[k] }))}
                className={`flex h-8 items-center gap-2 rounded-full border px-3 text-xs ${
                  visible[k] ? "border-black/10" : "border-transparent text-muted line-through"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-4 rounded-full"
                  style={{ background: visible[k] ? SERIES[k].color : "var(--chart-axis)" }}
                />
                {SERIES[k].label}
                {SERIES[k].note && <span className="text-muted">（{SERIES[k].note}）</span>}
              </button>
            </li>
          ))}
        </ul>

        {load.status === "ready" && recordedDays === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted">
            <p>この期間の日記はまだありません。</p>
            <Link href="/diary/new" className="text-accent underline underline-offset-4">
              日記を書く
            </Link>
          </div>
        ) : (
          <MoodChart points={points} visible={visible} />
        )}
      </section>

      {/* 期間の平均 */}
      {average && (
        <section aria-label={`${periodLabel}の平均`} className="grid grid-cols-2 gap-3">
          {SCORE_KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-1 rounded-2xl bg-card p-4 shadow-sm">
              <span className="flex items-center gap-2 text-xs text-muted">
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-3 rounded-full"
                  style={{ background: SERIES[k].color }}
                />
                {SERIES[k].label}の平均
              </span>
              <span className="text-2xl font-bold">
                {average[k]}
                <span className="ml-0.5 text-sm font-normal">点</span>
              </span>
              {SERIES[k].note && <span className="text-xs text-muted">{SERIES[k].note}</span>}
            </div>
          ))}
        </section>
      )}

      {/* 表で見る（色やグラフに頼らずに数値を確かめられる） */}
      {recordedDays > 0 && (
        <details className="rounded-2xl bg-card p-4 text-sm shadow-sm">
          <summary className="cursor-pointer">表で見る</summary>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-normal">日付</th>
                {SCORE_KEYS.map((k) => (
                  <th key={k} className="py-1 text-right font-normal">
                    {SERIES[k].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-black/5">
                  <td className="py-1">{formatDayLabel(p.date)}</td>
                  {SCORE_KEYS.map((k) => (
                    <td key={k} className="py-1 text-right tabular-nums">
                      {p.scores ? p.scores[k] : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <DemoDataPanel
        uid={user.uid}
        onChange={() => {
          setLoad({ status: "loading" });
          setToday(new Date());
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
