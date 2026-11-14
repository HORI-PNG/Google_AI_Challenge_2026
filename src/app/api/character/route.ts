import { z } from "zod";
import { buildGreetingMessage, normalizeGreeting, RECENT_DIARY_COUNT } from "@/lib/characterMessage";
import { AllAttemptsFailedError, FatalAttemptError } from "@/lib/retry";
import { GeminiConfigError, generateText } from "@/lib/server/gemini";
import { getCharacterPrompt } from "@/lib/server/prompts";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// ハカドリの話しかけ（src/prompts/03_character_chat.md、mode: greeting）。
// 話しかけは待たせたくないので、やり直しは少なめにする

export const maxDuration = 60;

/** プロンプト③の推奨値 */
const TEMPERATURE = 0.9;
const ATTEMPTS_PER_MODEL = 2;

const score = z.number().int().min(0).max(100);
const requestSchema = z.object({
  mode: z.literal("greeting"),
  now: z.string().min(1).max(40),
  grade: z.string().min(1).max(20),
  recent: z
    .array(
      z.object({
        date: z.string().min(1).max(10),
        text: z.string().max(4000),
        scores: z.object({ mood: score, energy: score, focus: score, stress: score }).nullable(),
      }),
    )
    .max(RECENT_DIARY_COUNT),
});

function errorResponse(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    await verifyRequestUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) return errorResponse(401, "unauthorized");
    throw e;
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(400, "bad_request");
  }
  const { now, grade, recent } = parsed.data;

  try {
    const prompt = await getCharacterPrompt();
    const { text, model } = await generateText({
      systemInstruction: prompt.systemInstruction,
      temperature: TEMPERATURE,
      userMessage: buildGreetingMessage({ now, grade, recent, forecast: null }),
      normalize: normalizeGreeting,
      attemptsPerModel: ATTEMPTS_PER_MODEL,
    });
    return Response.json({ text, model });
  } catch (e) {
    if (e instanceof AllAttemptsFailedError) return errorResponse(503, "unavailable");
    if (e instanceof GeminiConfigError || e instanceof FatalAttemptError) {
      console.error(`[character] 設定の誤り：${e.message}`);
      return errorResponse(500, "config");
    }
    console.error(`[character] 予期しないエラー：${e instanceof Error ? e.name : "unknown"}`);
    return errorResponse(500, "internal");
  }
}
