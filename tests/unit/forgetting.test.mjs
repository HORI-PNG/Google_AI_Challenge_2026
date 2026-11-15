// 段階13：忘却曲線と復習クイズのテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  buildQuizMessage,
  curvePoints,
  daysAgoLabel,
  GROWTH,
  INITIAL_STABILITY,
  isDue,
  nextReviewAt,
  quizRequestSchema,
  quizSchema,
  retention,
  sortForReview,
  stabilityAfter,
} from "../../src/lib/forgetting.ts";
import { extractCodeBlock } from "../../src/lib/promptFile.ts";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date(2026, 10, 1, 22, 0);
const at = (days) => new Date(t0.getTime() + days * DAY);
const item = (reviews = [], learnedAt = t0, id = "d1_0") => ({ id, diaryId: "d1", topic: "平方完成", point: "要点", learnedAt, reviews });

describe("記憶の残り", () => {
  test("学んだ直後は 100%、1 日後は約 37%（e^-1）", () => {
    assert.equal(retention(item(), t0), 1);
    assert.ok(Math.abs(retention(item(), at(1)) - Math.exp(-1)) < 1e-9);
  });

  test("「思い出せた」で安定度が 2.5 倍、「忘れてた」で最初に戻る", () => {
    assert.equal(stabilityAfter([]), INITIAL_STABILITY);
    assert.equal(stabilityAfter([{ at: at(1), result: "remembered" }]), GROWTH);
    assert.equal(stabilityAfter([{ at: at(1), result: "remembered" }, { at: at(3), result: "remembered" }]), GROWTH * GROWTH);
    assert.equal(stabilityAfter([{ at: at(1), result: "remembered" }, { at: at(3), result: "forgot" }]), INITIAL_STABILITY);
  });

  test("記録の順番がばらばらでも、時刻の順に計算する", () => {
    const a = [{ at: at(3), result: "forgot" }, { at: at(1), result: "remembered" }];
    assert.equal(stabilityAfter(a), INITIAL_STABILITY);
  });

  test("復習した直後は 100% に戻り、そこから下がり方がゆるやかになる", () => {
    const reviewed = item([{ at: at(1), result: "remembered" }]);
    assert.equal(retention(reviewed, at(1)), 1);
    assert.ok(retention(reviewed, at(2)) > retention(item(), at(1)));
  });

  test("50% を下回ったら復習のタイミング。次の復習日は 50% になる日", () => {
    assert.equal(isDue(item(), at(0.5)), false);
    assert.equal(isDue(item(), at(1)), true);
    const next = nextReviewAt(item());
    // Date はミリ秒に丸めるので、少し誤差を許す
    assert.ok(Math.abs(retention(item(), next) - 0.5) < 1e-6);
  });
});

describe("並べ方とグラフ", () => {
  test("忘れかけている順に並ぶ", () => {
    const fresh = item([], at(9), "new");
    const old = item([], at(0), "old");
    const reviewed = item([{ at: at(9.5), result: "remembered" }], at(0), "rev");
    const sorted = sortForReview([fresh, reviewed, old], at(10));
    // old：10 日たって約 0%、new：1 日で約 37%、rev：復習して半日で約 82%
    assert.deepEqual(sorted.map((i) => i.id), ["old", "new", "rev"]);
  });

  test("曲線は 100% から始まり、復習の日に 100% に戻る", () => {
    const pts = curvePoints(item([{ at: at(2), result: "remembered" }]), at(4), 2);
    assert.deepEqual(pts[0], { day: 0, value: 1 });
    const atReview = pts.filter((p) => Math.abs(p.day - 2) < 1e-9);
    assert.equal(atReview.length, 2);
    assert.ok(atReview[0].value < 0.2);
    assert.equal(atReview[1].value, 1);
    assert.ok(pts.at(-1).day <= 6 && pts.at(-1).day > 5.5);
  });

  test("「今日」「昨日」「〇日前」", () => {
    const now = new Date(2026, 10, 15, 9, 0);
    assert.equal(daysAgoLabel(new Date(2026, 10, 15, 1, 0), now), "今日");
    assert.equal(daysAgoLabel(new Date(2026, 10, 14, 23, 0), now), "昨日");
    assert.equal(daysAgoLabel(new Date(2026, 10, 10, 22, 0), now), "5 日前");
  });
});

describe("復習クイズ（プロンプト⑤）", () => {
  test("Gemini に送る文", () => {
    const req = quizRequestSchema.parse({ grade: "高校2年", topic: " 平方完成 ", point: "x²+6x は (x+3)²−9" });
    assert.equal(buildQuizMessage(req), "grade: 高校2年\ntopic: 平方完成\npoint: x²+6x は (x+3)²−9");
  });

  test("クイズの返事を確かめる（ヒントは空でもよい）", () => {
    assert.equal(quizSchema.safeParse({ question: "Q", answer: "A", hint: "" }).success, true);
    assert.equal(quizSchema.safeParse({ question: "", answer: "A", hint: "" }).success, false);
  });

  test("プロンプト⑤のスキーマと入力の形が、アプリと同じ", () => {
    const md = readFileSync(new URL("../../src/prompts/05_review_quiz.md", import.meta.url), "utf8");
    assert.match(extractCodeBlock(md, "システム指示"), /復習クイズ係/);
    const schema = JSON.parse(extractCodeBlock(md, "出力スキーマ"));
    assert.deepEqual([...schema.required].sort(), Object.keys(quizSchema.shape).sort());
    const input = extractCodeBlock(md, "入力の形");
    assert.deepEqual(input.split("\n").map((l) => l.split(":")[0]), ["grade", "topic", "point"]);
  });
});
