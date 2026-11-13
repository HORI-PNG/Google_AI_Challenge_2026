import { z } from "zod";

// src/prompts/01_diary_analysis.md の「出力スキーマ」と同じ形。
// Gemini の返事がこの形になっているかを確かめるのに使う（ブラウザとサーバーの両方で使う）。

export const EMOTION_LABELS = [
  "喜び",
  "楽しい",
  "達成感",
  "やる気",
  "安心",
  "感謝",
  "穏やか",
  "疲れ",
  "眠い",
  "不安",
  "焦り",
  "イライラ",
  "悲しい",
  "落ち込み",
  "退屈",
  "緊張",
  "さみしい",
] as const;

const score = z.number().int().min(0).max(100);

export const diaryAnalysisSchema = z.object({
  scores: z.object({
    mood: score,
    energy: score,
    focus: score,
    stress: score,
  }),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().min(1),
  // プロンプトでは「1〜3個」「最大3つ」と指示している。多く返ってきたときはやり直さず、先頭から3つだけ使う
  emotion_labels: z
    .array(z.enum(EMOTION_LABELS))
    .transform((labels) => labels.slice(0, 3)),
  learnings: z
    .array(z.object({ topic: z.string().min(1), point: z.string().min(1) }))
    .transform((items) => items.slice(0, 3)),
  character_reply: z.string().min(1),
  concern_level: z.enum(["none", "watch", "urgent"]),
});

export type DiaryAnalysis = z.infer<typeof diaryAnalysisSchema>;
export type Scores = DiaryAnalysis["scores"];
export type ConcernLevel = DiaryAnalysis["concern_level"];

/** POST /api/analyze に送る内容 */
export const analyzeRequestSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  inputType: z.literal("text"),
  grade: z.string().min(1).max(20),
  /** 例：2026-11-13（金） */
  date: z.string().min(1).max(30),
  /** 例：22:10 */
  time: z.string().regex(/^\d{1,2}:\d{2}$/),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export type AnalyzeResponse = {
  analysis: DiaryAnalysis;
  model: string;
};
