// src/prompts/01_diary_analysis.md と、アプリ側の確認用スキーマがずれていないかのテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { EMOTION_LABELS, diaryAnalysisSchema } from "../../src/lib/diaryAnalysis.ts";
import { extractCodeBlock } from "../../src/lib/promptFile.ts";

const markdown = readFileSync("src/prompts/01_diary_analysis.md", "utf8");

describe("01_diary_analysis.md", () => {
  test("システム指示と出力スキーマを取り出せる", () => {
    const instruction = extractCodeBlock(markdown, "システム指示");
    assert.match(instruction, /^あなたは日記アプリ「Re:Note」の分析担当です。/);
    const schema = JSON.parse(extractCodeBlock(markdown, "出力スキーマ"));
    assert.equal(schema.type, "object");
  });

  test("出力スキーマの必須項目と感情ラベルが、アプリ側と同じ", () => {
    const schema = JSON.parse(extractCodeBlock(markdown, "出力スキーマ"));
    assert.deepEqual(
      [...schema.required].sort(),
      Object.keys(diaryAnalysisSchema.shape).sort(),
    );
    assert.deepEqual(schema.properties.emotion_labels.items.enum, [...EMOTION_LABELS]);
  });

  test("ない見出しを指定したら、分かるエラーになる", () => {
    assert.throws(() => extractCodeBlock(markdown, "存在しない見出し"), /見つかりません/);
  });
});

describe("diaryAnalysisSchema", () => {
  const valid = {
    scores: { mood: 72, energy: 55, focus: 80, stress: 30 },
    confidence: "high",
    reason: "部活で疲れているが、テストが近くてやる気は高い",
    emotion_labels: ["やる気", "疲れ"],
    learnings: [{ topic: "二次関数", point: "平方完成で頂点が分かる" }],
    character_reply: "疲れてるのに頑張ったね！",
    concern_level: "none",
  };

  test("正しい形なら通る", () => {
    assert.ok(diaryAnalysisSchema.safeParse(valid).success);
  });

  test("点数が 0〜100 の整数でなければ通らない", () => {
    for (const mood of [-1, 101, 50.5]) {
      const result = diaryAnalysisSchema.safeParse({ ...valid, scores: { ...valid.scores, mood } });
      assert.equal(result.success, false, `mood=${mood}`);
    }
  });

  test("一覧にない感情ラベルは通らない", () => {
    const result = diaryAnalysisSchema.safeParse({ ...valid, emotion_labels: ["ハッピー"] });
    assert.equal(result.success, false);
  });

  test("感情ラベルが4つ以上なら、先頭の3つだけ使う", () => {
    const result = diaryAnalysisSchema.parse({
      ...valid,
      emotion_labels: ["喜び", "楽しい", "達成感", "やる気"],
    });
    assert.deepEqual(result.emotion_labels, ["喜び", "楽しい", "達成感"]);
  });
});
