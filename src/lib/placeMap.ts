// はかどり場所マップ（段階14）の計算。
// 日記の場所を約 100m ごとにまとめ、はかどり具合で色を決める。
// テストから読み込むため、何も import しない

/** 材料にする日記の日数 */
export const MAP_DAYS = 60;

/** 緯度・経度を小数第 3 位（約 100m）に丸める。細かい位置は保存しない */
export function roundLocation(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

export function isValidLocation(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object") return false;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  return (
    typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
  );
}

export type MapEntry = {
  date: string;
  lat: number;
  lng: number;
  /** 「はかどった？」の答え（1〜3）。答えていなければ null */
  productivity: 1 | 2 | 3 | null;
  scores: { mood: number; focus: number } | null;
};

export type MapSpot = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  /** はかどり度（0〜1）。決められなければ null */
  hakadori: number | null;
  /** 「はかどった」と答えた日の数 */
  productiveDays: number;
  avgMood: number | null;
  avgFocus: number | null;
  dates: string[];
};

/** 1 日分のはかどり度（0〜1）。「はかどった？」の答えを優先し、なければ集中の点数から目安を出す */
export function entryHakadori(e: MapEntry): number | null {
  if (e.productivity) return (e.productivity - 1) / 2;
  if (e.scores) return e.scores.focus / 100;
  return null;
}

const avg = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

/** 約 100m ごとにまとめる（日記の数が多い順） */
export function groupSpots(entries: MapEntry[]): MapSpot[] {
  const groups = new Map<string, MapEntry[]>();
  for (const e of entries) {
    const r = roundLocation(e.lat, e.lng);
    const key = `${r.lat.toFixed(3)},${r.lng.toFixed(3)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const [lat, lng] = key.split(",").map(Number);
      const h = list.map(entryHakadori).filter((v): v is number => v !== null);
      const mood = avg(list.flatMap((e) => (e.scores ? [e.scores.mood] : [])));
      const focus = avg(list.flatMap((e) => (e.scores ? [e.scores.focus] : [])));
      return {
        key,
        lat,
        lng,
        count: list.length,
        hakadori: avg(h),
        productiveDays: list.filter((e) => e.productivity === 3).length,
        avgMood: mood === null ? null : Math.round(mood),
        avgFocus: focus === null ? null : Math.round(focus),
        dates: list.map((e) => e.date).sort(),
      };
    })
    .sort((a, b) => b.count - a.count || (b.hakadori ?? 0) - (a.hakadori ?? 0));
}

/** はかどり度の 3 段階（色と言葉） */
export function hakadoriLevel(h: number | null): { label: string; color: string } {
  if (h === null) return { label: "まだ分からない", color: "#9ca3af" };
  if (h >= 0.67) return { label: "はかどる場所", color: "#f97316" };
  if (h >= 0.4) return { label: "ふつう", color: "#facc15" };
  return { label: "はかどりにくい場所", color: "#60a5fa" };
}

/** 丸の半径（px）。日記が多いほど大きく、上限あり */
export function spotRadius(count: number): number {
  return Math.min(28, 10 + Math.sqrt(count) * 5);
}

/** 地図の表示範囲（全部の丸が入る四角）。丸がなければ null */
export function spotBounds(spots: Pick<MapSpot, "lat" | "lng">[]): [[number, number], [number, number]] | null {
  if (spots.length === 0) return null;
  const lats = spots.map((s) => s.lat);
  const lngs = spots.map((s) => s.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}
