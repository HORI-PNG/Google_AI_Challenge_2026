"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, SpeechBubble } from "@/components/ui/Ui";
import { Icon, WeatherIcon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import type { HomeViewProps, LatestDiaryState } from "@/components/home/homeTypes";
import type { ForecastState } from "@/components/useForecast";
import type { GreetingState } from "@/components/useGreeting";
import { CalendarButton } from "@/components/home/CalendarButton";
import { NearbyPlaces } from "@/components/home/NearbyPlaces";
import type { CalendarEvent } from "@/lib/calendar";
import { FORECAST_DISCLAIMER, PLACE_LABELS, WEATHER_LABELS, type Place, type Weather } from "@/lib/forecast";
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
      <h1 className={`font-display ${compact ? "text-base" : "text-xl"}`}>{props.dateLabel}</h1>
      <div className="flex items-center gap-2">
        <Link
          href="/diary/new"
          className="header-diary-button inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-bold text-accent-foreground shadow-[var(--button-shadow)] transition active:scale-[.98]"
        >
          <Icon name="edit" size={17} />
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
        <Icon name="user" size={22} />
      </button>
      {open && (
        <div
          id="account-panel"
          className="account-panel absolute right-0 top-[calc(100%+12px)] z-40 w-[min(310px,calc(100vw-32px))] rounded-[var(--radius)] border border-border p-4 shadow-[0_18px_55px_color-mix(in_srgb,var(--foreground)_16%,transparent)]"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-soft-accent text-accent-strong">
              <Icon name="user" size={22} />
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
            <Icon name="next" size={16} />
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
    <div className="grid grid-cols-[64px_1fr] items-end gap-2">
      <Mascot mood={greeting.mood} size={68} />
      <SpeechBubble>
        <span aria-live="polite">{greeting.text ?? placeholderGreeting(nickname)}</span>
      </SpeechBubble>
    </div>
  );
}

/** 今日のはかどり予報の項目（3 つの系統で同じ並び） */
export const FORECAST_ITEMS = ["おすすめ時間", "おすすめ場所", "ラッキーアイテム", "向いていること"] as const;
const FORECAST_ITEM_ICONS: Record<(typeof FORECAST_ITEMS)[number], IconName> = {
  おすすめ時間: "clock",
  おすすめ場所: "pin",
  ラッキーアイテム: "charm",
  向いていること: "book",
};
/** 予報がまだないときの数字の代わり（「—」は丸ゴシックで長い棒に見え、メーターと間違えやすい） */
export const FORECAST_PLACEHOLDER = "--";

export type ForecastView = {
  ready: boolean;
  percent: string;
  /** 0〜100（メーターの長さ）。予報がないときは 0 */
  value: number;
  /** 天気（予報がないときは null） */
  weather: Weather | null;
  /** 天気、または「作っています」などの状態 */
  status: string;
  items: { label: (typeof FORECAST_ITEMS)[number]; icon: IconName; value: string; sub: string | null }[];
  /** ハカドリのひとこと、または予報がない理由 */
  message: string;
  rest: string | null;
  evidence: string[];
  /** おすすめ場所（近くの実際の場所を探すのに使う） */
  places: Place[];
  /** おすすめ時間をカレンダーに入れるときの予定 */
  calendar: CalendarEvent | null;
  /** 記録が少ないときの注意 */
  note: string | null;
  onRetry: (() => void) | null;
};

const NOT_READY_MESSAGE: Record<Exclude<ForecastState["status"], "ready" | "error">, [string, string]> = {
  loading: ["予報中…", "Gemini が今日のはかどりを予報しています…"],
  waiting: ["もうすぐ", "昨日のはかどりを答えると、今日の予報が出ます。"],
  noDiary: ["まだなし", "日記を書くと、次の日から予報が出ます。"],
};

/** 予報の状態を、画面に出す文字に直す（3 つの系統で共有する） */
export function forecastView(state: ForecastState): ForecastView {
  if (state.status === "ready") {
    const f = state.saved.forecast;
    return {
      ready: true,
      percent: String(f.percent),
      value: f.percent,
      weather: f.weather,
      status: WEATHER_LABELS[f.weather].label,
      items: [
        { label: "おすすめ時間", icon: "clock", value: f.best_time.range, sub: f.best_time.reason },
        { label: "おすすめ場所", icon: "pin", value: f.places.map((p) => PLACE_LABELS[p]).join("・") || "どこでも", sub: null },
        { label: "ラッキーアイテム", icon: "charm", value: f.lucky_item.name, sub: f.lucky_item.reason },
        { label: "向いていること", icon: "book", value: f.study_style, sub: null },
      ],
      message: f.message,
      rest: f.rest_advice,
      evidence: f.evidence,
      places: f.places,
      calendar: {
        title: `勉強（はかどり予報 ${f.percent}%）`,
        date: state.saved.date,
        range: f.best_time.range,
        location: f.places.map((p) => PLACE_LABELS[p]).join("・") || undefined,
        details: [
          `おすすめの理由：${f.best_time.reason}`,
          `向いていること：${f.study_style}`,
          `ラッキーアイテム：${f.lucky_item.name}`,
          "",
          `Re:Note のはかどり予報から追加しました。${FORECAST_DISCLAIMER}`,
        ].join("\n"),
      },
      note: f.data_sufficiency === "few" ? "記録が少ないので、まだおおまかな予報です。" : null,
      onRetry: null,
    };
  }
  const [status, message] =
    state.status === "error" ? ["作れませんでした", state.message] : NOT_READY_MESSAGE[state.status];
  return {
    ready: false,
    percent: FORECAST_PLACEHOLDER,
    value: 0,
    weather: null,
    status,
    items: FORECAST_ITEMS.map((label) => ({ label, icon: FORECAST_ITEM_ICONS[label], value: "—", sub: null })),
    message,
    rest: null,
    evidence: [],
    places: [],
    calendar: null,
    note: null,
    onRetry: state.status === "error" ? state.onRetry : null,
  };
}

/** はかどり印（予報の % を、手帳に押すはんこの形で出す。ホームでいちばん目立たせる所） */
export function HakadoriStamp({ view, size = 104 }: { view: ForecastView; size?: number }) {
  return (
    <div
      className="hakadori-stamp"
      data-ready={view.ready}
      style={{ width: size, height: size }}
      role="img"
      aria-label={view.ready ? `はかどり度 ${view.percent}%` : "まだ予報はありません"}
    >
      <span className="text-[11px] font-bold tracking-[.2em]">はかどり</span>
      <span className="mt-1 font-num text-[40px] font-bold leading-none tracking-tight">
        {view.percent}
        <span className="text-base">%</span>
      </span>
    </div>
  );
}

/** 予報の根拠と注意書き（「根拠がない」と思われないよう、小さく出す。注意書きは必ず 1 行出す） */
export function ForecastEvidence({ view }: { view: ForecastView }) {
  if (!view.ready) return null;
  return (
    <div className="mt-4 text-xs leading-relaxed text-muted">
      {view.evidence.length > 0 && (
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold">予報の根拠を見る</summary>
          <ul className="mb-2 list-disc pl-5">
            {view.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
      )}
      <p>
        {view.note && `${view.note} `}
        {FORECAST_DISCLAIMER}
      </p>
    </div>
  );
}

export function ForecastRetry({ view }: { view: ForecastView }) {
  if (!view.onRetry) return null;
  return (
    <Button variant="secondary" onClick={view.onRetry} className="mt-3 w-full">
      もう一度予報する
    </Button>
  );
}

/** 予報の 4 つの項目を、手帳の行のように並べる（左に項目名、右に中身） */
export function ForecastRows({ view }: { view: ForecastView }) {
  return (
    <dl className="mt-1">
      {view.items.map((item) => (
        <div key={item.label} className="ruled grid grid-cols-[7.5rem_1fr] gap-2 py-3">
          <dt className="flex items-start gap-1.5 text-xs font-bold text-muted">
            <Icon name={item.icon} size={16} className="mt-px" />
            {item.label}
          </dt>
          <dd>
            <span className={`block text-sm font-bold leading-snug ${view.ready ? "" : "text-muted"}`}>{item.value}</span>
            {item.sub && <span className="mt-1 block text-xs leading-relaxed text-muted">{item.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 手帳の系統の予報（カードにせず、はかどり印と罫線で見せる） */
export function ForecastCard({ state }: { state: ForecastState }) {
  const view = forecastView(state);
  return (
    <section aria-labelledby="forecast-title" aria-busy={state.status === "loading"}>
      <div className="flex items-start justify-between gap-3">
        <div className="pt-2">
          <h2 id="forecast-title" className="font-display text-2xl">
            今日のはかどり
          </h2>
          <p className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${view.ready ? "text-accent-strong" : "text-muted"}`}>
            {view.weather && <WeatherIcon weather={view.weather} size={22} />}
            {view.status}
          </p>
        </div>
        <HakadoriStamp view={view} />
      </div>
      <div className="mt-4 flex items-start gap-2">
        <Mascot mood={view.ready ? "cheer" : "normal"} size={40} className="shrink-0" />
        <p className="pt-1 text-sm font-bold leading-relaxed" aria-live="polite">
          {view.message}
          {view.rest && <span className="mt-1 block font-normal text-muted">{view.rest}</span>}
        </p>
      </div>
      <ForecastRetry view={view} />
      <div className="mt-4">
        <ForecastRows view={view} />
      </div>
      <div className="ruled">
        <CalendarButton event={view.calendar} />
        <NearbyPlaces places={view.places} />
      </div>
      <ForecastEvidence view={view} />
    </section>
  );
}

/** 最新の日記の点数を、横 1 列の小さな数字で並べる */
export function ScoreLine({ scores }: { scores: Record<(typeof SCORE_LABELS)[number][0], number> }) {
  return (
    <dl className="mt-3 flex justify-between gap-2">
      {SCORE_LABELS.map(([key, label]) => (
        <div key={key} className="flex items-baseline gap-1">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="font-num text-lg font-bold">{scores[key]}</dd>
        </div>
      ))}
    </dl>
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
        <Mascot mood="cheer" size={56} />
        <p className="font-bold leading-relaxed">
          はじめての日記を書いてみよう。気持ちをそのまま書くだけで大丈夫。
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
        <div className="flex items-start gap-3">
          <Mascot mood={mascotMoodFromScores(analysis)} size={48} />
          <p className="pt-1 text-sm font-bold leading-relaxed">{analysis.character_reply}</p>
        </div>
        {!isUrgent && <ScoreLine scores={analysis.scores} />}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Mascot mood="worried" size={48} />
        <p className="text-sm font-bold leading-relaxed">最新の日記は、まだ分析できていません。</p>
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
  return latest.status === "loaded" ? "最新の日記" : "日記";
}

const ENTRIES: { href: string; label: string; icon: IconName | "mascot" }[] = [
  { href: "/mood", label: "グラフ", icon: "chart" },
  { href: "/ask", label: "聞く", icon: "mascot" },
  { href: "/review", label: "復習", icon: "review" },
  { href: "/map", label: "場所", icon: "map" },
];

/** ほかの画面への入り口（グラフ・ハカドリに聞く・復習・はかどり場所マップ）を、アイコンの 1 列にまとめる */
export function EntryRow({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="ほかの画面" className={`grid grid-cols-4 gap-1 ${className}`}>
      {ENTRIES.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] text-xs font-bold transition active:scale-[.97]"
        >
          <span className="grid size-10 place-items-center rounded-full bg-soft-accent text-accent-strong" aria-hidden="true">
            {e.icon === "mascot" ? <Mascot mood="normal" size={34} /> : <Icon name={e.icon} size={21} />}
          </span>
          {e.label}
        </Link>
      ))}
    </nav>
  );
}
