import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractCodeBlock } from "@/lib/promptFile";

export type PromptDefinition = {
  systemInstruction: string;
  responseJsonSchema: unknown;
};

// 本番（Vercel）にも md を含めるため、next.config.ts の outputFileTracingIncludes に登録してある
const PROMPTS_DIR = path.join(process.cwd(), "src", "prompts");

const cache = new Map<string, Promise<string>>();

/** md を読む（一度読んだら使い回す。失敗したときは次にもう一度読む） */
function readPromptFile(fileName: string): Promise<string> {
  let pending = cache.get(fileName);
  if (!pending) {
    pending = readFile(path.join(PROMPTS_DIR, fileName), "utf8");
    pending.catch(() => cache.delete(fileName));
    cache.set(fileName, pending);
  }
  return pending;
}

async function loadPrompt(fileName: string): Promise<PromptDefinition> {
  const markdown = await readPromptFile(fileName);
  return {
    systemInstruction: extractCodeBlock(markdown, "システム指示"),
    responseJsonSchema: JSON.parse(extractCodeBlock(markdown, "出力スキーマ")),
  };
}

/** プロンプト③：キャラクター（ハカドリ）。文章で返すので、システム指示だけを使う */
export async function getCharacterPrompt(): Promise<{ systemInstruction: string }> {
  const markdown = await readPromptFile("03_character_chat.md");
  return { systemInstruction: extractCodeBlock(markdown, "システム指示") };
}

/** プロンプト①：日記の分析 */
export function getDiaryAnalysisPrompt(): Promise<PromptDefinition> {
  return loadPrompt("01_diary_analysis.md");
}

/** プロンプト④：声の日記の書き起こし（音声といっしょに送る文も md から読む） */
export async function getVoiceTranscriptionPrompt(): Promise<
  PromptDefinition & { userMessage: string }
> {
  const fileName = "04_voice_transcription.md";
  const prompt = await loadPrompt(fileName);
  const markdown = await readPromptFile(fileName);
  return { ...prompt, userMessage: extractCodeBlock(markdown, "入力の形") };
}
