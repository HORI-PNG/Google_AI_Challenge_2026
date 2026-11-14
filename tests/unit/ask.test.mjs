// 段階12：「ハカドリに聞く」のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  ASK_TEXT_LENGTH,
  askRequestSchema,
  buildAskMessage,
  MAX_ANSWER_LENGTH,
  normalizeAnswer,
  shortenForAsk,
} from "../../src/lib/ask.ts";

const base = {
  now: "2026-11-14（土）21:45",
  grade: "高校2年",
  diaries: [
    {
      date: "11/13（金）",
      text: "部活でへとへと。中間テストが不安。",
      scores: { mood: 62, energy: 25, focus: 55, stress: 60 },
      labels: ["不安", "達成感"],
      productivity: 2,
    },
    { date: "11/12（木）", text: "友だちとカラオケ。", scores: null, labels: [], productivity: null },
  ],
  forecast: "はかどり度 55%（晴れときどきくもり）",
  history: [],
  question: "今週の私ってどんな感じだった？",
};

describe("入力の確かめ", () => {
  test("正しい形を受け付け、質問の前後の空白を取る", () => {
    const r = askRequestSchema.parse({ ...base, question: "  今日は？  " });
    assert.equal(r.question, "今日は？");
  });

  test("空の質問・長すぎる質問・会話が多すぎるものは断る", () => {
    assert.equal(askRequestSchema.safeParse({ ...base, question: "   " }).success, false);
    assert.equal(askRequestSchema.safeParse({ ...base, question: "あ".repeat(201) }).success, false);
    const history = Array.from({ length: 7 }, () => ({ role: "user", text: "こんにちは" }));
    assert.equal(askRequestSchema.safeParse({ ...base, history }).success, false);
  });
});

describe("本文の要点", () => {
  test("1 行にして 200 字までにする", () => {
    assert.equal(shortenForAsk("今日は\n\n  楽しかった"), "今日は 楽しかった");
    const long = shortenForAsk("あ".repeat(300));
    assert.equal(long.length, ASK_TEXT_LENGTH + 1);
    assert.ok(long.endsWith("…"));
  });
});

describe("Gemini に送る文", () => {
  test("プロンプト③の mode: chat の形になる", () => {
    const msg = buildAskMessage(askRequestSchema.parse(base));
    const lines = msg.split("\n");
    assert.equal(lines[0], "mode: chat");
    assert.ok(msg.includes("- 11/13（金）：部活でへとへと。中間テストが不安。（mood 62, energy 25, focus 55, stress 60／気持ち：不安・達成感／はかどった？：ふつう）"));
    assert.ok(msg.includes("- 11/12（木）：友だちとカラオケ。\n"));
    assert.ok(msg.includes("today_forecast: はかどり度 55%"));
    assert.equal(lines.at(-1), "user: 今週の私ってどんな感じだった？");
    assert.ok(!msg.includes("conversation:"));
  });

  test("会話があれば、質問の前に続ける。日記も予報もなければ「なし」", () => {
    const msg = buildAskMessage(
      askRequestSchema.parse({
        ...base,
        diaries: [],
        forecast: null,
        history: [
          { role: "user", text: "先週は？" },
          { role: "hakadori", text: "がんばってたよ" },
        ],
        question: "今日は？",
      }),
    );
    assert.ok(msg.includes("recent_diaries: なし"));
    assert.ok(msg.includes("today_forecast: まだなし"));
    assert.ok(msg.endsWith("conversation:\nuser: 先週は？\nhakadori: がんばってたよ\nuser: 今日は？"));
  });

  test("プロンプト③の入力の例も mode: chat と conversation を使っている", () => {
    const md = readFileSync(new URL("../../src/prompts/03_character_chat.md", import.meta.url), "utf8");
    assert.ok(md.includes("mode: chat"));
    assert.ok(md.includes("conversation:"));
    assert.ok(md.includes("150 字以内"));
  });
});

describe("答えの整え方", () => {
  test("名前の前置きやかぎかっこを取る", () => {
    assert.equal(normalizeAnswer("ハカドリ：「今週はがんばってたね！」"), "今週はがんばってたね！");
    assert.equal(normalizeAnswer("hakadori: いいね"), "いいね");
  });

  test("空・長すぎる答えは null", () => {
    assert.equal(normalizeAnswer(""), null);
    assert.equal(normalizeAnswer(undefined), null);
    assert.equal(normalizeAnswer("あ".repeat(MAX_ANSWER_LENGTH + 1)), null);
  });
});
