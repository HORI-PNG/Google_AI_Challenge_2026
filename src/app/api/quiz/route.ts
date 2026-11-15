import { buildQuizMessage, quizRequestSchema, quizSchema } from "@/lib/forgetting";
import { AllAttemptsFailedError, FatalAttemptError } from "@/lib/retry";
import { GeminiConfigError, generateJson } from "@/lib/server/gemini";
import { getReviewQuizPrompt } from "@/lib/server/prompts";
import { consumeGeminiQuota, DailyLimitError } from "@/lib/server/usage";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// 復習の思い出しクイズ（段階13、src/prompts/05_review_quiz.md）。
// 受け取るのは「学んだこと」の題目と要点だけ（日記の本文は受け取らない）。軽いモデルを先に使う

export const maxDuration = 60;

/** プロンプト⑤の推奨値 */
const TEMPERATURE = 0.7;
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

  const parsed = quizRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(400, "bad_request", "クイズにする内容の形が正しくありません");
  }

  try {
    await consumeGeminiQuota(request, uid);
    const prompt = await getReviewQuizPrompt();
    const { data, model } = await generateJson({
      systemInstruction: prompt.systemInstruction,
      responseJsonSchema: prompt.responseJsonSchema,
      temperature: TEMPERATURE,
      userMessage: buildQuizMessage(parsed.data),
      schema: quizSchema,
      preferFallback: true,
      attemptsPerModel: ATTEMPTS_PER_MODEL,
    });
    return Response.json({ quiz: data, model });
  } catch (e) {
    if (e instanceof DailyLimitError) return errorResponse(429, "daily_limit", e.message);
    if (e instanceof AllAttemptsFailedError) {
      return errorResponse(503, "quiz_failed", "Gemini が混み合っていて、クイズを作れませんでした");
    }
    if (e instanceof GeminiConfigError || e instanceof FatalAttemptError) {
      console.error(`[quiz] 設定の誤り：${e.message}`);
      return errorResponse(500, "config", "クイズの設定に問題があります");
    }
    console.error(`[quiz] 予期しないエラー：${e instanceof Error ? e.name : "unknown"}`);
    return errorResponse(500, "internal", "クイズを作れませんでした");
  }
}
