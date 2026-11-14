// 段階8：「昨日ははかどった？」と今日のはかどり予報のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  answeredDays,
  buildForecastMessage,
  buildHistory,
  dateKey,
  describeForecast,
  forecastRequestSchema,
  forecastSchema,
  HISTORY_DAYS,
  needsNewForecast,
  NO_SOURCE,
  pickTodaySource,
  PLACES,
  shouldAskFeedback,
  weatherFromPercent,
  WEATHERS,
} from "../../src/lib/forecast.ts";
import { extractCodeBlock } from "../../src/lib/promptFile.ts";

const s = (mood, energy, focus, stress) => ({ mood, energy, focus, stress });
const at = (y, m, d, h = 22) => new Date(y, m - 1, d, h, 0);
const diary = (id, date, scores, labels = []) => ({ id, createdAt: date, scores, labels });

/** Gemini の返事の見本（プロンプト②の出力スキーマどおり） */
const reply = (overrides = {}) => ({
  percent: 78,
  weather: "sunny",
  data_sufficiency: "enough",
  best_time: { range: "09:00-12:00", reason: "朝に集中できた日が多い" },
  places: ["library", "cafe"],
  lucky_item: { name: "あたたかい飲み物", reason: "ストレスが高い日に落ち着けた" },
  study_style: "暗記より問題演習",
  rest_advice: "夜は早めに休もう",
  message: "今日は集中しやすい日。午前中に大事なことをやろう",
  evidence: ["focus が 70 以上の日は 5 回中 4 回はかどった"],
  ...overrides,
});

describe("「昨日ははかどった？」を聞く条件", () => {
  test("昨日の日記があって、まだ答えていないときだけ聞く", () => {
    assert.equal(shouldAskFeedback(["2026-11-13", "2026-11-14"], "2026-11-13", false), true);
    assert.equal(shouldAskFeedback(["2026-11-13"], "2026-11-13", true), false);
    assert.equal(shouldAskFeedback(["2026-11-12", "2026-11-14"], "2026-11-13", false), false);
    assert.equal(shouldAskFeedback([], "2026-11-13", false), false);
  });
});

describe("予報の入力の組み立て", () => {
  const diaries = [
    diary("a", at(2026, 11, 10), s(60, 60, 60, 40), ["やる気"]),
    diary("b", at(2026, 11, 10, 8), s(80, 80, 80, 20), ["やる気", "達成感"]),
    diary("c", at(2026, 11, 11), s(30, 30, 30, 80)),
    diary("d", at(2026, 11, 12), s(50, 50, 50, 50)),
    diary("today", at(2026, 11, 14, 7), s(70, 70, 70, 30)),
  ];
  const feedback = [
    { date: "2026-11-11", productivity: 1, studyTime: "night", place: "home" },
    { date: "2026-11-10", productivity: 3, studyTime: "morning", place: "library" },
    // 日記のない日の答えは使わない
    { date: "2026-11-09", productivity: 2, studyTime: null, place: null },
    // 今日の分は入れない
    { date: "2026-11-14", productivity: 3, studyTime: null, place: null },
  ];

  test("日記を書いた日をすべて、古い順に、その日の平均点・曜日・気持ちで並べる（今日は除く）", () => {
    const history = buildHistory(diaries, feedback, "2026-11-14");
    assert.deepEqual(
      history.map((h) => h.date),
      ["2026-11-10", "2026-11-11", "2026-11-12"],
    );
    assert.deepEqual(history[0].scores, s(70, 70, 70, 30));
    assert.equal(history[0].weekday, "火");
    assert.deepEqual(history[0].labels, ["やる気", "達成感"]);
  });

  test("「はかどった？」に答えた日は、答えと時間帯・場所を添える", () => {
    const history = buildHistory(diaries, feedback, "2026-11-14");
    assert.equal(history[0].productivity, 3);
    assert.equal(history[0].study_time, "06:00-11:00");
    assert.equal(history[0].place, "library");
    assert.equal(answeredDays(history), 2);
  });

  test("答えていない日・時間帯や場所を答えていない日は、その項目を入れない", () => {
    const history = buildHistory(diaries, [{ date: "2026-11-12", productivity: 2, studyTime: null, place: null }], "2026-11-14");
    // 11/11 は気持ちのラベルも答えもない日
    assert.deepEqual(Object.keys(history[1]).sort(), ["date", "scores", "weekday"]);
    assert.deepEqual(Object.keys(history[2]).sort(), ["date", "productivity", "scores", "weekday"]);
  });

  test(`新しい日から ${HISTORY_DAYS} 日分まで`, () => {
    const many = [];
    const fb = [];
    for (let i = 1; i <= 40; i++) {
      const d = at(2026, 10, i);
      many.push(diary(`x${i}`, d, s(50, 50, 50, 50)));
      fb.push({ date: dateKey(d), productivity: 2, studyTime: null, place: null });
    }
    const history = buildHistory(many, fb, "2026-11-30");
    assert.equal(history.length, HISTORY_DAYS);
    assert.equal(history.at(-1).date, dateKey(at(2026, 10, 40)));
  });

  test("今日の状態は、昨日か今日の一番新しい日記。なければ null", () => {
    const now = at(2026, 11, 14, 9);
    assert.equal(pickTodaySource(diaries, now).id, "today");
    assert.equal(pickTodaySource(diaries.slice(0, 4), now), null);
    assert.equal(pickTodaySource([diary("y", at(2026, 11, 13, 23), s(1, 1, 1, 1))], now).id, "y");
  });

  test("Gemini に渡す文は、プロンプト②の入力の形（JSON）。日記の本文は含まない", () => {
    const request = forecastRequestSchema.parse({
      date: "2026-11-14（土）",
      grade: "高校2年",
      today: s(70, 70, 70, 30),
      history: buildHistory(diaries, feedback, "2026-11-14"),
    });
    const message = JSON.parse(buildForecastMessage(request));
    assert.deepEqual(Object.keys(message), ["date", "grade", "today", "history"]);
    assert.equal(message.history.length, 3);
    assert.ok(!JSON.stringify(message).includes("rawText"));
  });

  test("今日の日記がなくても（today: null）予報を頼める", () => {
    const base = { date: "2026-11-14（土）", grade: "高校2年", today: null, history: [] };
    assert.equal(forecastRequestSchema.safeParse(base).success, true);
  });

  test("形のおかしい入力は受け付けない", () => {
    const base = { date: "2026-11-14（土）", grade: "高校2年", today: s(70, 70, 70, 30), history: [] };
    const item = { date: "2026-11-13", weekday: "金", scores: s(1, 1, 1, 1) };
    assert.equal(forecastRequestSchema.safeParse({ ...base, history: [item] }).success, true);
    assert.equal(forecastRequestSchema.safeParse({ ...base, today: s(101, 70, 70, 30) }).success, false);
    assert.equal(forecastRequestSchema.safeParse({ ...base, history: [{ ...item, date: "11/13" }] }).success, false);
    assert.equal(forecastRequestSchema.safeParse({ ...base, history: [{ ...item, productivity: 4 }] }).success, false);
    assert.equal(forecastRequestSchema.safeParse({ ...base, history: [{ ...item, weekday: "Fri" }] }).success, false);
  });
});

describe("Gemini の返事（予報）の確認", () => {
  test("見本どおりの返事は使える。時間帯は「〜」でつなぐ", () => {
    const f = forecastSchema.parse(reply());
    assert.equal(f.percent, 78);
    assert.equal(f.best_time.range, "09:00〜12:00");
  });

  test("天気は % から決め直す（% と天気が食い違わない）", () => {
    assert.equal(forecastSchema.parse(reply({ percent: 35, weather: "sunny" })).weather, "cloudy");
  });

  test("% と天気の区切りは、プロンプトと同じ", () => {
    assert.equal(weatherFromPercent(100), "sunny");
    assert.equal(weatherFromPercent(70), "sunny");
    assert.equal(weatherFromPercent(69), "partly_cloudy");
    assert.equal(weatherFromPercent(50), "partly_cloudy");
    assert.equal(weatherFromPercent(49), "cloudy");
    assert.equal(weatherFromPercent(30), "cloudy");
    assert.equal(weatherFromPercent(29), "rainy");
    assert.equal(weatherFromPercent(0), "rainy");
  });

  test("範囲外の %・知らない天気や場所・時間帯の形の崩れは、使わない（やり直しの対象）", () => {
    assert.equal(forecastSchema.safeParse(reply({ percent: 120 })).success, false);
    assert.equal(forecastSchema.safeParse(reply({ weather: "snow" })).success, false);
    assert.equal(forecastSchema.safeParse(reply({ places: ["station"] })).success, false);
    assert.equal(forecastSchema.safeParse(reply({ best_time: { range: "午前中", reason: "x" } })).success, false);
    assert.equal(forecastSchema.safeParse(reply({ message: "あ".repeat(200) })).success, false);
  });

  test("場所は重なりを除いて 2 つまで、根拠は 3 つまで", () => {
    const f = forecastSchema.parse(
      reply({ places: ["home", "home", "cafe", "park"], evidence: ["1", "2", "3", "4"] }),
    );
    assert.deepEqual(f.places, ["home", "cafe"]);
    assert.equal(f.evidence.length, 3);
  });

  test("話しかけに渡す予報の説明", () => {
    assert.equal(describeForecast(forecastSchema.parse(reply())), "はかどり度 78%（晴れ）、暗記より問題演習");
  });
});

describe("予報を作り直す条件（1 日 1 回、新しい日記を書いたときだけ作り直す）", () => {
  const source = diary("d2", at(2026, 11, 14), s(1, 1, 1, 1));
  test("まだ予報がなければ作る", () => {
    assert.equal(needsNewForecast(null, source), true);
  });
  test("同じ日記から作った予報があれば使い回す", () => {
    assert.equal(needsNewForecast({ basedOnDiaryId: "d2" }, source), false);
  });
  test("そのあと新しい日記を書いていたら作り直す", () => {
    assert.equal(needsNewForecast({ basedOnDiaryId: "d1" }, source), true);
    assert.equal(needsNewForecast({ basedOnDiaryId: NO_SOURCE }, source), true);
  });
  test("昨日・今日の日記なしで作った予報は、日記を書くまで使い回す", () => {
    assert.equal(needsNewForecast({ basedOnDiaryId: NO_SOURCE }, null), false);
    assert.equal(needsNewForecast(null, null), true);
  });
});

describe("プロンプト②（src/prompts/02_forecast.md）との食い違いがない", () => {
  const md = readFileSync(new URL("../../src/prompts/02_forecast.md", import.meta.url), "utf8");
  const schema = JSON.parse(extractCodeBlock(md, "出力スキーマ"));
  test("天気と場所の選択肢が、アプリと同じ", () => {
    assert.deepEqual(schema.properties.weather.enum, [...WEATHERS]);
    assert.deepEqual(schema.properties.places.items.enum, [...PLACES]);
  });
  test("必須の項目が、アプリの確認と同じ", () => {
    const f = forecastSchema.parse(reply());
    assert.deepEqual([...schema.required].sort(), Object.keys(f).sort());
  });
  test("システム指示を取り出せる", () => {
    assert.match(extractCodeBlock(md, "システム指示"), /はかどり予報士/);
  });
});
