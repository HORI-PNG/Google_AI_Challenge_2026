// 段階4：声の日記と項目選択のテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS, RECORDING_BITS_PER_SECOND, normalizeAudioMimeType } from "../../src/lib/audio.ts";
import { buildAnalysisMessage } from "../../src/lib/diaryAnalysis.ts";
import { extractCodeBlock } from "../../src/lib/promptFile.ts";
import { buildSelectText, isSelectComplete } from "../../src/lib/selectDiary.ts";

describe("項目選択の日記", () => {
  test("test_data.md の A4 と同じ形の文章になる", () => {
    const text = buildSelectText({
      mood: "😐 ふつう",
      condition: "😪 眠い",
      events: ["テスト勉強", "塾"],
      note: "  英単語あんまり覚えられなかった ",
    });
    assert.equal(
      text,
      [
        "気分: 😐 ふつう",
        "体調: 😪 眠い",
        // 選んだ順ではなく、選択肢の並び順になる
        "今日あったこと: テスト勉強、塾",
        "ひとこと: 英単語あんまり覚えられなかった",
      ].join("\n"),
    );
  });

  test("今日あったことを選ばなければ「とくになし」、ひとことが空なら行を出さない", () => {
    const text = buildSelectText({ mood: "🙂 良い", condition: "💪 元気", events: [], note: "" });
    assert.equal(text, "気分: 🙂 良い\n体調: 💪 元気\n今日あったこと: とくになし");
  });

  test("一覧にない「今日あったこと」は無視する", () => {
    const text = buildSelectText({ mood: "🙂 良い", condition: "💪 元気", events: ["いたずら"], note: "" });
    assert.match(text, /今日あったこと: とくになし/);
  });

  test("気分と体調の両方を選ぶまで、保存できない", () => {
    assert.equal(isSelectComplete({ mood: "🙂 良い", condition: "", events: [], note: "" }), false);
    assert.equal(isSelectComplete({ mood: "うそ", condition: "💪 元気", events: [], note: "" }), false);
    assert.equal(isSelectComplete({ mood: "🙂 良い", condition: "💪 元気", events: [], note: "" }), true);
  });
});

describe("Gemini に渡す文（プロンプト①の「入力の形」）", () => {
  const base = { grade: "中学3年", date: "2026-11-13（金）", time: "21:30" };

  test("項目選択は selected: のあとに字下げして並べる", () => {
    const message = buildAnalysisMessage({
      ...base,
      inputType: "select",
      text: "気分: 😐 ふつう\n体調: 😪 眠い",
    });
    assert.equal(
      message,
      "date: 2026-11-13（金）\ntime: 21:30\ngrade: 中学3年\ninput_type: select\nselected:\n  気分: 😐 ふつう\n  体調: 😪 眠い",
    );
  });

  test("文章と声は diary: のあとに本文を置く", () => {
    for (const inputType of ["text", "voice"]) {
      const message = buildAnalysisMessage({ ...base, inputType, text: "今日は眠かった" });
      assert.match(message, new RegExp(`input_type: ${inputType}\ndiary:\n今日は眠かった$`));
    }
  });
});

describe("録音の形式", () => {
  test("ブラウザの形式名から Gemini に渡す形式名を取り出す", () => {
    assert.equal(normalizeAudioMimeType("audio/webm;codecs=opus"), "audio/webm");
    assert.equal(normalizeAudioMimeType("audio/mp4"), "audio/mp4");
    assert.equal(normalizeAudioMimeType("video/mp4"), "audio/mp4");
    assert.equal(normalizeAudioMimeType("AUDIO/OGG; codecs=opus"), "audio/ogg");
  });

  test("音声でないものや、知らない形式は受け付けない", () => {
    assert.equal(normalizeAudioMimeType("image/png"), null);
    assert.equal(normalizeAudioMimeType(""), null);
    assert.equal(normalizeAudioMimeType("audio/x-unknown"), null);
  });

  test("3分録音しても、サーバーが受け取れる大きさに収まる", () => {
    const bytes = (MAX_RECORDING_SECONDS * RECORDING_BITS_PER_SECOND) / 8;
    assert.ok(bytes * 1.5 < MAX_AUDIO_BYTES, `${bytes} bytes`);
  });
});

describe("04_voice_transcription.md", () => {
  const markdown = readFileSync("src/prompts/04_voice_transcription.md", "utf8");

  test("システム指示、出力スキーマ、入力の形を取り出せる", () => {
    assert.match(extractCodeBlock(markdown, "システム指示"), /書き起こし担当/);
    const schema = JSON.parse(extractCodeBlock(markdown, "出力スキーマ"));
    assert.deepEqual(schema.required, ["text"]);
    assert.equal(extractCodeBlock(markdown, "入力の形"), "この音声日記を文章にしてください。");
  });
});
