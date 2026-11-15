"use client";

import type { User } from "firebase/auth";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { getDiariesSince } from "@/lib/diaries";
import { getFeedbackSince } from "@/lib/feedback";
import { dateKey, startOfDay } from "@/lib/forecast";
import { groupSpots, hakadoriLevel, MAP_DAYS, type MapEntry, type MapSpot } from "@/lib/placeMap";

// はかどり場所マップ（段階14）。日記を書いた場所を、はかどり具合で色分けして地図に出す

// Leaflet はブラウザでしか動かないので、サーバーでは描かない
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-[360px] w-full animate-pulse rounded-[var(--radius)] bg-subtle" />,
});

type Load = { status: "loading" } | { status: "ready"; spots: MapSpot[] } | { status: "error" };

const LEGEND = [1, 0.5, 0, null].map((h) => hakadoriLevel(h));

export function MapScreen({ user }: { user: User }) {
  const { settings } = useAuth();
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const since = startOfDay(new Date(), MAP_DAYS);
    Promise.all([getDiariesSince(user.uid, since), getFeedbackSince(user.uid, dateKey(since)).catch(() => [])])
      .then(([diaries, feedback]) => {
        if (!active) return;
        const productivity = new Map(feedback.map((f) => [f.date, f.productivity]));
        const entries: MapEntry[] = diaries.flatMap((d) => {
          if (!d.location || !d.createdAt) return [];
          const date = dateKey(d.createdAt);
          const scores = d.analysis?.scores;
          return [
            {
              date,
              lat: d.location.lat,
              lng: d.location.lng,
              productivity: productivity.get(date) ?? null,
              scores: scores ? { mood: scores.mood, focus: scores.focus } : null,
            },
          ];
        });
        setLoad({ status: "ready", spots: groupSpots(entries) });
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [user.uid]);

  if (load.status === "loading") return <p className="text-sm text-muted">読み込み中…</p>;
  if (load.status === "error") {
    return (
      <p role="alert" className="text-sm font-bold text-accent-strong">
        日記を読み込めませんでした。
      </p>
    );
  }

  const { spots } = load;
  const best = spots.filter((s) => s.hakadori !== null && s.count >= 2).sort((a, b) => (b.hakadori ?? 0) - (a.hakadori ?? 0))[0];

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-xl leading-relaxed">
        {spots.length === 0
          ? "まだ場所のある日記がありません。"
          : best
            ? `いちばんはかどるのは、日記 ${best.count} 日分の「場所 ${spots.indexOf(best) + 1}」です。`
            : "日記がたまるほど、はかどる場所がはっきりします。"}
      </p>
      {spots.length === 0 && (
        <p className="-mt-2 text-sm leading-relaxed text-muted">日記を書いた場所を記録すると、はかどる場所が地図で分かります。</p>
      )}

      {spots.length === 0 && !settings?.locationEnabled && (
        <Link
          href="/settings"
          className="flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 font-bold text-accent-foreground"
        >
          <Icon name="pin" size={18} />
          <span className="flex-1">設定で「日記に場所を記録する」をオンにする</span>
          <Icon name="next" size={18} />
        </Link>
      )}

      <LeafletMap spots={spots} />

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="色の意味">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1">
            <span className="inline-block size-3 rounded-full" style={{ backgroundColor: l.color }} aria-hidden="true" />
            {l.label}
          </li>
        ))}
      </ul>

      {spots.length > 0 && (
        <section>
          <h2 className="text-sm font-bold">場所ごとの記録（最近 {MAP_DAYS} 日）</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {spots.map((s, i) => {
              const level = hakadoriLevel(s.hakadori);
              return (
                <li key={s.key} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm">
                  <span className="inline-block size-4 shrink-0 rounded-full" style={{ backgroundColor: level.color }} aria-hidden="true" />
                  <span className="flex-1">
                    <strong>場所 {i + 1}</strong>・{level.label}
                    <span className="block text-xs text-muted">
                      日記 {s.count} 日・はかどった日 {s.productiveDays} 日
                      {s.avgFocus !== null && `・平均の集中 ${s.avgFocus}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">
        色は「はかどった？」の答え（答えていない日は集中の点数）の平均です。場所は約 100m の粗さで記録しており、本人しか見られません。
      </p>
    </div>
  );
}
