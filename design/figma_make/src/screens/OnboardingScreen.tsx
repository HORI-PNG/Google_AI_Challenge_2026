import { useState } from "react";
import { Button, Mascot } from "../components/Ui";

const grades = [
  "中学1年",
  "中学2年",
  "中学3年",
  "高校1年",
  "高校2年",
  "高校3年",
  "大学・短大",
  "大学院（修士）",
  "大学院（博士）",
  "その他",
];

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  const [nickname, setNickname] = useState("");
  return (
    <main className="min-h-dvh px-5 pb-8 pt-8">
      <div className="flex items-center gap-3">
        <Mascot mood="happy" size={78} />
        <div>
          <p className="text-sm font-bold text-[var(--accent-strong)]">WELCOME TO RE:NOTE</p>
          <h1 className="font-[var(--font-heading)] text-3xl font-bold">はじめまして！</h1>
        </div>
      </div>
      <p className="mt-5 leading-relaxed text-[var(--muted)]">
        日記を書く前に、あなたのことを
        <br />
        少しだけ教えてください。
      </p>
      <form
        className="mt-7 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onStart();
        }}
      >
        <label className="block font-bold">
          名前
          <input className="field mt-2" placeholder="例：山田 花" />
        </label>
        <label className="block font-bold">
          ニックネーム
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
            ハカドリがこの名前で呼びます
          </span>
          <input
            className="field mt-2"
            placeholder="例：ほり"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>
        <label className="block font-bold">
          学年
          <select className="field mt-2" defaultValue="">
            <option value="" disabled>
              選んでください
            </option>
            {grades.map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </label>
        <div className="rounded-[var(--radius-control)] bg-[var(--soft-accent)] p-4 text-sm leading-relaxed text-[var(--accent-strong)]">
          名前とニックネームは Gemini には送りません。安心して使ってね。
        </div>
        <Button type="submit" className="mt-3 w-full">
          {nickname ? `${nickname}さん、はじめよう` : "はじめる"}
        </Button>
      </form>
    </main>
  );
}
