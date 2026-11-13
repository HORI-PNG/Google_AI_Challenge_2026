import { useState } from "react";
import { Card, Mascot, SpeechBubble } from "../components/Ui";
import { getTheme } from "../themes";
import type { ThemeId } from "../types";

const currentUser = {
  name: "デモ ユーザー",
  nickname: "ほり",
  email: "demo@renote.example",
  grade: "大学2年",
};

const homeData = {
  date: "11月14日（土）",
  productivity: 78,
  weather: "晴れ",
  message: "今日は集中しやすい日。午前中に一番大事なことをやろう。",
  forecast: [
    ["おすすめ時間", "10:00〜12:00"],
    ["おすすめ場所", "静かなカフェ・図書館"],
    ["ラッキーアイテム", "あたたかい飲み物"],
    ["向いていること", "暗記より問題演習"],
  ],
  scores: [
    ["気分", 68],
    ["元気", 56],
    ["集中", 74],
    ["ストレス", 42],
  ],
  reflection: "忙しい日も、自分のペースを守れていたね。ピッ！",
};

type HomeViewProps = {
  data: typeof homeData;
  onDiary: () => void;
  onChart: () => void;
  onSettings: () => void;
};

export function HomeScreen({
  theme,
  onDiary,
  onChart,
  onSettings,
}: {
  theme: ThemeId;
  onDiary: () => void;
  onChart: () => void;
  onSettings: () => void;
}) {
  const props = { data: homeData, onDiary, onChart, onSettings };
  const layout = getTheme(theme).layout;

  if (layout === "glass") return <HomeGlass {...props} />;
  if (layout === "office") return <HomeOffice {...props} />;
  return <HomeNotebook {...props} />;
}

function HomeHeader({
  data,
  onDiary,
  onSettings,
  compact = false,
}: Pick<HomeViewProps, "data" | "onDiary" | "onSettings"> & { compact?: boolean }) {
  return (
    <header className="home-header sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 py-3 backdrop-blur-[var(--card-blur)]">
      <div>
        {compact && (
          <p className="text-xs font-bold tracking-widest text-[var(--muted)]">RE:NOTE</p>
        )}
        <h1 className={`font-[var(--font-heading)] font-bold ${compact ? "text-base" : "text-xl"}`}>
          {data.date}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDiary}
          className="header-diary-button min-h-11 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-bold text-[var(--accent-foreground)] shadow-[var(--button-shadow)] transition active:scale-[.98]"
        >
          <span className="mr-1" aria-hidden="true">
            ✎
          </span>
          日記を書く
        </button>
        <AccountMenu onSettings={onSettings} />
      </div>
    </header>
  );
}

function AccountMenu({ onSettings }: { onSettings: () => void }) {
  const [showAccount, setShowAccount] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setShowAccount((value) => !value)}
        className="account-trigger grid size-11 place-items-center rounded-full border-2 border-[var(--card)] bg-[var(--soft-accent)] text-[var(--accent-strong)] shadow-[0_0_0_1px_var(--border)] transition active:scale-95"
        aria-label="ログイン中のユーザー情報"
        aria-expanded={showAccount}
        aria-controls="account-panel"
      >
        <UserIcon />
        <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[var(--card)] bg-[var(--series-focus)]" />
      </button>
      {showAccount && (
        <div
          id="account-panel"
          className="account-panel absolute right-0 top-[calc(100%+12px)] w-[min(310px,calc(100vw-32px))] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_18px_55px_color-mix(in_srgb,var(--foreground)_16%,transparent)] backdrop-blur-[var(--card-blur)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--soft-accent)] text-[var(--accent-strong)]">
              <UserIcon />
            </div>
            <div className="min-w-0">
              <p className="font-bold">{currentUser.nickname} さん</p>
              <p className="truncate text-xs text-[var(--muted)]">{currentUser.email}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[80px_1fr] gap-y-2 py-4 text-sm">
            <dt className="text-[var(--muted)]">名前</dt>
            <dd className="font-bold">{currentUser.name}</dd>
            <dt className="text-[var(--muted)]">学年</dt>
            <dd className="font-bold">{currentUser.grade}</dd>
            <dt className="text-[var(--muted)]">ログイン</dt>
            <dd className="font-bold">Google</dd>
          </dl>
          <button
            onClick={() => {
              setShowAccount(false);
              onSettings();
            }}
            className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] bg-[var(--subtle)] px-4 text-sm font-bold"
          >
            テーマ・アカウント設定
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

function HomeNotebook(props: HomeViewProps) {
  const { data, onChart } = props;
  return (
    <main className="min-h-dvh pb-10">
      <HomeHeader {...props} />
      <div className="space-y-5 px-4 pt-4">
        <div className="grid grid-cols-[72px_1fr] items-end gap-2">
          <Mascot mood="happy" size={78} />
          <SpeechBubble>
            ほりさん、今日は
            <br />
            どんな一日だった？
          </SpeechBubble>
        </div>
        <ForecastCard data={data} />
        <ReflectionCard data={data} />
        <FeedbackCard />
        <ChartLink onChart={onChart} />
      </div>
    </main>
  );
}

function HomeGlass(props: HomeViewProps) {
  const { data, onChart, onDiary, onSettings } = props;
  return (
    <main className="material-home min-h-dvh pb-28">
      <HomeHeader {...props} />
      <div className="relative z-10 space-y-4 px-4 pt-5">
        <section className="liquid-card material-hero relative overflow-hidden rounded-[var(--radius)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="material-label">今日のコンディション</span>
              <h2 className="mt-3 font-[var(--font-heading)] text-2xl font-bold">今日のはかどり</h2>
            </div>
            <div className="grid size-14 place-items-center rounded-full bg-[var(--soft-accent)]">
              <Mascot mood="happy" size={52} />
            </div>
          </div>
          <div className="my-6 flex items-end justify-between">
            <div>
              <strong className="font-[var(--font-number)] text-7xl leading-none tracking-[-.06em]">
                {data.productivity}
                <span className="ml-1 text-2xl">%</span>
              </strong>
              <p className="mt-2 text-sm font-medium text-[var(--muted)]">集中しやすい状態です</p>
            </div>
            <span className="material-chip">{data.weather}</span>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--track)]">
            <div className="h-full w-[78%] rounded-full bg-[var(--accent)]" />
          </div>
          <p className="max-w-sm font-medium leading-relaxed">{data.message}</p>
        </section>
        <div className="grid grid-cols-2 gap-3">
          {data.forecast.map(([label, value], index) => (
            <section
              key={label}
              className="liquid-card material-tile min-h-28 rounded-[var(--radius-control)] p-4"
            >
              <div className="mb-4 grid size-9 place-items-center rounded-full bg-[var(--soft-accent)] text-[var(--accent-strong)]">
                <MaterialGlyph index={index} />
              </div>
              <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
              <p className="mt-1 text-sm font-bold leading-relaxed">{value}</p>
            </section>
          ))}
        </div>
        <button
          onClick={onChart}
          className="liquid-card flex min-h-24 w-full items-center justify-between rounded-[var(--radius)] px-5 text-left"
        >
          <span>
            <span className="block text-xs font-medium text-[var(--muted)]">WEEKLY INSIGHT</span>
            <strong className="mt-1 block">気分のリズム</strong>
          </span>
          <MiniChart />
        </button>
      </div>
      <nav className="material-nav fixed inset-x-4 bottom-3 z-30 mx-auto flex min-h-[72px] max-w-[416px] items-center justify-around rounded-[26px] px-3">
        <button className="grid min-h-12 min-w-14 place-items-center text-xs font-bold">
          <NavIcon type="home" />
          <span>ホーム</span>
        </button>
        <button
          onClick={onDiary}
          className="material-fab -mt-7 grid size-16 place-items-center rounded-[22px] bg-[var(--accent)] text-[var(--accent-foreground)]"
          aria-label="日記を書く"
        >
          <NavIcon type="edit" />
        </button>
        <button
          onClick={onChart}
          className="grid min-h-12 min-w-14 place-items-center text-xs font-bold"
        >
          <NavIcon type="chart" />
          <span>グラフ</span>
        </button>
        <button
          onClick={onSettings}
          className="grid min-h-12 min-w-14 place-items-center text-xs font-bold"
        >
          <NavIcon type="palette" />
          <span>テーマ</span>
        </button>
      </nav>
    </main>
  );
}

function HomeOffice(props: HomeViewProps) {
  const { data, onChart } = props;
  return (
    <main className="office-home min-h-dvh pb-10">
      <HomeHeader {...props} compact />
      <div className="px-5 py-6">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">Overview / 11月14日</p>
            <h2 className="mt-1 font-[var(--font-heading)] text-2xl font-bold">今日のレポート</h2>
          </div>
          <button className="min-h-11 rounded-full bg-[var(--subtle)] px-4 text-xs font-bold">
            1週間
          </button>
        </div>
        <section className="office-surface">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">はかどりスコア</p>
              <strong className="mt-2 block font-[var(--font-number)] text-4xl tracking-tight">
                {data.productivity}
                <span className="text-base font-medium">%</span>
              </strong>
            </div>
            <span className="rounded-full bg-[var(--soft-accent)] px-3 py-2 text-xs font-bold">
              {data.weather}
            </span>
          </div>
          <OfficeChart />
          <div className="mt-4 flex gap-2">
            <span className="office-pill">集中しやすい</span>
            <span className="office-pill">前日比 +6</span>
          </div>
        </section>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {data.forecast.map(([label, value]) => (
            <div key={label} className="office-surface min-h-24">
              <span className="block text-xs text-[var(--muted)]">{label}</span>
              <strong className="mt-3 block text-sm leading-relaxed">{value}</strong>
            </div>
          ))}
        </div>
        <div className="mb-3 mt-7 flex items-center justify-between">
          <h3 className="text-sm font-bold">コンディション詳細</h3>
          <button
            onClick={onChart}
            className="min-h-11 text-xs font-bold text-[var(--accent-strong)]"
          >
            すべて表示
          </button>
        </div>
        <div className="office-surface p-0">
          {data.scores.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_auto] items-center border-b border-[var(--border)] px-4 py-3 last:border-b-0"
            >
              <span className="text-sm font-medium">{label}</span>
              <strong className="font-[var(--font-number)]">{value}</strong>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{data.message}</p>
      </div>
    </main>
  );
}

function ForecastCard({ data }: { data: typeof homeData }) {
  return (
    <Card className="forecast-card overflow-hidden p-0">
      <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
        <div>
          <p className="text-sm font-bold text-[var(--accent-strong)]">TODAY'S FORECAST</p>
          <h2 className="mt-1 font-[var(--font-heading)] text-xl font-bold">今日のはかどり予報</h2>
        </div>
        <div className="text-right">
          <div className="text-3xl" aria-label="晴れ">
            ☀️
          </div>
          <p className="mt-1 text-sm font-bold">{data.weather}</p>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-3">
          <strong className="font-[var(--font-number)] text-6xl leading-none text-[var(--accent)]">
            {data.productivity}
            <span className="text-2xl">%</span>
          </strong>
          <p className="pb-1 text-sm leading-relaxed text-[var(--muted)]">
            集中の波が
            <br />
            きています
          </p>
        </div>
        <div className="my-5 h-px bg-[var(--border)]" />
        <div className="grid grid-cols-2 gap-3">
          {data.forecast.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
              <p className="mt-1 text-sm font-bold leading-snug">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-[var(--radius-control)] bg-[var(--soft-accent)] p-4 text-sm font-bold leading-relaxed">
          {data.message}
        </p>
      </div>
    </Card>
  );
}

function ReflectionCard({ data }: { data: typeof homeData }) {
  return (
    <Card>
      <p className="text-sm font-bold text-[var(--muted)]">昨日の日記をふりかえり</p>
      <div className="mt-3 flex items-center gap-3">
        <Mascot mood="cheer" size={66} />
        <p className="font-bold leading-relaxed">{data.reflection}</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {data.scores.map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius-small)] bg-[var(--subtle)] p-2 text-center"
          >
            <strong className="block font-[var(--font-number)] text-lg">{value}</strong>
            <span className="text-xs text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeedbackCard() {
  return (
    <Card>
      <h2 className="font-[var(--font-heading)] text-lg font-bold">昨日の勉強ははかどった？</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["😣\nいまいち", "🙂\nまあまあ", "😆\nはかどった"].map((item) => (
          <button
            key={item}
            className="min-h-20 whitespace-pre-line rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] text-sm font-bold transition hover:border-[var(--accent)]"
          >
            {item}
          </button>
        ))}
      </div>
    </Card>
  );
}

function ChartLink({ onChart }: { onChart: () => void }) {
  return (
    <button
      onClick={onChart}
      className="flex min-h-24 w-full items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-[var(--card-shadow)]"
    >
      <div>
        <p className="text-sm font-bold text-[var(--accent-strong)]">MY RHYTHM</p>
        <h2 className="mt-1 font-[var(--font-heading)] text-lg font-bold">気分のグラフを見る</h2>
      </div>
      <MiniChart />
      <span aria-hidden="true">→</span>
    </button>
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
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h3a6 6 0 0 0-3-10Z" />
        <circle cx="7" cy="10" r=".6" fill="currentColor" />
        <circle cx="9" cy="6.5" r=".6" fill="currentColor" />
      </>
    ),
  };
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

function OfficeChart() {
  return (
    <svg className="mt-7 w-full" viewBox="0 0 340 128" role="img" aria-label="今週のはかどり推移">
      {[18, 57, 96].map((y) => (
        <line key={y} x1="0" y1={y} x2="340" y2={y} stroke="var(--chart-grid)" />
      ))}
      <path
        d="M0 103 C40 102 53 97 78 92 S125 90 148 82 S188 80 211 66 S253 63 277 48 S315 36 340 20"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <path
        d="M0 103 C40 102 53 97 78 92 S125 90 148 82 S188 80 211 66 S253 63 277 48 S315 36 340 20 V128 H0Z"
        fill="url(#officeArea)"
      />
      <defs>
        <linearGradient id="officeArea" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--accent)" stopOpacity=".14" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MiniChart() {
  return (
    <svg width="82" height="44" viewBox="0 0 82 44" aria-hidden="true">
      <path
        d="M2 34 15 28 28 31 41 17 55 22 68 8 80 12"
        fill="none"
        stroke="var(--series-mood)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M2 39 15 35 28 26 41 30 55 18 68 24 80 20"
        fill="none"
        stroke="var(--series-focus)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6" />
    </svg>
  );
}
