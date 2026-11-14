// 段階11：おすすめ時間をカレンダーに入れるリンクのテスト
// 実行：npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calendarUrl, isRangePast, parseTimeRange, toCalendarTime } from "../../src/lib/calendar.ts";

describe("時刻の読み取り", () => {
  test("いろいろな区切りの時間帯を読む", () => {
    assert.deepEqual(parseTimeRange("10:00〜12:00"), { start: 600, end: 720 });
    assert.deepEqual(parseTimeRange("9:30 - 11:15"), { start: 570, end: 675 });
    assert.deepEqual(parseTimeRange("22:00〜24:00"), { start: 1320, end: 1440 });
  });

  test("おかしな時間帯は null", () => {
    assert.equal(parseTimeRange("午前中"), null);
    assert.equal(parseTimeRange("12:00〜10:00"), null);
    assert.equal(parseTimeRange("10:00〜10:00"), null);
    assert.equal(parseTimeRange("10:61〜11:00"), null);
    assert.equal(parseTimeRange("24:00〜25:00"), null);
  });
});

describe("カレンダーの日時", () => {
  test("日付と分を YYYYMMDDTHHMMSS にする", () => {
    assert.equal(toCalendarTime("2026-11-14", 600), "20261114T100000");
    assert.equal(toCalendarTime("2026-11-14", 575), "20261114T093500");
  });

  test("24:00 は翌日の 0:00（月末・年末もまたぐ）", () => {
    assert.equal(toCalendarTime("2026-11-30", 1440), "20261201T000000");
    assert.equal(toCalendarTime("2026-12-31", 1440), "20270101T000000");
  });
});

describe("予定を追加する画面の URL", () => {
  const event = {
    title: "勉強（はかどり予報 78%）",
    date: "2026-11-14",
    range: "10:00〜12:00",
    details: "おすすめの理由：朝は集中しやすい",
    location: "図書館・カフェ",
  };

  test("題名・日時・日本時間・説明・場所が入る", () => {
    const url = new URL(calendarUrl(event));
    assert.equal(url.origin + url.pathname, "https://calendar.google.com/calendar/render");
    assert.equal(url.searchParams.get("action"), "TEMPLATE");
    assert.equal(url.searchParams.get("text"), "勉強（はかどり予報 78%）");
    assert.equal(url.searchParams.get("dates"), "20261114T100000/20261114T120000");
    assert.equal(url.searchParams.get("ctz"), "Asia/Tokyo");
    assert.equal(url.searchParams.get("details"), "おすすめの理由：朝は集中しやすい");
    assert.equal(url.searchParams.get("location"), "図書館・カフェ");
  });

  test("場所がなければ入れない。時刻が読めなければ null", () => {
    const url = new URL(calendarUrl({ ...event, location: undefined }));
    assert.equal(url.searchParams.has("location"), false);
    assert.equal(calendarUrl({ ...event, range: "いつでも" }), null);
  });
});

describe("過ぎた時間帯", () => {
  test("終わりの時刻を過ぎたら true", () => {
    assert.equal(isRangePast("10:00〜12:00", 11 * 60), false);
    assert.equal(isRangePast("10:00〜12:00", 12 * 60), true);
    assert.equal(isRangePast("読めない", 23 * 60), false);
  });
});
