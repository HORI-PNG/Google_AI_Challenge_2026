import {
  PLACES_FIELD_MASK,
  buildNearbySearchBody,
  parseNearbyResponse,
  placesRequestSchema,
} from "@/lib/places";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// 予報の「おすすめ場所」の近くにある実際の場所を探す（Places API (New) の Nearby Search）。
// 緯度・経度は検索にだけ使い、保存しない・ログに出さない（.agents/rules/privacy.md）

const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const TIMEOUT_MS = 10000;

function errorResponse(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function POST(request: Request) {
  try {
    await verifyRequestUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return errorResponse(401, "unauthorized", e.message);
    throw e;
  }

  const parsed = placesRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(400, "bad_request", "探す場所の形が正しくありません");
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return errorResponse(503, "no_key", "近くの場所を探す設定がまだありません");
  }

  let response: Response;
  try {
    response = await fetch(NEARBY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify(buildNearbySearchBody(parsed.data)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error(`[places] 通信できませんでした：${e instanceof Error ? e.name : "unknown"}`);
    return errorResponse(502, "places_failed", "近くの場所を探せませんでした");
  }

  if (!response.ok) {
    // 状態コードだけ出す（位置情報は出さない）
    console.error(`[places] Places API がエラーを返しました：${response.status}`);
    return errorResponse(502, "places_failed", "近くの場所を探せませんでした");
  }

  const json: unknown = await response.json().catch(() => null);
  const places = parseNearbyResponse(json, { lat: parsed.data.lat, lng: parsed.data.lng });
  return Response.json({ places });
}
