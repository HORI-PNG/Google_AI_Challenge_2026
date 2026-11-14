// 段階9：近くの実際の場所（Places API (New)）のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildNearbySearchBody,
  distanceMeters,
  formatDistance,
  isSearchablePlace,
  mapsSearchUrl,
  nearbyCacheKey,
  parseNearbyResponse,
  placesRequestSchema,
  roundCoord,
} from "../../src/lib/places.ts";

const ORIGIN = { lat: 33.5902, lng: 130.4207 };

describe("入力の確かめ", () => {
  test("緯度・経度は約 100m に丸める", () => {
    assert.equal(roundCoord(33.590249), 33.59);
    assert.equal(roundCoord(130.42071), 130.421);
    const r = placesRequestSchema.parse({ type: "library", lat: 33.590249, lng: 130.42071 });
    assert.deepEqual(r, { type: "library", lat: 33.59, lng: 130.421 });
  });

  test("家・学校や、範囲外の緯度は受け付けない", () => {
    assert.equal(placesRequestSchema.safeParse({ type: "home", lat: 0, lng: 0 }).success, false);
    assert.equal(placesRequestSchema.safeParse({ type: "cafe", lat: 91, lng: 0 }).success, false);
    assert.equal(isSearchablePlace("school"), false);
    assert.equal(isSearchablePlace("park"), true);
  });
});

describe("Places API に送る本文", () => {
  test("カフェは cafe と coffee_shop、近い順、日本語", () => {
    const body = buildNearbySearchBody(placesRequestSchema.parse({ type: "cafe", ...ORIGIN }));
    assert.deepEqual(body.includedTypes, ["cafe", "coffee_shop"]);
    assert.equal(body.rankPreference, "DISTANCE");
    assert.equal(body.languageCode, "ja");
    assert.equal(body.locationRestriction.circle.radius, 2000);
  });
});

describe("距離", () => {
  test("同じ場所は 0m、緯度 0.01 度はおよそ 1.1km", () => {
    assert.equal(distanceMeters(ORIGIN, ORIGIN), 0);
    const d = distanceMeters(ORIGIN, { lat: ORIGIN.lat + 0.01, lng: ORIGIN.lng });
    assert.ok(d > 1100 && d < 1120, `${d}`);
  });

  test("徒歩の分と距離の表し方", () => {
    assert.equal(formatDistance(400), "徒歩 5 分（400m）");
    assert.equal(formatDistance(30), "徒歩 1 分（30m）");
    assert.equal(formatDistance(1560), "徒歩 20 分（1.6km）");
  });
});

describe("返事の整形", () => {
  const place = (id, dLat, extra = {}) => ({
    id,
    displayName: { text: `場所${id}`, languageCode: "ja" },
    location: { latitude: ORIGIN.lat + dLat, longitude: ORIGIN.lng },
    googleMapsUri: `https://maps.google.com/?cid=${id}`,
    ...extra,
  });

  test("近い順に 3 件まで、営業中かどうかを読む", () => {
    const json = {
      places: [
        place("a", 0.01, { currentOpeningHours: { openNow: true } }),
        place("b", 0.002, { currentOpeningHours: { openNow: false } }),
        place("c", 0.005),
        place("d", 0.015),
      ],
    };
    const result = parseNearbyResponse(json, ORIGIN);
    assert.deepEqual(result.map((p) => p.id), ["b", "c", "a"]);
    assert.equal(result[0].openNow, false);
    assert.equal(result[1].openNow, null);
    assert.equal(result[2].openNow, true);
    assert.equal(result[0].name, "場所b");
  });

  test("形のおかしいものは捨て、空の返事は 0 件", () => {
    assert.deepEqual(parseNearbyResponse({}, ORIGIN), []);
    assert.deepEqual(parseNearbyResponse(null, ORIGIN), []);
    const result = parseNearbyResponse({ places: [{ id: "x" }, place("ok", 0.001)] }, ORIGIN);
    assert.deepEqual(result.map((p) => p.id), ["ok"]);
  });

  test("地図のリンクがなければ、検索のリンクを作る", () => {
    const noUri = { ...place("n", 0.001), googleMapsUri: undefined };
    const [p] = parseNearbyResponse({ places: [noUri] }, ORIGIN);
    assert.match(p.mapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
  });
});

describe("API を使わない検索リンクと、覚えておく鍵", () => {
  test("Google マップで「近くの図書館」を探すリンク", () => {
    assert.equal(
      mapsSearchUrl("library"),
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("近くの図書館")}`,
    );
  });

  test("約 1km 以内なら同じ鍵、日付や種類が違えば別の鍵", () => {
    const a = nearbyCacheKey("2026-11-14", "cafe", 33.5902, 130.4207);
    assert.equal(a, nearbyCacheKey("2026-11-14", "cafe", 33.5911, 130.4198));
    assert.notEqual(a, nearbyCacheKey("2026-11-15", "cafe", 33.5902, 130.4207));
    assert.notEqual(a, nearbyCacheKey("2026-11-14", "park", 33.5902, 130.4207));
  });
});
