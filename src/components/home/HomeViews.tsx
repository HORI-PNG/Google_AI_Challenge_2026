"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Ui";
import { Mascot } from "@/components/ui/Mascot";
import { FeedbackCard } from "@/components/home/FeedbackCard";
import { CalendarButton } from "@/components/home/CalendarButton";
import { NearbyPlaces } from "@/components/home/NearbyPlaces";
import {
  ForecastCard,
  ForecastEvidence,
  ForecastRetry,
  forecastView,
  Greeting,
  HomeHeader,
  latestTitle,
  MiniChart,
  placeholderGreeting,
  ReflectionContent,
  SCORE_LABELS,
} from "@/components/home/HomeParts";
import type { HomeViewProps } from "@/components/home/homeTypes";
import { mascotMoodFromScores } from "@/lib/mascotMood";

// ホームの3つの系統（Figma Make のデザインの HomeNotebook／HomeGlass／HomeOffice）。
// どれも同じ HomeViewProps を受け取り、並べ方だけが違う

/** 手帳（ことり・よぞら・もりのとしょかん・ソーダ・さくらもち） */
export function HomeNotebook(props: HomeViewProps) {
  return (
    <main className="min-h-dvh pb-10">
      <HomeHeader props={props} />
      <div className="space-y-5 px-4 pt-4">
        <Greeting nickname={props.nickname} greeting={props.greeting} />
        <FeedbackCard state={props.feedback} />
        <ForecastCard state={props.forecast} />
        <Card>
          <p className="mb-3 text-sm font-bold text-muted">{latestTitle(props.latest)}</p>
          <ReflectionContent {...props} />
        </Card>
        <Link
          href="/mood"
          className="flex min-h-24 w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card p-5 shadow-[var(--card-shadow)]"
        >
          <div>
            <p className="text-sm font-bold text-accent-strong">MY RHYTHM</p>
            <h2 className="mt-1 font-display text-lg font-bold">気分のグラフを見る</h2>
          </div>
          <MiniChart />
          <span aria-hidden="true">→</span>
        </Link>
        <AskLink className="rounded-[var(--radius)] border border-border bg-card p-5 shadow-[var(--card-shadow)]" />
      </div>
    </main>
  );
}

/** 「ハカドリに聞く」（段階12）、「復習」（段階13）、「はかどり場所マップ」（段階14）への入り口。3 つの系統で、外側の見た目だけ変える */
function AskLink({ className }: { className: string }) {
  return (
    <>
      <Link href="/ask" className={`flex min-h-20 w-full items-center gap-3 ${className}`}>
        <Mascot mood="normal" size={48} />
        <span className="flex-1">
          <span className="block text-xs font-bold text-accent-strong">ASK HAKADORI</span>
          <strong className="mt-1 block">ハカドリに聞く</strong>
          <span className="block text-xs text-muted">「先週の自分はどうだった？」に日記から答えるよ</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link href="/review" className={`mt-4 flex min-h-20 w-full items-center gap-3 ${className}`}>
        <span className="grid size-12 shrink-0 place-items-center text-2xl" aria-hidden="true">
          🧠
        </span>
        <span className="flex-1">
          <span className="block text-xs font-bold text-accent-strong">REVIEW</span>
          <strong className="mt-1 block">復習（忘却曲線）</strong>
          <span className="block text-xs text-muted">日記に書いた「学んだこと」を、忘れる前に思い出そう</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link href="/map" className={`mt-4 flex min-h-20 w-full items-center gap-3 ${className}`}>
        <span className="grid size-12 shrink-0 place-items-center text-2xl" aria-hidden="true">
          🗺️
        </span>
        <span className="flex-1">
          <span className="block text-xs font-bold text-accent-strong">MY PLACES</span>
          <strong className="mt-1 block">はかどり場所マップ</strong>
          <span className="block text-xs text-muted">どこで書いた日がはかどったかを、地図で見よう</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}

/** クリア（すりガラス）。予報を上に大きく、下にタイル、画面の下に固定のナビゲーション */
export function HomeGlass(props: HomeViewProps) {
  const view = forecastView(props.forecast);
  return (
    <main className="min-h-dvh pb-28">
      <HomeHeader props={props} />
      <div className="relative z-10 space-y-4 px-4 pt-5">
        <p className="liquid-card rounded-[var(--radius-control)] px-5 py-4 font-bold leading-relaxed" aria-live="polite">
          {props.greeting.text ?? placeholderGreeting(props.nickname)}
        </p>
        <FeedbackCard state={props.feedback} />
        <section className="liquid-card material-hero relative overflow-hidden rounded-[var(--radius)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="material-label">今日のコンディション</span>
              <h2 className="mt-3 font-display text-2xl font-bold">今日のはかどり</h2>
            </div>
            <div className="grid size-14 place-items-center rounded-full bg-soft-accent">
              <Mascot mood={props.greeting.mood} size={52} />
            </div>
          </div>
          <div className="my-6 flex items-end justify-between">
            <div>
              <strong
                className={`font-num text-7xl leading-none tracking-[-.06em] ${view.ready ? "" : "text-muted"}`}
                aria-label={view.ready ? `はかどり度 ${view.percent}%` : "まだ予報はありません"}
              >
                {view.percent}
                <span className="ml-1 text-2xl">%</span>
              </strong>
              <p className="mt-2 text-sm font-medium text-muted">{view.status}</p>
            </div>
            <span className="text-5xl" aria-hidden="true">
              {view.icon}
            </span>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${view.value}%` }} />
          </div>
          <p className="max-w-sm font-medium leading-relaxed" aria-live="polite">
            {view.message}
          </p>
          {view.rest && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{view.rest}</p>}
          <ForecastRetry view={view} />
          <ForecastEvidence view={view} />
        </section>

        <div className="grid grid-cols-2 gap-3">
          {view.items.map((item, index) => (
            <section key={item.label} className="liquid-card min-h-28 rounded-[var(--radius-control)] p-4">
              <div className="mb-4 grid size-9 place-items-center rounded-full bg-soft-accent text-accent-strong">
                <MaterialGlyph index={index} />
              </div>
              <p className="text-xs font-medium text-muted">{item.label}</p>
              <p className={`mt-1 text-sm font-bold leading-relaxed ${view.ready ? "" : "text-muted"}`}>{item.value}</p>
              {item.sub && <p className="mt-1 text-xs leading-relaxed text-muted">{item.sub}</p>}
            </section>
          ))}
        </div>
        {view.ready && (
          <section className="liquid-card rounded-[var(--radius)] px-4 pb-4 pt-0.5">
            <CalendarButton event={view.calendar} />
            <NearbyPlaces places={view.places} />
          </section>
        )}

        <section className="liquid-card rounded-[var(--radius)] p-5">
          <p className="mb-3 text-xs font-medium text-muted">{latestTitle(props.latest)}</p>
          <ReflectionContent {...props} />
        </section>

        <Link href="/mood" className="liquid-card flex min-h-24 w-full items-center justify-between rounded-[var(--radius)] px-5 text-left">
          <span>
            <span className="block text-xs font-medium text-muted">WEEKLY INSIGHT</span>
            <strong className="mt-1 block">気分のリズム</strong>
          </span>
          <MiniChart />
        </Link>
        <AskLink className="liquid-card rounded-[var(--radius)] px-5 py-4" />
      </div>

      <nav
        aria-label="メニュー"
        className="material-nav fixed inset-x-4 bottom-3 z-30 mx-auto flex min-h-[72px] max-w-[416px] items-center justify-around rounded-[26px] px-3"
      >
        <Link href="/" aria-current="page" className="grid min-h-12 min-w-14 place-items-center text-xs font-bold">
          <NavIcon type="home" />
          <span>ホーム</span>
        </Link>
        <Link
          href="/diary/new"
          className="material-fab -mt-7 grid size-16 place-items-center rounded-[22px] text-accent-foreground"
          aria-label="日記を書く"
        >
          <NavIcon type="edit" />
        </Link>
        <Link href="/mood" className="grid min-h-12 min-w-14 place-items-center text-xs font-bold">
          <NavIcon type="chart" />
          <span>グラフ</span>
        </Link>
        <Link href="/settings" className="grid min-h-12 min-w-14 place-items-center text-xs font-bold">
          <NavIcon type="palette" />
          <span>テーマ</span>
        </Link>
      </nav>
    </main>
  );
}

/** ビジネス。レポートのように、数値と項目を表の形で並べる */
export function HomeOffice(props: HomeViewProps) {
  const { latest } = props;
  const analysis = latest.status === "loaded" && latest.diary.analysisStatus === "done" ? latest.diary.analysis : null;
  const showScores = analysis && analysis.concern_level !== "urgent";
  const view = forecastView(props.forecast);

  return (
    <main className="min-h-dvh pb-10">
      <HomeHeader props={props} compact />
      <div className="px-5 py-6">
        <div className="mb-7">
          <p className="text-xs font-medium text-muted">Overview / {props.dateLabel}</p>
          <h2 className="mt-1 font-display text-2xl font-bold">本日のレポート</h2>
          <div className="mt-3 flex items-center gap-2">
            <Mascot mood={props.greeting.mood} size={32} />
            <p className="text-sm leading-relaxed text-muted" aria-live="polite">
              {props.greeting.text ?? placeholderGreeting(props.nickname)}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <FeedbackCard state={props.feedback} />
        </div>

        <section className="office-surface">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted">本日のコンディション予測</p>
              <strong
                className={`mt-2 block font-num text-4xl tracking-tight ${view.ready ? "" : "text-muted"}`}
                aria-label={view.ready ? `はかどり度 ${view.percent}%` : "まだ予報はありません"}
              >
                {view.percent}
                <span className="text-base font-medium">%</span>
              </strong>
            </div>
            <span className="office-pill">
              {view.ready && <span aria-hidden="true">{view.icon} </span>}
              {view.status}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted" aria-live="polite">
            {view.message}
          </p>
          {view.rest && <p className="mt-2 text-sm leading-relaxed text-muted">{view.rest}</p>}
          <ForecastRetry view={view} />
          <ForecastEvidence view={view} />
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {view.items.map((item) => (
            <div key={item.label} className="office-surface min-h-24">
              <span className="block text-xs text-muted">{item.label}</span>
              <strong className={`mt-3 block text-sm leading-relaxed ${view.ready ? "" : "text-muted"}`}>{item.value}</strong>
              {item.sub && <span className="mt-1 block text-xs leading-relaxed text-muted">{item.sub}</span>}
            </div>
          ))}
        </div>
        <CalendarButton event={view.calendar} />
        <NearbyPlaces places={view.places} />
        <div className="mt-4">
          <AskLink className="office-surface" />
        </div>

        <div className="mb-3 mt-7 flex items-center justify-between">
          <h3 className="text-sm font-bold">最新のコンディション</h3>
          <Link href="/mood" className="inline-flex min-h-11 items-center text-xs font-bold text-accent-strong">
            推移を表示
          </Link>
        </div>
        {showScores ? (
          <div className="office-surface p-0">
            {SCORE_LABELS.map(([key, label]) => (
              <div
                key={key}
                className="grid grid-cols-[1fr_auto] items-center border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm font-medium">
                  {label}
                  {key === "stress" && <span className="ml-2 text-xs text-muted">低いほど良い</span>}
                </span>
                <strong className="font-num">{analysis.scores[key]}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="office-surface">
            <ReflectionContent {...props} />
          </div>
        )}
        {showScores && (
          <div className="mt-4 flex items-start gap-3">
            <Mascot mood={mascotMoodFromScores(analysis)} size={40} />
            <p className="text-sm leading-relaxed text-muted">{analysis.character_reply}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function MaterialGlyph({ index }: { index: number }) {
  const paths = [
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>,
    <>
      <path d="M4 10.5 12 4l8 6.5V20H4Z" />
      <path d="M9 20v-6h6v6" />
    </>,
    <>
      <path d="M8 3h8v18H8z" />
      <path d="M10 7h4M10 11h4" />
    </>,
    <>
      <path d="m5 12 4 4L19 6" />
    </>,
  ];
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[index]}
    </svg>
  );
}

function NavIcon({ type }: { type: "home" | "edit" | "chart" | "palette" }) {
  const paths = {
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 10v10h12V10M10 20v-6h4v6" />
      </>
    ),
    edit: (
      <>
        <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10Z" />
        <path d="m13.5 7 3.5 3.5" />
      </>
    ),
    chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h3a6 6 0 0 0-3-10Z" />
        <circle cx="7" cy="10" r=".6" fill="currentColor" />
        <circle cx="9" cy="6.5" r=".6" fill="currentColor" />
      </>
    ),
  };
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}
