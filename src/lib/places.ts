import { z } from "zod";

// 予報の「おすすめ場所」を、近くの実際の場所にする（段階9、Places API (New) の Nearby Search）。
// 位置情報は検索にだけ使い、保存しない・ログに出さない（.agents/rules/privacy.md）。
// テストから読み込むため、zod 以外は import しない

/** 近くを探せる場所の種類（forecast.ts の PLACES のうち、家・学校以外） */
export const SEARCHABLE_PLACES = ["library", "cafe", "park"] as const;
export type SearchablePlace = (typeof SEARCHABLE_PLACES)[number];

export function isSearchablePlace(place: string): place is SearchablePlace {
  return (SEARCHABLE_PLACES as readonly string[]).includes(place);
}

/** Places API の種類（Table A） */
const PLACE_TYPES: Record<SearchablePlace, string[]> = {
  library: ["library"],
  cafe: ["cafe", "coffee_shop"],
  park: ["park"],
};

/** 探す範囲（m）。歩いて・自転車で行ける広さ */
export const SEARCH_RADIUS = 2000;
/** 出す件数 */
export const MAX_RESULTS = 3;
/** 取る項目（フィールドマスク）。費用を抑えるため最小限にする */
export const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.googleMapsUri",
  "places.currentOpeningHours.openNow",
].join(",");

/** 緯度・経度を小数第 3 位（約 100m）に丸める。細かい位置をサーバーに送らない */
export function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const placesRequestSchema = z.object({
  type: z.enum(SEARCHABLE_PLACES),
  lat: z.number().min(-90).max(90).transform(roundCoord),
  lng: z.number().min(-180).max(180).transform(roundCoord),
});
export type PlacesRequest = z.input<typeof placesRequestSchema>;

/** Nearby Search (New) に送る本文 */
export function buildNearbySearchBody(req: z.output<typeof placesRequestSchema>) {
  return {
    includedTypes: PLACE_TYPES[req.type],
    // 遠くの結果を捨てても 3 件残るよう、少し多めにもらう
    maxResultCount: 10,
    rankPreference: "DISTANCE",
    languageCode: "ja",
    regionCode: "JP",
    locationRestriction: {
      circle: { center: { latitude: req.lat, longitude: req.lng }, radius: SEARCH_RADIUS },
    },
  };
}

/** 2 点の距離（m）。ハバーサインの式 */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export const nearbyPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  distance: z.number().int().nonnegative(),
  /** 営業中なら true、時間外なら false、分からなければ null */
  openNow: z.boolean().nullable(),
  mapsUrl: z.string().url(),
});
export type NearbyPlace = z.infer<typeof nearbyPlaceSchema>;

const apiPlaceSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string().min(1) }),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  googleMapsUri: z.string().url().optional(),
  currentOpeningHours: z.object({ openNow: z.boolean().optional() }).optional(),
});

/** Places API の返事を、近い順・3 件までの形に直す（形のおかしいものは捨てる） */
export function parseNearbyResponse(json: unknown, origin: { lat: number; lng: number }): NearbyPlace[] {
  const list = json && typeof json === "object" && "places" in json ? (json as { places: unknown }).places : [];
  if (!Array.isArray(list)) return [];
  const places: NearbyPlace[] = [];
  for (const item of list) {
    const p = apiPlaceSchema.safeParse(item);
    if (!p.success) continue;
    const { id, displayName, location, googleMapsUri, currentOpeningHours } = p.data;
    places.push({
      id,
      name: displayName.text,
      distance: distanceMeters(origin, { lat: location.latitude, lng: location.longitude }),
      openNow: currentOpeningHours?.openNow ?? null,
      mapsUrl: googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}&query=${encodeURIComponent(displayName.text)}`,
    });
  }
  return places.sort((a, b) => a.distance - b.distance).slice(0, MAX_RESULTS);
}

/** 「徒歩 5 分（400m）」の形にする（徒歩は分速 80m） */
export function formatDistance(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 80));
  const length = meters < 1000 ? `${Math.round(meters / 10) * 10}m` : `${(meters / 1000).toFixed(1)}km`;
  return `徒歩 ${minutes} 分（${length}）`;
}

const SEARCH_WORDS: Record<SearchablePlace, string> = {
  library: "図書館",
  cafe: "カフェ",
  park: "公園",
};

/** API を使わずに Google マップで探すリンク（キーがない・位置情報を断られたとき） */
export function mapsSearchUrl(type: SearchablePlace): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`近くの${SEARCH_WORDS[type]}`)}`;
}

export function searchWord(type: SearchablePlace): string {
  return SEARCH_WORDS[type];
}

/** ブラウザに覚えておくときの鍵。同じ日・同じ種類・約 1km 以内なら同じ鍵になる */
export function nearbyCacheKey(date: string, type: SearchablePlace, lat: number, lng: number): string {
  return `renote:nearby:${date}:${type}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
}
