import { ASK_DAILY_LIMIT, askRequestSchema, buildAskMessage, normalizeAnswer } from "@/lib/ask";
import { AllAttemptsFailedError, FatalAttemptError } from "@/lib/retry";
import { GeminiConfigError, generateText } from "@/lib/server/gemini";
import { getCharacterPrompt } from "@/lib/server/prompts";
import { consumeAskQuota, consumeGeminiQuota, DailyLimitError } from "@/lib/server/usage";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// 「ハカドリに聞く」（自分専用 AI への質問。段階12）。プロンプト③の mode: chat。
// 無料枠の回数を節約するため、軽いモデル（GEMINI_FALLBACK_MODEL）を先に使う。
// 日記の本文は要点（1 日 200 字まで）だけ受け取り、保存もログへの出力もしない

export const maxDuration = 90;

/** プロンプト③の推奨値 */
const TEMPERATURE = 0.9;
const ATTEMPTS_PER_MODEL = 2;

function errorResponse(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function POST(request: Request) {
  let uid: string;
  try {
    uid = await verifyRequestUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return errorResponse(401, "unauthorized", e.message);
    throw e;
  }

  const parsed = askRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(400, "bad_request", "質問の形が正しくありません（200 字まで）");
  }

  try {
    await consumeAskQuota(request, uid, ASK_DAILY_LIMIT);
    await consumeGeminiQuota(request, uid);
    const prompt = await getCharacterPrompt();
    const { text, model } = await generateText({
      systemInstruction: prompt.systemInstruction,
      temperature: TEMPERATURE,
      userMessage: buildAskMessage(parsed.data),
      normalize: normalizeAnswer,
      attemptsPerModel: ATTEMPTS_PER_MODEL,
      preferFallback: true,
    });
    return Response.json({ answer: text, model });
  } catch (e) {
    if (e instanceof DailyLimitError) return errorResponse(429, "daily_limit", e.message);
    if (e instanceof AllAttemptsFailedError) {
      return errorResponse(503, "ask_failed", "Gemini が混み合っていて、答えられませんでした。少し待ってからもう一度聞いてね");
    }
    if (e instanceof GeminiConfigError || e instanceof FatalAttemptError) {
      console.error(`[ask] 設定の誤り：${e.message}`);
      return errorResponse(500, "config", "質問の設定に問題があります");
    }
    console.error(`[ask] 予期しないエラー：${e instanceof Error ? e.name : "unknown"}`);
    return errorResponse(500, "internal", "答えられませんでした");
  }
}
