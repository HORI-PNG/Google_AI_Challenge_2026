import { z } from "zod";

// 今日のはかどり予報（src/prompts/02_forecast.md）と「昨日ははかどった？」の決まりごと。
// 予報の入力の組み立て、Gemini の返事の確認、予報を作り直すかどうかの判断をここにまとめる。
// Node.js のテストから直接読み込むので、zod 以外は import しない。

// ---------- 「昨日ははかどった？」 ----------

/** 1 = はかどらなかった、2 = ふつう、3 = はかどった */
export const PRODUCTIVITY_VALUES = [1, 2, 3] as const;
export type Productivity = (typeof PRODUCTIVITY_VALUES)[number];

export const PRODUCTIVITY_LABELS: Record<Productivity, string> = {
  1: "はかどらなかった",
  2: "ふつう",
  3: "はかどった",
};

/** 主に勉強した時間帯（任意） */
export const STUDY_TIMES = ["morning", "noon", "evening", "night"] as const;
export type StudyTime = (typeof STUDY_TIMES)[number];
export const STUDY_TIME_LABELS: Record<StudyTime, string> = {
  morning: "朝",
  noon: "昼",
  evening: "夕方",
  night: "夜",
};
/** Gemini に渡すときの時間帯（プロンプトの study_time は "HH:MM-HH:MM"） */
const STUDY_TIME_RANGES: Record<StudyTime, string> = {
  morning: "06:00-11:00",
  noon: "11:00-15:00",
  evening: "15:00-19:00",
  night: "19:00-24:00",
};

/** 主に勉強した場所（任意）。プロンプト②の places と同じ値 */
export const PLACES = ["home", "library", "cafe", "school", "park"] as const;
export type Place = (typeof PLACES)[number];
export const PLACE_LABELS: Record<Place, string> = {
  home: "家",
  library: "図書館",
  cafe: "カフェ",
  school: "学校",
  park: "公園",
};

export type FeedbackAnswer = {
  productivity: Productivity;
  studyTime: StudyTime | null;
  place: Place | null;
};

/** YYYY-MM-DD（端末の時刻で区切る。moodSeries.ts の dateKey と同じ） */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** n 日前の 0 時（端末の時刻） */
export function startOfDay(date: Date, daysAgo = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysAgo);
}

/**
 * 「昨日ははかどった？」を聞くか。
 * 昨日の日記があって、まだ答えていないときだけ聞く
 */
export function shouldAskFeedback(diaryDates: string[], yesterday: string, answered: boolean): boolean {
  return !answered && diaryDates.includes(yesterday);
}

// ---------- 予報の入力 ----------

const score = z.number().int().min(0).max(100);
const scoresSchema = z.object({ mood: score, energy: score, focus: score, stress: score });
export type ScoreSet = z.infer<typeof scoresSchema>;

/** 予報に使う過去の日数 */
export const HISTORY_DAYS = 30;
/** プロンプトで「記録が十分」とする日数 */
export const ENOUGH_HISTORY = 7;

/** 分析が終わった日記（予報の材料）。本文は持たず、点数と気持ちのラベルだけ */
export type ScoredDiary = { id: string; createdAt: Date; scores: ScoreSet; labels: string[] };

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export type FeedbackRecord = FeedbackAnswer & { date: string };

export const historyItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekday: z.enum(WEEKDAYS),
  scores: scoresSchema,
  labels: z.array(z.string().max(12)).max(6).optional(),
  /** 答えていない日はない */
  productivity: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  study_time: z.string().max(20).optional(),
  place: z.enum(PLACES).optional(),
});
export type HistoryItem = z.infer<typeof historyItemSchema>;

/** POST /api/forecast に送る内容（日記の本文は送らない） */
export const forecastRequestSchema = z.object({
  /** 例：2026-11-14（土） */
  date: z.string().min(1).max(30),
  grade: z.string().min(1).max(20),
  /** 昨日か今日に日記を書いていれば、その点数。なければ null（過去の傾向から予報する） */
  today: scoresSchema.nullable(),
  history: z.array(historyItemSchema).max(HISTORY_DAYS),
});
export type ForecastRequest = z.infer<typeof forecastRequestSchema>;

/**
 * 過去の日ごとの記録（点数・気持ちのラベル・曜日、答えていれば「はかどった？」）を作る。
 * - 日記を書いた日をすべて入れる（最近の調子の流れと、曜日ごとの傾向を見るため）
 * - 1 日に日記が複数あるときは、その日の平均点。ラベルは重なりを除いて 6 つまで
 * - 今日の日記は入れない（今日の状態として別に渡す）
 * - 新しい日から HISTORY_DAYS 日分まで。古い順に並べる
 */
export function buildHistory(diaries: ScoredDiary[], feedback: FeedbackRecord[], today: string): HistoryItem[] {
  const byDay = new Map<string, ScoredDiary[]>();
  for (const d of diaries) {
    const key = dateKey(d.createdAt);
    if (key >= today) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), d]);
  }
  const answers = new Map(feedback.map((f) => [f.date, f]));
  const items: HistoryItem[] = [];
  for (const [date, list] of byDay) {
    const avg = (k: keyof ScoreSet) => Math.round(list.reduce((sum, d) => sum + d.scores[k], 0) / list.length);
    const labels = [...new Set(list.flatMap((d) => d.labels))].slice(0, 6);
    const f = answers.get(date);
    items.push({
      date,
      weekday: WEEKDAYS[list[0].createdAt.getDay()],
      scores: { mood: avg("mood"), energy: avg("energy"), focus: avg("focus"), stress: avg("stress") },
      ...(labels.length > 0 ? { labels } : {}),
      ...(f ? { productivity: f.productivity } : {}),
      ...(f?.studyTime ? { study_time: STUDY_TIME_RANGES[f.studyTime] } : {}),
      ...(f?.place ? { place: f.place } : {}),
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(-HISTORY_DAYS);
}

/** 「はかどった？」に答えた日の数（プロンプトの「記録が十分か」の目安） */
export function answeredDays(history: HistoryItem[]): number {
  return history.filter((h) => h.productivity !== undefined).length;
}

/**
 * 今日の状態として使う日記：昨日か今日に書いた、分析済みの日記のうち一番新しいもの。
 * なければ null（今日の入力なしで、過去の傾向から予報する）
 */
export function pickTodaySource(diaries: ScoredDiary[], now: Date): ScoredDiary | null {
  const since = startOfDay(now, 1).getTime();
  const recent = diaries.filter((d) => d.createdAt.getTime() >= since);
  return recent.reduce<ScoredDiary | null>((latest, d) => (!latest || d.createdAt > latest.createdAt ? d : latest), null);
}

/** プロンプト②の「入力の形」（JSON）に合わせて、Gemini に渡す文を作る */
export function buildForecastMessage(request: ForecastRequest): string {
  return JSON.stringify(
    { date: request.date, grade: request.grade, today: request.today, history: request.history },
    null,
    2,
  );
}

// ---------- 予報（Gemini の返事） ----------

export const WEATHERS = ["sunny", "partly_cloudy", "cloudy", "rainy"] as const;
export type Weather = (typeof WEATHERS)[number];

/** 天気の名前（アイコンは src/components/ui/Icon.tsx の WeatherIcon。絵文字は使わない） */
export const WEATHER_LABELS: Record<Weather, { label: string }> = {
  sunny: { label: "晴れ" },
  partly_cloudy: { label: "晴れときどきくもり" },
  cloudy: { label: "くもり" },
  rainy: { label: "雨" },
};

/** プロンプト②の「percent から weather を決める」と同じ区切り */
export function weatherFromPercent(percent: number): Weather {
  if (percent >= 70) return "sunny";
  if (percent >= 50) return "partly_cloudy";
  if (percent >= 30) return "cloudy";
  return "rainy";
}

/** ハカドリのひとことの上限（プロンプトでは 60 字以内。少し余裕を見る） */
export const MAX_FORECAST_MESSAGE = 90;

const timeRange = /^\s*\d{1,2}:\d{2}\s*[-〜~ー–]\s*\d{1,2}:\d{2}\s*$/;

/**
 * src/prompts/02_forecast.md の「出力スキーマ」と同じ形。
 * 天気は % から決め直す（Gemini が区切りを間違えても、% と天気が食い違わないように）
 */
export const forecastSchema = z
  .object({
    percent: score,
    weather: z.enum(WEATHERS),
    data_sufficiency: z.enum(["few", "enough"]),
    best_time: z.object({ range: z.string().regex(timeRange), reason: z.string().min(1) }),
    places: z.array(z.enum(PLACES)).transform((p) => [...new Set(p)].slice(0, 2)),
    lucky_item: z.object({ name: z.string().min(1).max(40), reason: z.string().min(1) }),
    study_style: z.string().min(1),
    rest_advice: z.string().min(1),
    message: z.string().min(1).max(MAX_FORECAST_MESSAGE),
    evidence: z.array(z.string().min(1)).transform((e) => e.slice(0, 3)),
  })
  .transform((f) => ({
    ...f,
    weather: weatherFromPercent(f.percent),
    best_time: { ...f.best_time, range: f.best_time.range.replace(/\s*[-〜~ー–]\s*/, "〜").trim() },
  }));
export type Forecast = z.output<typeof forecastSchema>;

/** 保存した予報（users/{uid}/forecasts/{date}） */
export type SavedForecast = {
  date: string;
  forecast: Forecast;
  /** どの日記の点数から作ったか（新しい日記を書いたら作り直す）。昨日・今日の日記なしで作ったときは NO_SOURCE */
  basedOnDiaryId: string;
  model: string;
};

/** 昨日・今日の日記がないまま作った予報の印 */
export const NO_SOURCE = "none";

/**
 * 予報を作り直すか（ユーザーと決めたこと：1 日 1 回作って使い回し、その日に新しい日記を書いたときだけ作り直す）
 */
export function needsNewForecast(saved: Pick<SavedForecast, "basedOnDiaryId"> | null, source: ScoredDiary | null): boolean {
  return saved === null || saved.basedOnDiaryId !== (source?.id ?? NO_SOURCE);
}

/** 予報に必ず添える注意書き（ユーザーの希望） */
export const FORECAST_DISCLAIMER = "この予報は、これまでの日記をもとに AI（Gemini）が予測したものです。ご参考までに。";

/** ハカドリの話しかけ（プロンプト③の today_forecast）に渡す、予報の短い説明 */
export function describeForecast(forecast: Forecast): string {
  return `はかどり度 ${forecast.percent}%（${WEATHER_LABELS[forecast.weather].label}）、${forecast.study_style}`;
}

/** 「はかどった？」に答えたあとの、ハカドリのひとこと（決まった文） */
export const FEEDBACK_THANKS: Record<Productivity, string> = {
  1: "教えてくれてありがとう。そういう日もあるよ、今日の予報に活かすね。",
  2: "ありがとう！ふつうの日の記録も、予報の大事な材料だよ。",
  3: "はかどったんだね。その日の過ごし方を、今日の予報に活かすよ。",
};
