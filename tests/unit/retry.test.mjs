// 「同じモデルで3回 → 別のモデルで3回」のやり直しのテスト
// 実行：npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AllAttemptsFailedError,
  AttemptError,
  FatalAttemptError,
  runWithFallback,
} from "../../src/lib/retry.ts";

const MODELS = ["main-model", "fallback-model"];

/** 呼ばれた順番を記録し、決めた結果を順に返す偽の呼び出し */
function fakeCall(outcomes) {
  const calls = [];
  const call = async (model) => {
    calls.push(model);
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    return outcome;
  };
  return { calls, call };
}

function options(waits = []) {
  return {
    attemptsPerModel: 3,
    delaysMs: [1000, 2000],
    sleep: async (ms) => {
      waits.push(ms);
    },
  };
}

const busy = () => new AttemptError("retryable", "HTTP 503");

describe("runWithFallback", () => {
  test("1回目で成功したら、そのまま返す", async () => {
    const { calls, call } = fakeCall(["ok"]);
    const result = await runWithFallback(MODELS, call, options());
    assert.deepEqual(result, { result: "ok", model: "main-model" });
    assert.deepEqual(calls, ["main-model"]);
  });

  test("2回失敗しても、3回目で成功すれば同じモデルの結果を返す（1秒、2秒待つ）", async () => {
    const waits = [];
    const { calls, call } = fakeCall([busy(), busy(), "ok"]);
    const result = await runWithFallback(MODELS, call, options(waits));
    assert.equal(result.model, "main-model");
    assert.deepEqual(calls, ["main-model", "main-model", "main-model"]);
    assert.deepEqual(waits, [1000, 2000]);
  });

  test("3回続けて失敗したら、別のモデルに切り替える", async () => {
    const { calls, call } = fakeCall([busy(), busy(), busy(), "ok"]);
    const result = await runWithFallback(MODELS, call, options());
    assert.deepEqual(result, { result: "ok", model: "fallback-model" });
    assert.deepEqual(calls, ["main-model", "main-model", "main-model", "fallback-model"]);
  });

  test("両方のモデルで3回ずつ失敗したら、AllAttemptsFailedError（合計6回）", async () => {
    const { calls, call } = fakeCall(Array.from({ length: 6 }, busy));
    await assert.rejects(runWithFallback(MODELS, call, options()), (e) => {
      assert.ok(e instanceof AllAttemptsFailedError);
      assert.equal(e.failures.length, 6);
      return true;
    });
    assert.equal(calls.length, 6);
  });

  test("モデルが見つからないときは、やり直さずに次のモデルへ", async () => {
    const { calls, call } = fakeCall([new AttemptError("skipModel", "HTTP 404"), "ok"]);
    const result = await runWithFallback(MODELS, call, options());
    assert.equal(result.model, "fallback-model");
    assert.deepEqual(calls, ["main-model", "fallback-model"]);
  });

  test("API キーの誤りなどは、すぐにやめる", async () => {
    const { calls, call } = fakeCall([new AttemptError("fatal", "HTTP 403"), "ok"]);
    await assert.rejects(runWithFallback(MODELS, call, options()), FatalAttemptError);
    assert.deepEqual(calls, ["main-model"]);
  });

  test("想定外のエラー（タイムアウトなど）は、やり直しの対象にする", async () => {
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    const { calls, call } = fakeCall([timeout, "ok"]);
    const result = await runWithFallback(MODELS, call, options());
    assert.equal(result.model, "main-model");
    assert.equal(calls.length, 2);
  });
});
