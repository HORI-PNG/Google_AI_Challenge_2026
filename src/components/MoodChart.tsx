"use client";

import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import {
  contiguousRuns,
  formatDayLabel,
  formatShortDate,
  SCORE_KEYS,
  type DayPoint,
  type ScoreKey,
} from "@/lib/moodSeries";

// 気分のグラフ（SVG で自作）。4 つの点数を折れ線で表示する。
// 色は categorical の順番を固定（globals.css の --series-*）。日記のない日は線を途切れさせる。
// SVG の属性（stroke="var(--x)"）では CSS 変数が効かないので、色は style で指定する。

export const SERIES: Record<ScoreKey, { label: string; color: string; note?: string }> = {
  mood: { label: "気分", color: "var(--series-mood)" },
  energy: { label: "元気", color: "var(--series-energy)" },
  focus: { label: "集中", color: "var(--series-focus)" },
  stress: { label: "ストレス", color: "var(--series-stress)", note: "低いほど良い" },
};

const W = 360;
const H = 220;
const M = { top: 12, right: 52, bottom: 28, left: 30 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];
/** 線の端の名前どうしが、これより近いときは名前を出さない（凡例とツールチップに任せる） */
const MIN_LABEL_GAP = 12;

export function MoodChart({
  points,
  visible,
}: {
  points: DayPoint[];
  visible: Record<ScoreKey, boolean>;
}) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const n = points.length;
  const isWeek = n <= 7;

  const x = (i: number) => M.left + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (v: number) => M.top + (1 - v / 100) * PLOT_H;

  const runs = contiguousRuns(points);
  const keys = SCORE_KEYS.filter((k) => visible[k]);
  const lastIndex = runs.at(-1)?.at(-1) ?? null;

  // 線の端の名前（重なるときは出さない）
  const endLabels =
    lastIndex === null
      ? []
      : keys
          .map((k) => ({ key: k, y: y(points[lastIndex].scores?.[k] ?? 0) }))
          .sort((a, b) => a.y - b.y);
  const labelsCollide = endLabels.some(
    (l, i) => i > 0 && l.y - endLabels[i - 1].y < MIN_LABEL_GAP,
  );

  // x 軸の目盛り：1週間は毎日、1か月は最後の日から7日おき
  const xTicks = points
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => isWeek || (n - 1 - i) % 7 === 0);

  function indexFromPointer(event: PointerEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = (px - M.left) / PLOT_W;
    return Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -1 : 1;
      setActive((prev) => Math.max(0, Math.min(n - 1, (prev ?? n - 1) + step)));
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  const activePoint = active === null ? null : points[active];
  const tooltipLeft = active === null ? 0 : (x(active) / W) * 100;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="img"
        aria-label="感情の点数の移り変わりのグラフ。左右の矢印キーで日を選べます。数値は下の「表で見る」でも確かめられます。"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((prev) => prev ?? (lastIndex ?? n - 1))}
        onBlur={() => setActive(null)}
      >
        {/* 目盛り線（細く、目立たない色） */}
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              style={{ stroke: t === 0 ? "var(--chart-axis)" : "var(--chart-grid)" }}
              strokeWidth={1}
            />
            {t % 50 === 0 && (
              <text
                x={M.left - 6}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted text-[10px] tabular-nums"
              >
                {t}
              </text>
            )}
          </g>
        ))}

        {xTicks.map(({ p, i }) => (
          <text
            key={p.date}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted text-[10px] tabular-nums"
          >
            {formatShortDate(p.date)}
          </text>
        ))}

        {/* 折れ線（日記のない日で区切る） */}
        {keys.map((k) =>
          runs.map((run) =>
            run.length > 1 ? (
              <polyline
                key={`${k}-${run[0]}`}
                points={run.map((i) => `${x(i)},${y(points[i].scores?.[k] ?? 0)}`).join(" ")}
                fill="none"
                style={{ stroke: SERIES[k].color }}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null,
          ),
        )}

        {/* 点：1週間はすべて、1か月は「前後に日記がない日」と最後の日だけ */}
        {keys.map((k) =>
          runs.flatMap((run) =>
            run
              .filter((i) => isWeek || run.length === 1 || i === lastIndex)
              .map((i) => (
                <circle
                  key={`${k}-dot-${i}`}
                  cx={x(i)}
                  cy={y(points[i].scores?.[k] ?? 0)}
                  r={4}
                  style={{ fill: SERIES[k].color, stroke: "var(--card)" }}
                  strokeWidth={2}
                />
              )),
          ),
        )}

        {/* 線の端の名前（文字は文字の色。色は横の線が伝える） */}
        {lastIndex !== null &&
          !labelsCollide &&
          endLabels.map((l) => (
            <text
              key={`label-${l.key}`}
              x={x(lastIndex) + 8}
              y={l.y}
              dominantBaseline="middle"
              className="fill-foreground text-[10px]"
            >
              {SERIES[l.key].label}
            </text>
          ))}

        {/* 選んだ日の縦線 */}
        {active !== null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={M.top}
            y2={M.top + PLOT_H}
            style={{ stroke: "var(--chart-axis)" }}
            strokeWidth={1}
          />
        )}

        {/* ポインターの受け取り（線に当てなくても、日を選べる） */}
        <rect
          x={M.left - 8}
          y={M.top}
          width={PLOT_W + 16}
          height={PLOT_H}
          fill="transparent"
          onPointerMove={(e) => setActive(indexFromPointer(e))}
          onPointerDown={(e) => setActive(indexFromPointer(e))}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActive(null);
          }}
        />
      </svg>

      {activePoint && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-[var(--radius-small)] border border-border bg-background px-3 py-2 text-xs shadow-md"
          style={
            tooltipLeft > 55
              ? { right: `${100 - tooltipLeft + 2}%` }
              : { left: `${tooltipLeft + 2}%` }
          }
        >
          <p className="mb-1 text-muted">{formatDayLabel(activePoint.date)}</p>
          {activePoint.scores ? (
            <>
              <ul className="flex flex-col gap-1">
                {keys.map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-0.5 w-3 rounded-full"
                      style={{ background: SERIES[k].color }}
                    />
                    <span className="font-bold tabular-nums">{activePoint.scores?.[k]}</span>
                    <span className="text-muted">{SERIES[k].label}</span>
                  </li>
                ))}
              </ul>
              {activePoint.emotionLabels.length > 0 && (
                <p className="mt-1 text-muted">{activePoint.emotionLabels.join("・")}</p>
              )}
            </>
          ) : (
            <p>日記なし</p>
          )}
        </div>
      )}
    </div>
  );
}
