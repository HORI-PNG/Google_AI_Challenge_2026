// 段階5：気分のグラフの集計のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  averageScores,
  buildDailySeries,
  contiguousRuns,
  dateKey,
  formatDayLabel,
  formatShortDate,
  periodStart,
} from "../../src/lib/moodSeries.ts";

const s = (mood, energy = 50, focus = 50, stress = 50) => ({ mood, energy, focus, stress });
const at = (y, m, d, h = 22) => new Date(y, m - 1, d, h, 0);
const TODAY = at(2026, 11, 14, 9);

describe("buildDailySeries", () => {
  test("期間の日数だけ、古い日から順に点ができる", () => {
    const points = buildDailySeries([], TODAY, 7);
    assert.equal(points.length, 7);
    assert.equal(points[0].date, "2026-11-08");
    assert.equal(points[6].date, "2026-11-14");
    assert.ok(points.every((p) => p.scores === null && p.count === 0));
  });

  test("日記のない日は null（0 点にしない）", () => {
    const points = buildDailySeries(
      [{ createdAt: at(2026, 11, 12), scores: s(80), emotionLabels: ["喜び"] }],
      TODAY,
      7,
    );
    assert.equal(points.find((p) => p.date === "2026-11-11").scores, null);
    assert.deepEqual(points.find((p) => p.date === "2026-11-12").scores, s(80));
  });

  test("1日に日記が複数あるときは平均（四捨五入）、感情ラベルは重なりを1つに", () => {
    const points = buildDailySeries(
      [
        { createdAt: at(2026, 11, 13, 8), scores: s(60, 40, 70, 31), emotionLabels: ["眠い"] },
        { createdAt: at(2026, 11, 13, 23), scores: s(71, 50, 80, 40), emotionLabels: ["眠い", "やる気"] },
      ],
      TODAY,
      7,
    );
    const day = points.find((p) => p.date === "2026-11-13");
    assert.equal(day.count, 2);
    assert.deepEqual(day.scores, { mood: 66, energy: 45, focus: 75, stress: 36 });
    assert.deepEqual(day.emotionLabels, ["眠い", "やる気"]);
  });

  test("期間より前の日記は入らない", () => {
    const points = buildDailySeries(
      [{ createdAt: at(2026, 11, 1), scores: s(10), emotionLabels: [] }],
      TODAY,
      7,
    );
    assert.ok(points.every((p) => p.scores === null));
  });

  test("月をまたいでも日付がずれない", () => {
    const points = buildDailySeries([], at(2026, 12, 2), 7);
    assert.deepEqual(
      points.map((p) => p.date),
      ["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"],
    );
  });
});

describe("averageScores", () => {
  test("日記のある日だけで平均する", () => {
    const points = buildDailySeries(
      [
        { createdAt: at(2026, 11, 10), scores: s(40, 40, 40, 80), emotionLabels: [] },
        { createdAt: at(2026, 11, 12), scores: s(81, 60, 60, 20), emotionLabels: [] },
      ],
      TODAY,
      7,
    );
    assert.deepEqual(averageScores(points), { mood: 61, energy: 50, focus: 50, stress: 50 });
  });

  test("日記が1日もなければ null", () => {
    assert.equal(averageScores(buildDailySeries([], TODAY, 7)), null);
  });
});

describe("contiguousRuns", () => {
  test("日記のない日で線を区切る", () => {
    const filled = { date: "x", scores: s(50), count: 1, emotionLabels: [] };
    const empty = { date: "x", scores: null, count: 0, emotionLabels: [] };
    assert.deepEqual(contiguousRuns([filled, filled, empty, filled, empty, empty, filled, filled]), [
      [0, 1],
      [3],
      [6, 7],
    ]);
    assert.deepEqual(contiguousRuns([empty, empty]), []);
  });
});

describe("日付", () => {
  test("期間の始まりは、days 日前の 0 時", () => {
    assert.equal(periodStart(TODAY, 7).getTime(), new Date(2026, 10, 8).getTime());
    assert.equal(dateKey(periodStart(TODAY, 30)), "2026-10-16");
  });

  test("表示用の日付", () => {
    assert.equal(formatShortDate("2026-11-04"), "11/4");
    assert.equal(formatDayLabel("2026-11-14"), "11/14（土）");
  });
});
