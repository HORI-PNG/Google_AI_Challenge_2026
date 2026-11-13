import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { MascotMood } from "../types";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--button-shadow)]",
    secondary: "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]",
    ghost: "bg-transparent text-[var(--foreground)]",
  };
  return (
    <button
      className={`min-h-12 rounded-[var(--radius-control)] px-5 font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className="grid size-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition active:scale-95"
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--card-shadow)] backdrop-blur-[var(--card-blur)] ${className}`}
    >
      {children}
    </section>
  );
}

export function BackHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 backdrop-blur-[var(--card-blur)]">
      <button
        onClick={onBack}
        className="flex min-h-11 min-w-11 items-center gap-1 font-bold"
        aria-label="戻る"
      >
        <span aria-hidden="true">←</span>
      </button>
      <h1 className="font-[var(--font-heading)] text-lg font-bold">{title}</h1>
      <div className="flex min-w-11 justify-end">{action}</div>
    </header>
  );
}

export function Mascot({
  mood = "normal",
  size = 96,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
}) {
  const eyes =
    mood === "happy" || mood === "cheer" ? (
      <>
        <path d="M42 54q5-7 10 0" />
        <path d="M70 54q5-7 10 0" />
      </>
    ) : mood === "sleepy" ? (
      <>
        <path d="M42 54h10" />
        <path d="M70 54h10" />
      </>
    ) : mood === "worried" ? (
      <>
        <path d="M41 51q5-3 10 1" />
        <path d="M71 52q5-4 10-1" />
      </>
    ) : (
      <>
        <circle cx="47" cy="53" r="2.6" fill="var(--bird-ink)" stroke="none" />
        <circle cx="75" cy="53" r="2.6" fill="var(--bird-ink)" stroke="none" />
      </>
    );
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`ハカドリ・${mood}`}
    >
      <path
        d="M24 68c-1-27 16-45 38-45 22 0 37 17 37 40 0 24-15 39-39 39-21 0-35-12-36-34Z"
        fill="var(--bird)"
        stroke="var(--bird-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M31 43 19 34l4 22"
        fill="var(--bird-wing)"
        stroke="var(--bird-ink)"
        strokeWidth="3"
      />
      <path
        d="M91 42 103 31l-2 24"
        fill="var(--bird-wing)"
        stroke="var(--bird-ink)"
        strokeWidth="3"
      />
      <path d="M58 63h9l-5 5Z" fill="var(--bird-beak)" stroke="var(--bird-ink)" strokeWidth="2" />
      <g fill="none" stroke="var(--bird-ink)" strokeWidth="3" strokeLinecap="round">
        {eyes}
      </g>
      {mood === "cheer" && (
        <>
          <path
            d="m22 70-10-7M99 68l10-9"
            stroke="var(--bird-ink)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M52 79q10 8 20 0"
            fill="none"
            stroke="var(--bird-ink)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {mood === "worried" && (
        <path
          d="M56 80q6-5 12 0"
          fill="none"
          stroke="var(--bird-ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {mood === "sleepy" && (
        <text x="90" y="25" fill="var(--bird-ink)" fontSize="14" fontWeight="700">
          z
        </text>
      )}
      <path d="M46 100v7m29-8v8" stroke="var(--bird-ink)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SpeechBubble({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-5 py-4 font-bold leading-relaxed shadow-[var(--card-shadow)] before:absolute before:-bottom-2 before:left-7 before:size-4 before:rotate-45 before:border-b before:border-r before:border-[var(--border)] before:bg-[var(--card)] ${className}`}
    >
      {children}
    </div>
  );
}

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
          {note && <span className="ml-2 text-xs text-[var(--muted)]">{note}</span>}
        </div>
        <strong className="text-xl">
          {value}
          <span className="text-sm">点</span>
        </strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--track)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: `var(${color})` }}
        />
      </div>
    </div>
  );
}
