import { useState } from "react";
import { chartData } from "../data";
import { BackHeader, Card } from "../components/Ui";

type SeriesKey = "mood" | "energy" | "focus" | "stress";
const series: { key: SeriesKey; label: string; average: number }[] = [
  { key: "mood", label: "気分", average: 62 },
  { key: "energy", label: "元気", average: 58 },
  { key: "focus", label: "集中", average: 68 },
  { key: "stress", label: "ストレス", average: 44 },
];

export function ChartScreen({ onBack }: { onBack: () => void }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [visible, setVisible] = useState<SeriesKey[]>(series.map((item) => item.key));
  const [showTable, setShowTable] = useState(false);
  const [activeDay, setActiveDay] = useState(5);

  const toggle = (key: SeriesKey) =>
    setVisible((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="気分のグラフ" onBack={onBack} />
      <div className="space-y-5 p-4">
        <div className="grid grid-cols-2 rounded-[var(--radius-control)] bg-[var(--subtle)] p-1">
          {[
            ["week", "1週間"],
            ["month", "1か月"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriod(id as "week" | "month")}
              className={`min-h-11 rounded-[calc(var(--radius-control)-4px)] font-bold ${period === id ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Card className="p-4">
          <div className="mb-5 flex flex-wrap gap-2">
            {series.map((item) => {
              const enabled = visible.includes(item.key);
              return (
                <button
                  key={item.key}
                  aria-pressed={enabled}
                  onClick={() => toggle(item.key)}
                  className={`flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs font-bold ${enabled ? "bg-[var(--subtle)]" : "opacity-40"}`}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: `var(--series-${item.key})` }}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
          <LineChart visible={visible} activeDay={activeDay} onDay={setActiveDay} />
          <p className="mt-3 text-center text-xs text-[var(--muted)]">
            点をタップすると、その日の記録が見られます
          </p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          {series.map((item) => (
            <Card key={item.key} className="p-4">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: `var(--series-${item.key})` }}
                />
                <span className="text-sm font-bold text-[var(--muted)]">{item.label}の平均</span>
              </div>
              <strong className="mt-2 block text-3xl">
                {item.average}
                <span className="text-sm">点</span>
              </strong>
              {item.key === "stress" && (
                <span className="text-xs text-[var(--muted)]">低いほど良い</span>
              )}
            </Card>
          ))}
        </div>
        <button
          onClick={() => setShowTable((value) => !value)}
          className="min-h-12 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] font-bold"
        >
          {showTable ? "表を閉じる" : "表で見る"}{" "}
          <span aria-hidden="true">{showTable ? "↑" : "↓"}</span>
        </button>
        {showTable && <ScoreTable />}
      </div>
    </main>
  );
}

function LineChart({
  visible,
  activeDay,
  onDay,
}: {
  visible: SeriesKey[];
  activeDay: number;
  onDay: (day: number) => void;
}) {
  const width = 330;
  const height = 230;
  const left = 28;
  const top = 15;
  const plotW = 290;
  const plotH = 170;
  const point = (index: number, value: number) =>
    `${left + (index * plotW) / 6},${top + plotH - (value / 100) * plotH}`;
  return (
    <svg
      className="w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="1週間の気分、元気、集中、ストレスの折れ線グラフ"
    >
      {[0, 25, 50, 75, 100].map((value) => {
        const y = top + plotH - (value / 100) * plotH;
        return (
          <g key={value}>
            <line x1={left} x2={left + plotW} y1={y} y2={y} stroke="var(--chart-grid)" />
            <text x="0" y={y + 4} fill="var(--chart-axis)" fontSize="10">
              {value}
            </text>
          </g>
        );
      })}
      {series.map(({ key }) => {
        if (!visible.includes(key)) return null;
        const segments: string[][] = [];
        let segment: string[] = [];
        chartData.forEach((item, index) => {
          const value = item[key];
          if (value === null) {
            if (segment.length) segments.push(segment);
            segment = [];
          } else segment.push(point(index, value));
        });
        if (segment.length) segments.push(segment);
        return (
          <g key={key}>
            {segments.map((points, index) => (
              <polyline
                key={index}
                points={points.join(" ")}
                fill="none"
                stroke={`var(--series-${key})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {chartData.map(
              (item, index) =>
                item[key] !== null && (
                  <circle
                    key={index}
                    cx={left + (index * plotW) / 6}
                    cy={top + plotH - ((item[key] as number) / 100) * plotH}
                    r="4"
                    fill={`var(--series-${key})`}
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                ),
            )}
          </g>
        );
      })}
      {chartData.map((item, index) => {
        const x = left + (index * plotW) / 6;
        return (
          <g key={item.day} onClick={() => onDay(index)} className="cursor-pointer">
            <rect x={x - 20} y={0} width="40" height="220" fill="transparent" />
            <text
              x={x}
              y={213}
              textAnchor="middle"
              fill={activeDay === index ? "var(--foreground)" : "var(--chart-axis)"}
              fontSize="11"
              fontWeight={activeDay === index ? 700 : 400}
            >
              {item.day}
            </text>
          </g>
        );
      })}
      {chartData[activeDay].mood !== null && (
        <g>
          <line
            x1={left + (activeDay * plotW) / 6}
            x2={left + (activeDay * plotW) / 6}
            y1={top}
            y2={top + plotH}
            stroke="var(--chart-axis)"
            strokeDasharray="3 3"
          />
          <rect
            x={Math.min(245, Math.max(32, left + (activeDay * plotW) / 6 - 38))}
            y="3"
            width="76"
            height="26"
            rx="8"
            fill="var(--foreground)"
          />
          <text
            x={Math.min(283, Math.max(70, left + (activeDay * plotW) / 6))}
            y="20"
            textAnchor="middle"
            fill="var(--background)"
            fontSize="10"
          >
            {chartData[activeDay].day}曜日・気分 {chartData[activeDay].mood}
          </text>
        </g>
      )}
    </svg>
  );
}

function ScoreTable() {
  return (
    <Card className="overflow-x-auto p-3">
      <table className="w-full text-center text-sm">
        <thead>
          <tr className="text-[var(--muted)]">
            <th className="p-2">日</th>
            {series.map((item) => (
              <th className="p-2" key={item.key}>
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row) => (
            <tr key={row.day} className="border-t border-[var(--border)]">
              <th className="p-3">{row.day}</th>
              {series.map((item) => (
                <td className="p-3" key={item.key}>
                  {row[item.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
