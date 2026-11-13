import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { AttemptError, runWithFallback } from "@/lib/retry";

// Gemini API の呼び出し。API キーはサーバーの環境変数からだけ読む。

/** 1回の呼び出しの待ち時間の上限 */
const REQUEST_TIMEOUT_MS = 20_000;
/** 同じモデルで試す回数と、その間に待つ時間（1秒、2秒） */
const ATTEMPTS_PER_MODEL = 3;
const RETRY_DELAYS_MS = [1_000, 2_000];

/** やり直す価値のある HTTP ステータス（タイムアウト、回数制限、サーバー側の不調） */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError("GEMINI_API_KEY が設定されていません");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** メインのモデル → 切り替え先のモデル の順（同じ名前は1回だけ） */
export function getModels(): string[] {
  const models = [process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL]
    .map((m) => m?.trim())
    .filter((m): m is string => Boolean(m));
  if (models.length === 0) {
    throw new GeminiConfigError("GEMINI_MODEL が設定されていません");
  }
  return [...new Set(models)];
}

function classify(error: unknown): AttemptError {
  if (error instanceof AttemptError) {
    return error;
  }
  if (error instanceof ApiError) {
    if (RETRYABLE_STATUS.has(error.status)) {
      return new AttemptError("retryable", `HTTP ${error.status}`);
    }
    if (error.status === 404) {
      return new AttemptError("skipModel", "HTTP 404（モデルが見つからない）");
    }
    // 400・401・403 などは API キーやリクエストの誤りなので、やり直しても直らない
    return new AttemptError("fatal", `HTTP ${error.status}`);
  }
  // タイムアウトやネットワークの切断
  const name = error instanceof Error ? error.name : "unknown";
  return new AttemptError("retryable", name);
}

type GenerateJsonParams<T> = {
  systemInstruction: string;
  responseJsonSchema: unknown;
  temperature: number;
  userMessage: string;
  schema: z.ZodType<T, unknown>;
};

/**
 * 構造化出力（JSON スキーマ）で Gemini を呼び、返事を zod で確かめて返す。
 * 失敗したら同じモデルで最大3回、だめなら GEMINI_FALLBACK_MODEL に切り替えて最大3回試す。
 */
export async function generateJson<T>(
  params: GenerateJsonParams<T>,
): Promise<{ data: T; model: string }> {
  const ai = getClient();
  const models = getModels();

  const { result, model } = await runWithFallback(
    models,
    async (model) => {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.userMessage,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature,
            responseMimeType: "application/json",
            responseJsonSchema: params.responseJsonSchema,
            httpOptions: {
              timeout: REQUEST_TIMEOUT_MS,
              // SDK の自動やり直しは止め、runWithFallback で数える
              retryOptions: { attempts: 1 },
            },
          },
        });

        const text = response.text;
        if (!text) {
          throw new AttemptError("retryable", "空の返事");
        }
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          throw new AttemptError("retryable", "JSON として読めない返事");
        }
        const parsed = params.schema.safeParse(json);
        if (!parsed.success) {
          throw new AttemptError("retryable", "スキーマに合わない返事");
        }
        return parsed.data;
      } catch (error) {
        throw classify(error);
      }
    },
    {
      attemptsPerModel: ATTEMPTS_PER_MODEL,
      delaysMs: RETRY_DELAYS_MS,
      // 日記の本文は出さず、モデル名と失敗の種類だけを記録する
      onFailure: (log) =>
        console.warn(
          `[gemini] model=${log.model} attempt=${log.attempt} kind=${log.kind} detail=${log.detail}`,
        ),
    },
  );

  return { data: result, model };
}
