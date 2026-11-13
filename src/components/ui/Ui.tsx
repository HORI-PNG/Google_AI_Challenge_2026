import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

// 共通の部品（Figma Make のデザイン design/figma_make/src/components/Ui.tsx から移した）。
// 色・角丸・影は、すべてテーマの CSS 変数（src/app/globals.css）を使う

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground shadow-[var(--button-shadow)]",
  secondary: "border border-border bg-card text-foreground",
  ghost: "bg-transparent text-foreground",
};

export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] px-5 font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 ${BUTTON_VARIANTS[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

/** ボタンの見た目のリンク（画面の移動） */
export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`rounded-[var(--radius)] border border-border bg-card p-5 shadow-[var(--card-shadow)] backdrop-blur-[var(--card-blur)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/** 上の見出しのバー（戻るリンク・題名・右側の操作） */
export function BackHeader({
  title,
  backHref = "/",
  action,
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 backdrop-blur-[var(--card-blur)]">
      <Link href={backHref} className="flex min-h-11 min-w-11 items-center gap-1 font-bold" aria-label="戻る">
        <span aria-hidden="true">←</span>
      </Link>
      <h1 className="font-display text-lg font-bold">{title}</h1>
      <div className="flex min-w-11 justify-end">{action}</div>
    </header>
  );
}

export function SpeechBubble({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[var(--radius)] border border-border bg-card px-5 py-4 font-bold leading-relaxed shadow-[var(--card-shadow)] before:absolute before:-bottom-2 before:left-7 before:size-4 before:rotate-45 before:border-b before:border-r before:border-border before:bg-card ${className}`}
    >
      {children}
    </div>
  );
}

/** 点数のバー（色は --series-* の名前で渡す） */
export function ScoreBar({
  label,
  value,
  color,
  note,
}: {
  label: string;
  value: number;
  color: string;
  note?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <span className="font-bold">{label}</span>
          {note && <span className="ml-2 text-xs text-muted">{note}</span>}
        </div>
        <strong className="font-num text-xl">
          {value}
          <span className="text-sm">点</span>
        </strong>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: `var(${color})` }} />
      </div>
    </div>
  );
}

/** 読み込み中の表示 */
export function Loading({ label = "読み込み中…" }: { label?: string }) {
  return (
    <p className="p-6 text-sm text-muted" role="status">
      {label}
    </p>
  );
}
