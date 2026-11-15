"use client";

import { useSyncExternalStore } from "react";
import { calendarUrl, isRangePast, type CalendarEvent } from "@/lib/calendar";
import { dateKey } from "@/lib/forecast";
import { Icon } from "@/components/ui/Icon";

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
        className="flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-4 py-2 text-sm font-bold transition active:scale-[.98]"
      >
        <Icon name="calendar" size={18} className="text-accent-strong" />
        <span className="flex-1">{event.range} をカレンダーに入れる</span>
        <Icon name="external" size={16} className="text-muted" />
      </a>
      {past && <p className="mt-1 text-xs text-muted">今日のこの時間は、もう過ぎています。</p>}
    </div>
  );
}
