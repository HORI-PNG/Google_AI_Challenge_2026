import type { ConcernLevel } from "@/lib/diaryAnalysis";

// 落ち込みや自分を傷つける気持ちが書かれていたときの案内（PLAN.md 8章の注意点）
// 窓口の情報は公開前にもう一度確認すること
const CONTACTS = [
  {
    name: "24時間子供SOSダイヤル（文部科学省）",
    detail: "0120-0-78310（なやみ言おう）／24時間・通話無料",
    href: "tel:0120078310",
  },
  {
    name: "よりそいホットライン",
    detail: "0120-279-338／24時間・通話無料",
    href: "tel:0120279338",
  },
  {
    name: "まもろうよ こころ（厚生労働省）",
    detail: "電話やSNSで相談できる窓口の一覧",
    href: "https://www.mhlw.go.jp/mamorouyokokoro/",
  },
];

export function ConcernNotice({ level }: { level: ConcernLevel }) {
  if (level === "none") {
    return null;
  }

  if (level === "watch") {
    return (
      <section className="rounded-2xl bg-card p-5 text-sm leading-relaxed shadow-sm">
        <p>
          つらい気持ちが続くときは、ひとりで抱えこまずに、家族や先生、友だちなど話しやすい人に話してみてね。
        </p>
        <p className="mt-2 text-muted">
          話しにくいときは、
          <a
            href={CONTACTS[2].href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {CONTACTS[2].name}
          </a>
          で相談先を探せます。
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="相談できる窓口"
      className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm"
    >
      <p className="text-base leading-relaxed">
        書いてくれてありがとう。今の気持ちを、信頼できる人や相談窓口に話してみてほしいな。
      </p>
      <ul className="flex flex-col gap-3">
        {CONTACTS.map((c) => (
          <li key={c.name}>
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="flex flex-col rounded-xl border border-black/10 px-4 py-3"
            >
              <span className="text-sm font-bold">{c.name}</span>
              <span className="text-sm text-muted">{c.detail}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
