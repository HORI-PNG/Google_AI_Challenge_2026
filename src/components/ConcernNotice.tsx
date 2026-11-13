import { Card } from "@/components/ui/Ui";
import type { ConcernLevel } from "@/lib/diaryAnalysis";

// 落ち込みや自分を傷つける気持ちが書かれていたときの案内（PLAN.md 8章の注意点）。
// 見た目は Figma Make の SupportResult から移した。警告のような赤は使わない。
// 窓口の情報は公開前にもう一度確認すること
const CONTACTS = [
  {
    name: "24時間子供SOSダイヤル（文部科学省）",
    value: "0120-0-78310",
    detail: "24時間・通話無料",
    href: "tel:0120078310",
  },
  {
    name: "よりそいホットライン",
    value: "0120-279-338",
    detail: "24時間・通話無料。つらい気持ちを話せます",
    href: "tel:0120279338",
  },
  {
    name: "まもろうよ こころ",
    value: "厚生労働省",
    detail: "電話や SNS で相談できる窓口を探せます",
    href: "https://www.mhlw.go.jp/mamorouyokokoro/",
  },
];

export function ConcernNotice({ level }: { level: ConcernLevel }) {
  if (level === "none") {
    return null;
  }

  if (level === "watch") {
    return (
      <Card className="bg-support text-sm leading-relaxed">
        <p>
          つらい気持ちが続くときは、ひとりで抱えこまずに、家族や先生、友だちなど話しやすい人に話してみてね。
        </p>
        <p className="mt-2 text-muted">
          話しにくいときは、
          <a href={CONTACTS[2].href} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
            {CONTACTS[2].name}（{CONTACTS[2].value}）
          </a>
          で相談先を探せます。
        </p>
      </Card>
    );
  }

  return (
    <section aria-label="相談できる窓口">
      <Card className="bg-support">
        <h2 className="font-display text-xl font-bold leading-relaxed">
          今の気持ちを、信頼できる人や相談窓口に話してみてほしいな
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">話せそうなところを選んでね。あなたのペースで大丈夫です。</p>
      </Card>
      <ul className="mt-4 space-y-3">
        {CONTACTS.map((c) => {
          const external = c.href.startsWith("http");
          return (
            <li key={c.name}>
              <a
                href={c.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="block min-h-24 rounded-[var(--radius)] border border-border bg-card p-4 shadow-[var(--card-shadow)]"
              >
                <strong className="block">{c.name}</strong>
                <span className="mt-1 block font-num text-lg font-bold text-accent-strong">{c.value}</span>
                <span className="mt-1 block text-xs text-muted">{c.detail}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
