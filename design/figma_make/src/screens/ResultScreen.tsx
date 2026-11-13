import { useState } from "react";
import { scores } from "../data";
import { Button, Card, Mascot, ScoreBar, SpeechBubble } from "../components/Ui";

type ResultMode = "success" | "failed" | "support";

export function ResultScreen({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const [mode, setMode] = useState<ResultMode>("success");
  return (
    <main className="min-h-dvh px-4 pb-8 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--muted)]">11月14日（土）</p>
          <h1 className="font-[var(--font-heading)] text-2xl font-bold">分析の結果</h1>
        </div>
        <div className="rounded-full bg-[var(--soft-accent)] px-3 py-2 text-xs font-bold text-[var(--accent-strong)]">
          保存済み
        </div>
      </div>
      <div
        className="mb-5 flex gap-1 rounded-[var(--radius-control)] bg-[var(--subtle)] p-1"
        aria-label="結果表示のデモ切り替え"
      >
        {(
          [
            ["success", "通常"],
            ["failed", "分析失敗"],
            ["support", "サポート"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`min-h-10 flex-1 rounded-[calc(var(--radius-control)-4px)] text-xs font-bold ${mode === id ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "success" && <SuccessResult onHome={onHome} />}
      {mode === "failed" && <FailedResult onHome={onHome} onRetry={onRetry} />}
      {mode === "support" && <SupportResult onHome={onHome} />}
    </main>
  );
}

function SuccessResult({ onHome }: { onHome: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[76px_1fr] items-end gap-2">
        <Mascot mood="cheer" size={82} />
        <SpeechBubble>
          疲れてるのに頑張ったね！ 明日は朝のうちに少しだけ復習しよう。ピッ！
        </SpeechBubble>
      </div>
      <Card>
        <p className="text-sm font-bold text-[var(--accent-strong)]">TODAY'S FEELINGS</p>
        <h2 className="mt-1 font-[var(--font-heading)] text-xl font-bold">今日の気持ち</h2>
        <div className="mt-6 space-y-5">
          {scores.map((score) => (
            <ScoreBar
              key={score.key}
              label={score.label}
              value={score.value}
              note={"note" in score ? score.note : undefined}
              color={`--series-${score.key}`}
            />
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          {["やる気", "少し疲れ"].map((label) => (
            <span
              key={label}
              className="rounded-full bg-[var(--soft-accent)] px-4 py-2 text-sm font-bold text-[var(--accent-strong)]"
            >
              {label}
            </span>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-[var(--font-heading)] text-lg font-bold">こんな一日だったみたい</h2>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          部活で疲れているけれど、テストが近くてやる気は高まっています。できたことを、ちゃんと見つけられた日です。
        </p>
      </Card>
      <Card className="bg-[var(--learning)]">
        <p className="text-sm font-bold text-[var(--accent-strong)]">今日学んだこと</p>
        <p className="mt-2 text-lg font-bold">二次関数：平方完成で頂点が分かる</p>
      </Card>
      <Button onClick={onHome} className="w-full">
        ホームへ
      </Button>
    </div>
  );
}

function FailedResult({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  return (
    <div className="pt-8 text-center">
      <Mascot mood="worried" size={146} className="mx-auto" />
      <h2 className="mt-4 font-[var(--font-heading)] text-2xl font-bold">日記は保存できたよ</h2>
      <p className="mx-auto mt-4 max-w-sm leading-relaxed text-[var(--muted)]">
        Gemini が混み合っていて、分析できませんでした。少し時間をおいて、もう一度分析できます。
      </p>
      <Button onClick={onRetry} className="mt-9 w-full">
        もう一度分析する
      </Button>
      <Button onClick={onHome} variant="ghost" className="mt-2 w-full">
        あとで分析する
      </Button>
    </div>
  );
}

function SupportResult({ onHome }: { onHome: () => void }) {
  const resources = [
    ["24時間子供SOSダイヤル", "0120-0-78310", "24時間・通話無料"],
    ["よりそいホットライン", "0120-279-338", "つらい気持ちを話せます"],
    ["まもろうよ こころ", "厚生労働省", "自分に合う相談先を探せます"],
  ];
  return (
    <div>
      <div className="grid grid-cols-[82px_1fr] items-end gap-2">
        <Mascot mood="worried" size={88} />
        <SpeechBubble>書いてくれてありがとう。ひとりで抱えなくていいんだよ。</SpeechBubble>
      </div>
      <Card className="mt-6 bg-[var(--support)]">
        <h2 className="font-[var(--font-heading)] text-xl font-bold leading-relaxed">
          今の気持ちを、信頼できる人や相談窓口に話してみてほしいな
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          話せそうなところを選んでね。あなたのペースで大丈夫です。
        </p>
      </Card>
      <div className="mt-4 space-y-3">
        {resources.map(([name, value, detail]) => (
          <a
            key={name}
            href={value.startsWith("0") ? `tel:${value.replaceAll("-", "")}` : "#"}
            className="block min-h-24 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--card-shadow)]"
          >
            <strong className="block">{name}</strong>
            <span className="mt-1 block text-lg font-bold text-[var(--accent-strong)]">
              {value}
            </span>
            <span className="mt-1 block text-xs text-[var(--muted)]">{detail}</span>
          </a>
        ))}
      </div>
      <Button onClick={onHome} variant="secondary" className="mt-6 w-full">
        ホームへ
      </Button>
    </div>
  );
}
