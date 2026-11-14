"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, SpeechBubble } from "@/components/ui/Ui";
import { Mascot } from "@/components/ui/Mascot";
import type { HomeViewProps, LatestDiaryState } from "@/components/home/homeTypes";
import type { GreetingState } from "@/components/useGreeting";
import { mascotMoodFromScores } from "@/lib/mascotMood";

// ホームの3つの系統で共有する部品

export const SCORE_LABELS = [
  ["mood", "気分"],
  ["energy", "元気"],
  ["focus", "集中"],
  ["stress", "ストレス"],
] as const;

export function HomeHeader({
  props,
  compact = false,
}: {
  props: HomeViewProps;
  compact?: boolean;
}) {
  return (
    <header className="home-header sticky top-0 z-30 flex items-center justify-between border-b border-border bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 py-3 backdrop-blur-[var(--card-blur)]">
      <div>
        {compact && <p className="text-xs font-bold tracking-widest text-muted">RE:NOTE</p>}
        <h1 className={`font-display font-bold ${compact ? "text-base" : "text-xl"}`}>{props.dateLabel}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/diary/new"
          className="header-diary-button inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-bold text-accent-foreground shadow-[var(--button-shadow)] transition active:scale-[.98]"
        >
          <span className="mr-1" aria-hidden="true">
            ✎
          </span>
          日記を書く
        </Link>
        <AccountMenu props={props} />
      </div>
    </header>
  );
}

function AccountMenu({ props }: { props: HomeViewProps }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="account-trigger grid size-11 place-items-center rounded-full border-2 border-card bg-soft-accent text-accent-strong shadow-[0_0_0_1px_var(--border)] transition active:scale-95"
        aria-label="ログイン中のユーザー情報"
        aria-expanded={open}
        aria-controls="account-panel"
      >
        <UserIcon />
      </button>
      {open && (
        <div
          id="account-panel"
          className="account-panel absolute right-0 top-[calc(100%+12px)] z-40 w-[min(310px,calc(100vw-32px))] rounded-[var(--radius)] border border-border p-4 shadow-[0_18px_55px_color-mix(in_srgb,var(--foreground)_16%,transparent)]"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-soft-accent text-accent-strong">
              <UserIcon />
            </div>
            <div className="min-w-0">
              <p className="font-bold">{props.nickname} さん</p>
              {props.email && <p className="truncate text-xs text-muted">{props.email}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-[80px_1fr] gap-y-2 py-4 text-sm">
            <dt className="text-muted">名前</dt>
            <dd className="font-bold">{props.name}</dd>
            <dt className="text-muted">学年</dt>
            <dd className="font-bold">{props.grade}</dd>
            <dt className="text-muted">ログイン</dt>
            <dd className="font-bold">Google</dd>
          </dl>
          <Link
            href="/settings"
            className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] bg-subtle px-4 text-sm font-bold"
          >
            テーマ・アカウント設定
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

/** 話しかけを読み込んでいる間に出す、仮の話しかけ */
export function placeholderGreeting(nickname: string) {
  return `${nickname}さん、今日はどんな一日だった？`;
}

/** ハカドリの話しかけ（Gemini が最近の日記をふまえて話しかける） */
export function Greeting({ nickname, greeting }: { nickname: string; greeting: GreetingState }) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-end gap-2">
      <Mascot mood={greeting.mood} size={78} />
      <SpeechBubble>
        <span aria-live="polite">{greeting.text ?? placeholderGreeting(nickname)}</span>
      </SpeechBubble>
    </div>
  );
}

/**
 * 今日のはかどり予報（段階8・9 で中身を出す）。
 * この段階では、予報の項目の並びだけを見せて「日記がたまると出る」と伝える
 */
export const FORECAST_ITEMS = ["おすすめ時間", "おすすめ場所", "ラッキーアイテム", "向いていること"] as const;
export const FORECAST_PENDING_MESSAGE = "日記がたまると、ここに今日のはかどり予報が出ます。";
/** 予報がまだないときの数字の代わり（「—」は丸ゴシックで長い棒に見え、メーターと間違えやすい） */
export const FORECAST_PLACEHOLDER = "--";

export function ForecastCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start justify-between border-b border-border p-5">
        <div>
          <p className="text-sm font-bold text-accent-strong">TODAY&apos;S FORECAST</p>
          <h2 className="mt-1 font-display text-xl font-bold">今日のはかどり予報</h2>
        </div>
        <div className="text-right text-3xl" aria-hidden="true">
          🌤️
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-3">
          <strong className="font-num text-6xl leading-none text-muted" aria-label="まだ予報はありません">
            {FORECAST_PLACEHOLDER}
            <span className="text-2xl">%</span>
          </strong>
          <p className="pb-1 text-sm leading-relaxed text-muted">準備中</p>
        </div>
        <div className="my-5 h-px bg-border" />
        <div className="grid grid-cols-2 gap-3">
          {FORECAST_ITEMS.map((label) => (
            <div key={label}>
              <p className="text-xs font-bold text-muted">{label}</p>
              <p className="mt-1 text-sm font-bold leading-snug text-muted">—</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-[var(--radius-control)] bg-soft-accent p-4 text-sm font-bold leading-relaxed">
          {FORECAST_PENDING_MESSAGE}
        </p>
      </div>
    </Card>
  );
}

/** 最新の日記のふりかえり（分析ができていなければ、ここからやり直せる） */
export function ReflectionContent({
  latest,
  onRetry,
  retrying,
  retryError,
}: Pick<HomeViewProps, "latest" | "onRetry" | "retrying" | "retryError">) {
  if (latest.status === "loading") {
    return <p className="text-sm text-muted">読み込み中…</p>;
  }
  if (latest.status === "error") {
    return (
      <p role="alert" className="text-sm text-accent-strong">
        日記を読み込めませんでした。
      </p>
    );
  }
  if (latest.status === "empty") {
    return (
      <div className="flex items-center gap-3">
        <Mascot mood="cheer" size={66} />
        <p className="font-bold leading-relaxed">
          はじめての日記を書いてみよう。気持ちをそのまま書くだけで大丈夫だよ。
        </p>
      </div>
    );
  }

  const { diary } = latest;
  if (diary.analysisStatus === "done" && diary.analysis) {
    const { analysis } = diary;
    // つらい気持ちが書かれていた日は、点数を並べずに、ひとことだけを出す
    const isUrgent = analysis.concern_level === "urgent";
    return (
      <>
        <div className="flex items-center gap-3">
          <Mascot mood={mascotMoodFromScores(analysis)} size={66} />
          <p className="font-bold leading-relaxed">{analysis.character_reply}</p>
        </div>
        {!isUrgent && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {SCORE_LABELS.map(([key, label]) => (
              <div key={key} className="rounded-[var(--radius-small)] bg-subtle p-2 text-center">
                <strong className="block font-num text-lg">{analysis.scores[key]}</strong>
                <span className="text-xs text-muted">{label}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Mascot mood="worried" size={66} />
        <p className="font-bold leading-relaxed">最新の日記は、まだ分析できていないよ。</p>
      </div>
      {retryError && (
        <p role="alert" className="text-sm text-accent-strong">
          {retryError}
        </p>
      )}
      <Button variant="secondary" onClick={onRetry} disabled={retrying} className="w-full">
        {retrying ? "分析しています…" : "今から分析する"}
      </Button>
    </div>
  );
}

export function latestTitle(latest: LatestDiaryState) {
  return latest.status === "loaded" ? "最新の日記をふりかえり" : "日記";
}

export function MiniChart() {
  return (
    <svg width="82" height="44" viewBox="0 0 82 44" aria-hidden="true">
      <path
        d="M2 34 15 28 28 31 41 17 55 22 68 8 80 12"
        fill="none"
        style={{ stroke: "var(--series-mood)" }}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M2 39 15 35 28 26 41 30 55 18 68 24 80 20"
        fill="none"
        style={{ stroke: "var(--series-focus)" }}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6" />
    </svg>
  );
}
