// 予報の「おすすめ時間」を、Google カレンダーの予定を追加する画面へのリンクにする（段階11）。
// Calendar API は使わない（権限の同意も審査も要らない。予定は本人が画面で確かめて保存する）。
// テストから読み込むため、何も import しない

export type CalendarEvent = {
  title: string;
  /** 予定の日（YYYY-MM-DD、日本時間） */
  date: string;
  /** "10:00〜12:00" の形（forecastSchema で揃えたもの） */
  range: string;
  details: string;
  location?: string;
};

/** "10:00〜12:00" を開始と終了の分（0:00 からの分）に分ける。読めなければ null */
export function parseTimeRange(range: string): { start: number; end: number } | null {
  const m = range.match(/^\s*(\d{1,2}):(\d{2})\s*[-〜~ー–]\s*(\d{1,2}):(\d{2})\s*$/);
  if (!m) return null;
  const [sh, sm, eh, em] = m.slice(1).map(Number);
  if (sm > 59 || em > 59 || sh > 24 || eh > 24) return null;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start >= 24 * 60 || end > 24 * 60 || end <= start) return null;
  return { start, end };
}

/** YYYY-MM-DD と 0:00 からの分を、カレンダーの形（YYYYMMDDTHHMMSS）にする。24:00 は翌日の 0:00 */
export function toCalendarTime(date: string, minutes: number): string {
  const [y, mo, d] = date.split("-").map(Number);
  // 日をまたぐ計算だけに Date を使う（UTC で計算し、時刻はそのまま書く）
  const t = new Date(Date.UTC(y, mo - 1, d, 0, minutes));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

/** Google カレンダーの「予定を追加」画面の URL。時刻が読めなければ null */
export function calendarUrl(event: CalendarEvent): string | null {
  const time = parseTimeRange(event.range);
  if (!time) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarTime(event.date, time.start)}/${toCalendarTime(event.date, time.end)}`,
    ctz: "Asia/Tokyo",
    details: event.details,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** おすすめ時間の終わりが、今（0:00 からの分）より前か */
export function isRangePast(range: string, nowMinutes: number): boolean {
  const time = parseTimeRange(range);
  return time !== null && time.end <= nowMinutes;
}
