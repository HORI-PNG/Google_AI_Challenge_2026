// 段階7：キャラクター（表情・話しかけ）のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { mascotMoodFromScores } from "../../src/lib/mascotMood.ts";
import {
  buildGreetingMessage,
  fallbackGreeting,
  FALLBACK_GREETINGS,
  normalizeGreeting,
  shortenDiaryText,
} from "../../src/lib/characterMessage.ts";
import { extractCodeBlock } from "../../src/lib/promptFile.ts";

const s = (mood, energy, focus, stress) => ({ scores: { mood, energy, focus, stress } });

describe("ハカドリの表情", () => {
  test("日記がまだないときは、ふつう", () => {
    assert.equal(mascotMoodFromScores(null), "normal");
  });
  test("つらい気持ちが書かれていたら、点数が高くても心配", () => {
    assert.equal(mascotMoodFromScores({ ...s(90, 90, 90, 10), concern_level: "urgent" }), "worried");
    assert.equal(mascotMoodFromScores({ ...s(90, 90, 90, 10), concern_level: "watch" }), "worried");
  });
  test("ストレスが高い・気分が低いときは心配", () => {
    assert.equal(mascotMoodFromScores(s(80, 80, 80, 70)), "worried");
    assert.equal(mascotMoodFromScores(s(39, 80, 80, 10)), "worried");
  });
  test("元気が低いときは、ねむい", () => {
    assert.equal(mascotMoodFromScores(s(60, 34, 80, 30)), "sleepy");
  });
  test("気分が高いときは、にっこり。集中できそうなときは、おうえん", () => {
    assert.equal(mascotMoodFromScores(s(70, 60, 80, 30)), "happy");
    assert.equal(mascotMoodFromScores(s(60, 60, 70, 30)), "cheer");
    assert.equal(mascotMoodFromScores(s(60, 60, 60, 30)), "normal");
  });
});

describe("話しかけの入力（プロンプト③の「入力の形」）", () => {
  test("最近の日記を、日付・短くした本文・点数で並べる", () => {
    const message = buildGreetingMessage({
      now: "2026-11-14（土）21:45",
      grade: "高校2年",
      recent: [
        { date: "11/13", text: "部活でへとへと。\n平方完成が分かってうれしい。", scores: { mood: 62, energy: 25, focus: 55, stress: 60 } },
        { date: "11/12", text: "友だちとカラオケ。", scores: null },
      ],
      forecast: null,
    });
    assert.equal(
      message,
      [
        "mode: greeting",
        "now: 2026-11-14（土）21:45",
        "grade: 高校2年",
        "recent_diaries:",
        "- 11/13：部活でへとへと。 平方完成が分かってうれしい。（mood 62, energy 25, focus 55, stress 60）",
        "- 11/12：友だちとカラオケ。",
        "today_forecast: まだなし",
      ].join("\n"),
    );
  });

  test("日記がないときは「なし」、4件以上あっても3件だけ送る", () => {
    const base = { now: "x", grade: "大学1年", forecast: null };
    assert.match(buildGreetingMessage({ ...base, recent: [] }), /recent_diaries: なし/);
    const many = Array.from({ length: 5 }, (_, i) => ({ date: `11/${i + 1}`, text: "a", scores: null }));
    assert.equal(buildGreetingMessage({ ...base, recent: many }).split("\n").filter((l) => l.startsWith("- ")).length, 3);
  });

  test("本文は60字で切る", () => {
    assert.equal(shortenDiaryText("あ".repeat(80)), `${"あ".repeat(60)}…`);
  });

  test("プロンプト③のシステム指示を md から取り出せる", () => {
    const md = readFileSync("src/prompts/03_character_chat.md", "utf8");
    assert.match(extractCodeBlock(md, "システム指示"), /キャラクター「ハカドリ」/);
  });
});

describe("話しかけの返事", () => {
  test("空や長すぎる返事は使わない", () => {
    assert.equal(normalizeGreeting(""), null);
    assert.equal(normalizeGreeting(null), null);
    assert.equal(normalizeGreeting("あ".repeat(101)), null);
  });
  test("前後のかぎかっこと余分な空白・改行を取る", () => {
    assert.equal(normalizeGreeting("「中間テスト、\n どうだった？」"), "中間テスト、 どうだった？");
  });
  test("決まった話しかけは、同じ日なら同じ", () => {
    assert.equal(fallbackGreeting("2026-11-14"), fallbackGreeting("2026-11-14"));
    assert.ok(FALLBACK_GREETINGS.includes(fallbackGreeting("2026-11-15")));
  });
});
