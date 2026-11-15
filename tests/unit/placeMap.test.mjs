// 段階14：はかどり場所マップのテスト
// 実行：npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  entryHakadori,
  groupSpots,
  hakadoriLevel,
  isValidLocation,
  roundLocation,
  spotBounds,
  spotRadius,
} from "../../src/lib/placeMap.ts";

const entry = (lat, lng, productivity = null, scores = null, date = "2026-11-10") => ({ date, lat, lng, productivity, scores });

describe("位置", () => {
  test("約 100m（小数第 3 位）に丸める", () => {
    assert.deepEqual(roundLocation(35.68449, 139.76151), { lat: 35.684, lng: 139.762 });
  });

  test("おかしな位置は使わない（0,0 も）", () => {
    assert.equal(isValidLocation({ lat: 35.6, lng: 139.7 }), true);
    assert.equal(isValidLocation({ lat: 0, lng: 0 }), false);
    assert.equal(isValidLocation({ lat: 91, lng: 0 }), false);
    assert.equal(isValidLocation({ lat: "35", lng: 139 }), false);
    assert.equal(isValidLocation(null), false);
  });
});

describe("はかどり度", () => {
  test("「はかどった？」の答えを優先し、なければ集中の点数", () => {
    assert.equal(entryHakadori(entry(0, 0, 3, { mood: 10, focus: 10 })), 1);
    assert.equal(entryHakadori(entry(0, 0, 1)), 0);
    assert.equal(entryHakadori(entry(0, 0, 2)), 0.5);
    assert.equal(entryHakadori(entry(0, 0, null, { mood: 50, focus: 80 })), 0.8);
    assert.equal(entryHakadori(entry(0, 0)), null);
  });

  test("色と言葉の 3 段階", () => {
    assert.equal(hakadoriLevel(0.9).label, "はかどる場所");
    assert.equal(hakadoriLevel(0.5).label, "ふつう");
    assert.equal(hakadoriLevel(0.1).label, "はかどりにくい場所");
    assert.equal(hakadoriLevel(null).label, "まだ分からない");
  });
});

describe("場所ごとにまとめる", () => {
  test("約 100m 以内の日記は 1 つにまとまり、数の多い順に並ぶ", () => {
    const spots = groupSpots([
      entry(35.6841, 139.7611, 3, { mood: 70, focus: 80 }, "2026-11-01"),
      entry(35.6839, 139.7609, 3, { mood: 80, focus: 90 }, "2026-11-03"),
      entry(35.6720, 139.758, 1, { mood: 40, focus: 30 }, "2026-11-02"),
    ]);
    assert.equal(spots.length, 2);
    assert.equal(spots[0].count, 2);
    assert.equal(spots[0].lat, 35.684);
    assert.equal(spots[0].hakadori, 1);
    assert.equal(spots[0].productiveDays, 2);
    assert.equal(spots[0].avgMood, 75);
    assert.equal(spots[0].avgFocus, 85);
    assert.deepEqual(spots[0].dates, ["2026-11-01", "2026-11-03"]);
    assert.equal(spots[1].hakadori, 0);
  });

  test("点数がない日だけなら、平均は null", () => {
    const [s] = groupSpots([entry(35.6, 139.7)]);
    assert.equal(s.hakadori, null);
    assert.equal(s.avgMood, null);
  });

  test("丸の大きさには上限があり、表示範囲は全部の丸を含む", () => {
    assert.ok(spotRadius(1) < spotRadius(9));
    assert.equal(spotRadius(1000), 28);
    assert.deepEqual(spotBounds([{ lat: 35.6, lng: 139.8 }, { lat: 35.7, lng: 139.7 }]), [
      [35.6, 139.7],
      [35.7, 139.8],
    ]);
    assert.equal(spotBounds([]), null);
  });
});
