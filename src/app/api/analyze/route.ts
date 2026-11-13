import { diaryAnalysisSchema, analyzeRequestSchema } from "@/lib/diaryAnalysis";
import type { AnalyzeResponse } from "@/lib/diaryAnalysis";
import { AllAttemptsFailedError, FatalAttemptError } from "@/lib/retry";
import { GeminiConfigError, generateJson } from "@/lib/server/gemini";
import { getDiaryAnalysisPrompt } from "@/lib/server/prompts";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// やり直しと切り替えを含めても終わるように、長めにとる（秒）
export const maxDuration = 150;

/** プロンプト①の推奨値（src/prompts/README.md） */
const TEMPERATURE = 0.3;

function errorResponse(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function POST(request: Request) {
  try {
    await verifyRequestUser(request);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return errorResponse(401, "unauthorized", e.message);
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "bad_request", "送られた内容が読めませんでした");
  }
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "bad_request", "日記の内容を確認してください");
  }
  const { text, inputType, grade, date, time } = parsed.data;

  // src/prompts/01_diary_analysis.md の「入力の形」に合わせる
  const userMessage = [
    `date: ${date}`,
    `time: ${time}`,
    `grade: ${grade}`,
    `input_type: ${inputType}`,
    "diary:",
    text,
  ].join("\n");

  try {
    const prompt = await getDiaryAnalysisPrompt();
    const { data, model } = await generateJson({
      systemInstruction: prompt.systemInstruction,
      responseJsonSchema: prompt.responseJsonSchema,
      temperature: TEMPERATURE,
      userMessage,
      schema: diaryAnalysisSchema,
    });
    const response: AnalyzeResponse = { analysis: data, model };
    return Response.json(response);
  } catch (e) {
    if (e instanceof AllAttemptsFailedError) {
      return errorResponse(
        503,
        "analysis_failed",
        "Gemini が混み合っていて、分析できませんでした",
      );
    }
    if (e instanceof GeminiConfigError || e instanceof FatalAttemptError) {
      console.error(`[analyze] 設定の誤り：${e.message}`);
      return errorResponse(500, "config", "分析の設定に問題があります");
    }
    console.error(
      `[analyze] 予期しないエラー：${e instanceof Error ? e.name : "unknown"}`,
    );
    return errorResponse(500, "internal", "分析できませんでした");
  }
}
