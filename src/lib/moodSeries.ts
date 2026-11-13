// 気分のグラフのための集計。画面から分け、Node.js のテストから直接読み込めるように、ほかのファイルを import しない。

export const SCORE_KEYS = ["mood", "energy", "focus", "stress"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type ScoreSet = Record<ScoreKey, number>;

/** 集計の元になる日記（分析が終わったものだけ） */
export type ScoredEntry = {
  createdAt: Date;
  scores: ScoreSet;
  emotionLabels: string[];
};

/** 1 日分の点。日記のない日は scores が null（0 点ではない） */
export type DayPoint = {
  /** YYYY-MM-DD（端末の時刻で区切る） */
  date: string;
  scores: ScoreSet | null;
  /** その日の日記の数 */
  count: number;
  /** その日に出てきた感情ラベル（重なりは1つにする） */
  emotionLabels: string[];
};

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** end の日を最後にして、days 日前の 0 時（端末の時刻） */
export function periodStart(end: Date, days: number): Date {
  return new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
}

/**
 * days 日分の点を、古い日から順に作る。
 * 1 日に日記が複数あるときは、その日の平均（四捨五入）にする。
 */
export function buildDailySeries(entries: ScoredEntry[], end: Date, days: number): DayPoint[] {
  const start = periodStart(end, days);
  const byDay = new Map<string, ScoredEntry[]>();
  for (const entry of entries) {
    const key = dateKey(entry.createdAt);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const points: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = dateKey(day);
    const list = byDay.get(key) ?? [];
    if (list.length === 0) {
      points.push({ date: key, scores: null, count: 0, emotionLabels: [] });
      continue;
    }
    const scores = Object.fromEntries(
      SCORE_KEYS.map((k) => [
        k,
        Math.round(list.reduce((sum, e) => sum + e.scores[k], 0) / list.length),
      ]),
    ) as ScoreSet;
    const emotionLabels = [...new Set(list.flatMap((e) => e.emotionLabels))];
    points.push({ date: key, scores, count: list.length, emotionLabels });
  }
  return points;
}

/** 期間中の平均（日ごとの点の平均）。日記が1日もなければ null */
export function averageScores(points: DayPoint[]): ScoreSet | null {
  const filled = points.filter((p): p is DayPoint & { scores: ScoreSet } => p.scores !== null);
  if (filled.length === 0) {
    return null;
  }
  return Object.fromEntries(
    SCORE_KEYS.map((k) => [
      k,
      Math.round(filled.reduce((sum, p) => sum + p.scores[k], 0) / filled.length),
    ]),
  ) as ScoreSet;
}

/**
 * 折れ線を、日記のない日で区切った「続いている区間」に分ける。
 * 返すのは、各区間に含まれる日の番号（points の添字）
 */
export function contiguousRuns(points: DayPoint[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  points.forEach((p, i) => {
    if (p.scores) {
      current.push(i);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  });
  if (current.length > 0) runs.push(current);
  return runs;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 11/4（グラフの目盛り用） */
export function formatShortDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${m}/${d}`;
}

/** 11/14（土） */
export function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}/${d}（${WEEKDAYS[date.getDay()]}）`;
}
