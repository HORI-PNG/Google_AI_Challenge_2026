import { buildForecastMessage, forecastRequestSchema, forecastSchema } from "@/lib/forecast";
import { AllAttemptsFailedError, FatalAttemptError } from "@/lib/retry";
import { GeminiConfigError, generateJson } from "@/lib/server/gemini";
import { getForecastPrompt } from "@/lib/server/prompts";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// 今日のはかどり予報（src/prompts/02_forecast.md）。
// 入力は点数と「はかどった？」の答えだけで、日記の本文は受け取らない

// やり直しと切り替えを含めても終わるように、長めにとる（秒）
export const maxDuration = 150;

/** プロンプト②の推奨値（提案に少し変化をつける） */
const TEMPERATURE = 0.6;

function errorResponse(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function POST(request: Request) {
  try {
    await verifyRequestUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return errorResponse(401, "unauthorized", e.message);
    throw e;
  }

  const parsed = forecastRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(400, "bad_request", "予報に使う記録の形が正しくありません");
  }

  try {
    const prompt = await getForecastPrompt();
    const { data, model } = await generateJson({
      systemInstruction: prompt.systemInstruction,
      responseJsonSchema: prompt.responseJsonSchema,
      temperature: TEMPERATURE,
      userMessage: buildForecastMessage(parsed.data),
      schema: forecastSchema,
    });
    return Response.json({ forecast: data, model });
  } catch (e) {
    if (e instanceof AllAttemptsFailedError) {
      return errorResponse(503, "forecast_failed", "Gemini が混み合っていて、予報を作れませんでした");
    }
    if (e instanceof GeminiConfigError || e instanceof FatalAttemptError) {
      console.error(`[forecast] 設定の誤り：${e.message}`);
      return errorResponse(500, "config", "予報の設定に問題があります");
    }
    console.error(`[forecast] 予期しないエラー：${e instanceof Error ? e.name : "unknown"}`);
    return errorResponse(500, "internal", "予報を作れませんでした");
  }
}
