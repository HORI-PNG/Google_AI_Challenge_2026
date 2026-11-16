import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { MINDFULNESS_FINISHES, pickMindfulnessFinish } from "../../src/lib/mindfulness.ts";

describe("瞑想終了時のムーブ", () => {
  it("歌唱と3つの追加ムーブを選択でき、すべての素材が配置されている", () => {
    const choices = [0, 0.25, 0.5, 0.75].map((value) => pickMindfulnessFinish(null, () => value).id);
    assert.equal(new Set(choices).size, 4);
    for (const finish of MINDFULNESS_FINISHES) {
      assert.ok(choices.includes(finish.id));
      assert.ok(existsSync(new URL(`../../public${finish.src}`, import.meta.url)), finish.src);
    }
  });

  it("直前のムーブを除いた候補すべてから選べる", () => {
    for (const previous of MINDFULNESS_FINISHES) {
      const choices = [0, 0.34, 0.67, 0.999999].map((value) => pickMindfulnessFinish(previous.id, () => value));
      assert.equal(new Set(choices.map((finish) => finish.id)).size, 3);
      assert.ok(choices.every((finish) => finish.id !== previous.id));
    }
  });
});
