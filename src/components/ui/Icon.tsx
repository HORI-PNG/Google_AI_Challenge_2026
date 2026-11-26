import type { ReactNode } from "react";
import type { Weather } from "@/lib/forecast";

// アプリ全体で使う線のアイコン（段階15）。
// 絵文字は端末ごとに見た目が変わり、線のアイコンとちぐはぐになるので、ここの 1 セットにそろえる。
// どれも 24×24、線の太さ 1.8、角は丸。色は文字の色（currentColor）を使う

const PATHS = {
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
  /** 聞く（吹き出し） */
  ask: (
    <>
      <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" strokeWidth="2.4" />
    </>
  ),
  /** 復習（めくる単語カード） */
  review: (
    <>
      <rect x="4" y="7" width="13" height="13" rx="1.5" />
      <path d="M8 4h10.5A1.5 1.5 0 0 1 20 5.5V16" />
      <path d="M8 13.5h5M8 16.5h3" />
    </>
  ),
  /** 地図（折りたたんだ地図） */
  map: (
    <>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  /** 瞑想（あぐらで座り、両手をひざに置いた人） */
  meditation: (
    <>
      <circle cx="12" cy="5.5" r="2.2" />
      <path d="M12 9v4.5" />
      <path d="M12 10c-2.2 0-3.8 1.6-5.5 4.5M12 10c2.2 0 3.8 1.6 5.5 4.5" />
      <path d="M4 18c2.5-2.4 5.3-3.4 8-3.4s5.5 1 8 3.4c-2.2 1.4-5 2-8 2s-5.8-.6-8-2Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  /** ラッキーアイテム（お守り） */
  charm: (
    <>
      <path d="M8 6.5h8V19a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z" />
      <path d="M8 6.5 12 3l4 3.5M10.5 11h3M10.5 14h3" />
    </>
  ),
  /** 向いていること（開いた本） */
  book: (
    <>
      <path d="M12 7c-2-1.5-4.5-2-8-2v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V5c-3.5 0-6 .5-8 2Z" />
      <path d="M12 7v13" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  /** 選ぶ（チェックの入った四角） */
  check: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 12.5 3 3 5-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6" />
    </>
  ),
  /** 外のサイトを開く */
  external: <path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />,
  back: <path d="M15 5 8 12l7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  sunny: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  partly_cloudy: (
    <>
      <path d="M9 4v1.5M3.5 9.5H5M5 5.5l1 1M14 5.5l-1 1" />
      <path d="M6.2 11.5a3.5 3.5 0 0 1 6.3-3" />
      <path d="M8 20h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1A3 3 0 0 0 8 20Z" />
    </>
  ),
  cloudy: <path d="M7 19h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.2A3.4 3.4 0 0 0 7 19Z" />,
  rainy: (
    <>
      <path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.2A3.4 3.4 0 0 0 7 15Z" />
      <path d="m9 18-1 2.5M13 18l-1 2.5M17 18l-1 2.5" />
    </>
  ),
  /** はかどった？の 3 つの答え */
  face1: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 16.2c2-1.6 5-1.6 7 0M8.5 9.5l1.6 1M15.5 9.5l-1.6 1" />
    </>
  ),
  face2: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 15.5h6M9.3 10h.01M14.7 10h.01" strokeWidth="2.2" />
    </>
  ),
  face3: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 13.5c1 2.6 7 2.6 8 0M8.3 10.2c.6-1 1.8-1 2.4 0M13.3 10.2c.6-1 1.8-1 2.4 0" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}

/** 予報の天気のアイコン */
export function WeatherIcon({ weather, size = 28, className = "" }: { weather: Weather | null; size?: number; className?: string }) {
  return <Icon name={weather ?? "partly_cloudy"} size={size} className={className} />;
}
