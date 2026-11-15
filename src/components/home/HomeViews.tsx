"use client";

import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";
import { Icon, WeatherIcon } from "@/components/ui/Icon";
import { FeedbackCard } from "@/components/home/FeedbackCard";
import { CalendarButton } from "@/components/home/CalendarButton";
import { NearbyPlaces } from "@/components/home/NearbyPlaces";
import {
  EntryRow,
  ForecastCard,
  ForecastEvidence,
  ForecastRetry,
  forecastView,
  Greeting,
  HakadoriStamp,
  HomeHeader,
  latestTitle,
  placeholderGreeting,
  ReflectionContent,
  SCORE_LABELS,
} from "@/components/home/HomeParts";
import type { HomeViewProps } from "@/components/home/homeTypes";
import { mascotMoodFromScores } from "@/lib/mascotMood";

// ホームの3つの系統（Figma Make のデザインの HomeNotebook／HomeGlass／HomeOffice）。
// どれも同じ HomeViewProps を受け取り、並べ方だけが違う。
// 段階15：どの系統も「はかどり印」をいちばん強く見せ、ほかの画面への入り口はアイコンの 1 列にまとめた

/** 手帳（ことり・よぞら・もりのとしょかん・ソーダ・さくらもち）。カードの枠を減らし、罫線と余白で区切る */
export function HomeNotebook(props: HomeViewProps) {
  return (
    <main className="min-h-dvh pb-10">
      <HomeHeader props={props} />
      <div className="flex flex-col gap-7 px-5 pt-5">
        <Greeting nickname={props.nickname} greeting={props.greeting} />
        <FeedbackCard state={props.feedback} />
        <ForecastCard state={props.forecast} />
        <section className="ruled pt-5" aria-labelledby="latest-title">
          <h2 id="latest-title" className="mb-3 font-display text-lg">
            {latestTitle(props.latest)}
          </h2>
          <ReflectionContent {...props} />
        </section>
        <EntryRow className="ruled pt-4" />
      </div>
    </main>
  );
}

/** クリア（すりガラス）。予報を上に大きく、下にタイル。画面の下のメニューは GlassNav（全画面で共通） */
export function HomeGlass(props: HomeViewProps) {
  const view = forecastView(props.forecast);
  return (
    <main className="min-h-dvh pb-6">
      <HomeHeader props={props} actions={false} />
      <div className="relative z-10 space-y-4 px-4 pt-5">
        <div className="flex items-center gap-3 px-1">
          <Mascot mood={props.greeting.mood} size={48} />
          <p className="font-bold leading-relaxed" aria-live="polite">
            {props.greeting.text ?? placeholderGreeting(props.nickname)}
          </p>
        </div>
        <FeedbackCard state={props.feedback} />
        <section className="liquid-card material-hero relative overflow-hidden rounded-[var(--radius)] p-6" aria-busy={props.forecast.status === "loading"}>
          <div className="flex items-start justify-between gap-3">
            <div className="pt-2">
              <h2 className="font-display text-2xl">今日のはかどり</h2>
              <p className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${view.ready ? "text-accent-strong" : "text-muted"}`}>
                {view.weather && <WeatherIcon weather={view.weather} size={22} />}
                {view.status}
              </p>
            </div>
            <HakadoriStamp view={view} />
          </div>
          <p className="mt-5 max-w-sm font-medium leading-relaxed" aria-live="polite">
            {view.message}
          </p>
          {view.rest && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{view.rest}</p>}
          <ForecastRetry view={view} />
          <ForecastEvidence view={view} />
        </section>

        <div className="grid grid-cols-2 gap-3">
          {view.items.map((item) => (
            <section key={item.label} className="liquid-card min-h-28 rounded-[var(--radius-control)] p-4">
              <Icon name={item.icon} size={20} className="mb-3 text-accent-strong" />
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
          <h2 className="mb-3 text-sm font-bold text-muted">{latestTitle(props.latest)}</h2>
          <ReflectionContent {...props} />
        </section>

      </div>
      {/* ほかの画面への入り口・日記を書く・ユーザー情報は、どの画面にも出る下のメニュー（GlassNav）にある */}
    </main>
  );
}

/** ビジネス。レポートのように、数値と項目を表の形で並べる（はかどり印は書類の承認印のように右上に押す） */
export function HomeOffice(props: HomeViewProps) {
  const { latest } = props;
  const analysis = latest.status === "loaded" && latest.diary.analysisStatus === "done" ? latest.diary.analysis : null;
  const showScores = analysis && analysis.concern_level !== "urgent";
  const view = forecastView(props.forecast);

  return (
    <main className="min-h-dvh pb-10">
      <HomeHeader props={props} compact />
      <div className="px-5 py-6">
        <div className="mb-6 flex items-center gap-2">
          <Mascot mood={props.greeting.mood} size={32} />
          <p className="text-sm leading-relaxed text-muted" aria-live="polite">
            {props.greeting.text ?? placeholderGreeting(props.nickname)}
          </p>
        </div>

        <div className="mb-4">
          <FeedbackCard state={props.feedback} />
        </div>

        <section className="office-surface" aria-busy={props.forecast.status === "loading"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">本日のはかどり予報</h2>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted">
                {view.weather && <WeatherIcon weather={view.weather} size={20} />}
                {view.status}
              </p>
            </div>
            <HakadoriStamp view={view} size={88} />
          </div>
          <p className="mt-4 text-sm leading-relaxed" aria-live="polite">
            {view.message}
          </p>
          {view.rest && <p className="mt-2 text-sm leading-relaxed text-muted">{view.rest}</p>}
          <ForecastRetry view={view} />

          <dl className="mt-4 border-t border-border">
            {view.items.map((item) => (
              <div key={item.label} className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-border py-3 last:border-b-0">
                <dt className="flex items-start gap-1.5 text-xs text-muted">
                  <Icon name={item.icon} size={16} className="mt-px" />
                  {item.label}
                </dt>
                <dd>
                  <span className={`block text-sm font-bold leading-relaxed ${view.ready ? "" : "text-muted"}`}>{item.value}</span>
                  {item.sub && <span className="mt-1 block text-xs leading-relaxed text-muted">{item.sub}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <CalendarButton event={view.calendar} />
          <NearbyPlaces places={view.places} />
          <ForecastEvidence view={view} />
        </section>

        <div className="mb-3 mt-7 flex items-center justify-between">
          <h3 className="text-sm font-bold">最新のコンディション</h3>
          <Link href="/mood" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-accent-strong">
            推移を表示
            <Icon name="next" size={14} />
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

        <EntryRow className="mt-6 border-t border-border pt-4" />
      </div>
    </main>
  );
}
