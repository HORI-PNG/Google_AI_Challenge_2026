import { ConcernNotice } from "@/components/ConcernNotice";
import { Icon } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import { ButtonLink, Card, ScoreBar, SpeechBubble } from "@/components/ui/Ui";
import type { DiaryAnalysis, Scores } from "@/lib/diaryAnalysis";
import { mascotMoodFromScores } from "@/lib/mascotMood";

// 分析の結果。見た目は Figma Make の ResultScreen（SuccessResult／SupportResult）から移した

const SCORE_ITEMS: { key: keyof Scores; label: string; note?: string }[] = [
  { key: "mood", label: "気分" },
  { key: "energy", label: "元気" },
  { key: "focus", label: "集中しやすさ" },
  { key: "stress", label: "ストレス", note: "低いほど良い" },
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function AnalysisResult({
  analysis,
  nickname,
  writtenAt,
}: {
  analysis: DiaryAnalysis;
  nickname: string;
  writtenAt: Date;
}) {
  const isUrgent = analysis.concern_level === "urgent";
  const dateLabel = `${writtenAt.getMonth() + 1}月${writtenAt.getDate()}日（${WEEKDAYS[writtenAt.getDay()]}）`;

  return (
    <main className="min-h-dvh px-4 pb-8 pt-5">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-sm font-bold text-muted">{dateLabel}</p>
          <h1 className="font-display text-2xl">{isUrgent ? "日記を受け取りました" : `${nickname}さんの今日`}</h1>
        </div>
        <p className="flex items-center gap-1 pb-1 text-xs font-bold text-muted">
          <Icon name="check" size={15} />
          保存しました
        </p>
      </div>

      <div className="grid grid-cols-[72px_1fr] items-end gap-2">
        <Mascot mood={mascotMoodFromScores(analysis)} size={78} />
        <SpeechBubble>{analysis.character_reply}</SpeechBubble>
      </div>

      {/* 自分を傷つける気持ちが書かれていたときは、点数を出さずに窓口を案内する */}
      {isUrgent ? (
        <div className="mt-6">
          <ConcernNotice level="urgent" />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <Card>
            <h2 className="font-display text-xl">今日の気持ち</h2>
            <div className="mt-5 space-y-5">
              {SCORE_ITEMS.map((item) => (
                <ScoreBar
                  key={item.key}
                  label={item.label}
                  value={analysis.scores[item.key]}
                  note={item.note}
                  color={`--series-${item.key}`}
                />
              ))}
            </div>
            {analysis.emotion_labels.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="気持ちのラベル">
                {analysis.emotion_labels.map((label) => (
                  <li key={label} className="rounded-full bg-soft-accent px-4 py-2 text-sm font-bold text-accent-strong">
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section className="ruled pt-5">
            <h2 className="font-display text-lg">点数の理由</h2>
            <p className="mt-2 leading-relaxed text-muted">{analysis.reason}</p>
            {analysis.confidence === "low" && (
              <p className="mt-2 text-xs text-muted">手がかりが少なかったので、点数はおおよその目安です。</p>
            )}
          </section>

          {analysis.learnings.length > 0 && (
            <Card className="bg-learning">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-accent-strong">
                <Icon name="review" size={17} />
                今日学んだこと（復習に出てきます）
              </h2>
              <ul className="mt-2 space-y-2">
                {analysis.learnings.map((l) => (
                  <li key={`${l.topic}-${l.point}`} className="text-lg font-bold leading-relaxed">
                    {l.topic}：{l.point}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <ConcernNotice level={analysis.concern_level} />
        </div>
      )}

      <ButtonLink href="/" variant={isUrgent ? "secondary" : "primary"} className="mt-6 w-full">
        ホームへ
      </ButtonLink>
    </main>
  );
}
