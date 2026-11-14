// 段階10：Gemini を使える回数（1 人 1 日の上限）のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_DAILY_LIMIT, jstDateKey, parseDailyLimit, readUsageDocument } from "../../src/lib/usage.ts";

describe("1 日の上限", () => {
  test("環境変数の値を読み、おかしな値なら初期値", () => {
    assert.equal(parseDailyLimit("30"), 30);
    assert.equal(parseDailyLimit(undefined), DEFAULT_DAILY_LIMIT);
    assert.equal(parseDailyLimit(""), DEFAULT_DAILY_LIMIT);
    assert.equal(parseDailyLimit("0"), DEFAULT_DAILY_LIMIT);
    assert.equal(parseDailyLimit("abc"), DEFAULT_DAILY_LIMIT);
    assert.equal(parseDailyLimit("2.5"), DEFAULT_DAILY_LIMIT);
  });

  test("日付は日本時間で切り替わる", () => {
    assert.equal(jstDateKey(new Date("2026-11-14T14:59:59Z")), "2026-11-14");
    assert.equal(jstDateKey(new Date("2026-11-14T15:00:00Z")), "2026-11-15");
  });

  test("Firestore の文書から回数と更新時刻を読む", () => {
    const doc = { fields: { count: { integerValue: "7" } }, updateTime: "2026-11-14T01:02:03.456789Z" };
    assert.deepEqual(readUsageDocument(doc), { count: 7, updateTime: "2026-11-14T01:02:03.456789Z" });
    assert.equal(readUsageDocument({ fields: {} }), null);
    assert.equal(readUsageDocument(null), null);
    assert.equal(readUsageDocument({ fields: { count: { integerValue: "-1" } }, updateTime: "x" }), null);
  });
});
