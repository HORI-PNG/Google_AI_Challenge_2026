"use client";

import { curvePoints, REVIEW_THRESHOLD, retention, type LearningItem } from "@/lib/forgetting";

// 1 つの「学んだこと」の忘却曲線（段階13）。復習した日に曲線が 100% に戻る

const W = 320;
const H = 160;
const PAD = { left: 34, right: 10, top: 12, bottom: 24 };
const FUTURE_DAYS = 7;

export function ForgettingCurve({ item, now }: { item: LearningItem; now: Date }) {
  const points = curvePoints(item, now, FUTURE_DAYS);
  const nowDay = (now.getTime() - item.learnedAt.getTime()) / 86400000;
  const maxDay = Math.max(nowDay + FUTURE_DAYS, 3);
  const x = (day: number) => PAD.left + (day / maxDay) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v) * (H - PAD.top - PAD.bottom);
  const past = points.filter((p) => p.day <= nowDay);
  const future = points.filter((p) => p.day >= nowDay);
  const path = (ps: typeof points) => ps.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const current = retention(item, now);
  const percent = Math.round(current * 100);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`「${item.topic}」の忘却曲線。今の記憶の残りは約 ${percent}%`}
      >
        {[1, 0.5, 0].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={v === REVIEW_THRESHOLD ? "4 4" : undefined} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {v * 100}%
            </text>
          </g>
        ))}
        <text x={W - PAD.right} y={y(REVIEW_THRESHOLD) - 4} textAnchor="end" fontSize="10" fill="var(--muted)">
          復習のめやす
        </text>
        <path d={path(past)} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(future)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 5" opacity="0.6" />
        {item.reviews.map((r) => {
          const d = (r.at.getTime() - item.learnedAt.getTime()) / 86400000;
          return <circle key={r.at.getTime()} cx={x(d)} cy={y(1)} r="4" fill={r.result === "remembered" ? "var(--accent)" : "var(--muted)"} />;
        })}
        <line x1={x(nowDay)} x2={x(nowDay)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--foreground)" strokeOpacity="0.3" />
        <circle cx={x(nowDay)} cy={y(current)} r="5" fill="var(--accent-strong)" />
        <text x={PAD.left} y={H - 6} fontSize="10" fill="var(--muted)">
          学んだ日
        </text>
        <text x={x(nowDay)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
          今
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        実線：これまで　点線：復習しなかったときの見込み　●：復習した日
      </figcaption>
    </figure>
  );
}
