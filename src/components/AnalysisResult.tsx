import { ConcernNotice } from "@/components/ConcernNotice";
import type { DiaryAnalysis, Scores } from "@/lib/diaryAnalysis";

// 分析の結果（最小限の表示。見た目は段階6・7 で作り直す）

const SCORE_ITEMS: { key: keyof Scores; label: string; note?: string }[] = [
  { key: "mood", label: "気分" },
  { key: "energy", label: "元気" },
  { key: "focus", label: "集中しやすさ" },
  { key: "stress", label: "ストレス", note: "低いほど良い" },
];

export function AnalysisResult({
  analysis,
  nickname,
}: {
  analysis: DiaryAnalysis;
  nickname: string;
}) {
  const isUrgent = analysis.concern_level === "urgent";

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="ハカドリのひとこと" className="flex items-start gap-3">
        {/* キャラクターの画像は段階7 で差し替える */}
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card text-2xl shadow-sm"
        >
          🐦
        </div>
        <p className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-base leading-relaxed shadow-sm">
          <span className="block text-xs text-muted">ハカドリ → {nickname}</span>
          {analysis.character_reply}
        </p>
      </section>

      {/* 自分を傷つける気持ちが書かれていたときは、点数を出さずに窓口を案内する */}
      {isUrgent ? (
        <ConcernNotice level="urgent" />
      ) : (
        <>
          <section
            aria-label="感情の点数"
            className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm"
          >
            <h2 className="text-sm font-medium text-muted">今日の気持ち</h2>
            <ul className="flex flex-col gap-3">
              {SCORE_ITEMS.map((item) => {
                const value = analysis.scores[item.key];
                return (
                  <li key={item.key} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span>
                        {item.label}
                        {item.note && (
                          <span className="ml-1 text-xs text-muted">（{item.note}）</span>
                        )}
                      </span>
                      <span className="font-bold tabular-nums">{value}点</span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-black/5"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={value}
                      aria-label={item.label}
                    >
                      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {analysis.emotion_labels.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="気持ちのラベル">
                {analysis.emotion_labels.map((label) => (
                  <li key={label} className="rounded-full bg-background px-3 py-1 text-xs">
                    {label}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm leading-relaxed text-muted">{analysis.reason}</p>
            {analysis.confidence === "low" && (
              <p className="text-xs text-muted">
                手がかりが少なかったので、点数はおおよその目安です。
              </p>
            )}
          </section>

          {analysis.learnings.length > 0 && (
            <section
              aria-label="今日学んだこと"
              className="flex flex-col gap-2 rounded-2xl bg-card p-5 shadow-sm"
            >
              <h2 className="text-sm font-medium text-muted">今日学んだこと</h2>
              <ul className="flex flex-col gap-2">
                {analysis.learnings.map((l) => (
                  <li key={`${l.topic}-${l.point}`} className="text-sm leading-relaxed">
                    <span className="font-bold">{l.topic}</span>：{l.point}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ConcernNotice level={analysis.concern_level} />
        </>
      )}
    </div>
  );
}
