import { MAX_AUDIO_BYTES, normalizeAudioMimeType } from "@/lib/audio";
import { transcriptionSchema, type TranscribeResponse } from "@/lib/diaryAnalysis";
import { AllAttemptsFailedError, FatalAttemptError } from "@/lib/retry";
import { GeminiConfigError, generateJson } from "@/lib/server/gemini";
import { getVoiceTranscriptionPrompt } from "@/lib/server/prompts";
import { UnauthorizedError, verifyRequestUser } from "@/lib/server/verifyIdToken";

// 声の日記を、Gemini に音声のまま渡して文章にする（.agents/rules/gemini.md）。
// 音声はどこにも保存しない（.agents/rules/privacy.md）。

export const maxDuration = 150;

/** プロンプト④の推奨値（src/prompts/04_voice_transcription.md） */
const TEMPERATURE = 0.1;

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

  // 大きすぎる音声は、中身を読む前に断る
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return errorResponse(413, "too_large", "録音が長すぎます。3分以内で話してください");
  }

  let audio: File;
  try {
    const form = await request.formData();
    const value = form.get("audio");
    if (!(value instanceof File)) {
      return errorResponse(400, "bad_request", "録音が送られていません");
    }
    audio = value;
  } catch {
    return errorResponse(400, "bad_request", "録音が読めませんでした");
  }

  if (audio.size === 0) {
    return errorResponse(400, "bad_request", "録音が空でした");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return errorResponse(413, "too_large", "録音が長すぎます。3分以内で話してください");
  }
  const mimeType = normalizeAudioMimeType(audio.type);
  if (!mimeType) {
    return errorResponse(415, "unsupported", "このブラウザの録音形式には対応していません");
  }

  try {
    const prompt = await getVoiceTranscriptionPrompt();
    const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const result = await generateJson({
      systemInstruction: prompt.systemInstruction,
      responseJsonSchema: prompt.responseJsonSchema,
      temperature: TEMPERATURE,
      userMessage: prompt.userMessage,
      file: { mimeType, data },
      schema: transcriptionSchema,
    });

    if (!result.data.text) {
      return errorResponse(
        422,
        "no_speech",
        "声が聞き取れませんでした。もう少しマイクに近づいて話してみてね",
      );
    }
    const response: TranscribeResponse = { text: result.data.text, model: result.model };
    return Response.json(response);
  } catch (e) {
    if (e instanceof AllAttemptsFailedError) {
      return errorResponse(
        503,
        "transcription_failed",
        "Gemini が混み合っていて、文章にできませんでした",
      );
    }
    if (e instanceof GeminiConfigError || e instanceof FatalAttemptError) {
      console.error(`[transcribe] 設定の誤り：${e.message}`);
      return errorResponse(500, "config", "文字起こしの設定に問題があります");
    }
    console.error(
      `[transcribe] 予期しないエラー：${e instanceof Error ? e.name : "unknown"}`,
    );
    return errorResponse(500, "internal", "文章にできませんでした");
  }
}
