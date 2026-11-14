"use client";

import { useSyncExternalStore } from "react";
import { calendarUrl, isRangePast, type CalendarEvent } from "@/lib/calendar";
import { dateKey } from "@/lib/forecast";

// 予報のおすすめ時間を、Google カレンダーの予定にする（段階11）。
// 予定を追加する画面を開くだけで、保存は本人がカレンダーの画面でする

const noopSubscribe = () => () => undefined;
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const today = () => dateKey(new Date());

export function CalendarButton({ event }: { event: CalendarEvent | null }) {
  // 今の時刻と日付はブラウザで描くときだけ読む（サーバーでの事前描画では「過ぎていない」扱い）
  const minutes = useSyncExternalStore(noopSubscribe, nowMinutes, () => 0);
  const todayKey = useSyncExternalStore(noopSubscribe, today, () => "");
  if (!event) return null;
  const url = calendarUrl(event);
  if (!url) return null;
  const past = event.date === todayKey && isRangePast(event.range, minutes);

  return (
    <div className="mt-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] border border-border bg-subtle px-4 text-sm font-bold transition active:scale-[.98]"
      >
        <span>
          <span aria-hidden="true">📅 </span>おすすめ時間（{event.range}）をカレンダーに入れる
        </span>
        <span aria-hidden="true">↗</span>
      </a>
      {past && <p className="mt-1 text-xs text-muted">※ 今日のこの時間は、もう過ぎています</p>}
    </div>
  );
}
