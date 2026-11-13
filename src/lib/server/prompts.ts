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

let diaryAnalysisPrompt: Promise<PromptDefinition> | null = null;

async function loadPrompt(fileName: string): Promise<PromptDefinition> {
  const markdown = await readFile(path.join(PROMPTS_DIR, fileName), "utf8");
  return {
    systemInstruction: extractCodeBlock(markdown, "システム指示"),
    responseJsonSchema: JSON.parse(extractCodeBlock(markdown, "出力スキーマ")),
  };
}

/** プロンプト①：日記の分析（一度読んだら使い回す） */
export function getDiaryAnalysisPrompt(): Promise<PromptDefinition> {
  diaryAnalysisPrompt ??= loadPrompt("01_diary_analysis.md").catch((e) => {
    diaryAnalysisPrompt = null;
    throw e;
  });
  return diaryAnalysisPrompt;
}
