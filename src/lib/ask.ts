import { z } from "zod";

// 「ハカドリに聞く」（自分専用 AI への質問。段階12）の入力の形と、Gemini への文の組み立て。
// プロンプト③（src/prompts/03_character_chat.md）の mode: chat を使う。
// テストから読み込むため、zod 以外は import しない

/** 材料にする日記の日数 */
export const ASK_HISTORY_DAYS = 14;
/** 1 日分の本文の長さ（要点だけ送る） */
export const ASK_TEXT_LENGTH = 200;
/** 質問の長さ */
export const MAX_QUESTION_LENGTH = 200;
/** Gemini に渡す、直前の会話の数（質問と答えを合わせて） */
export const MAX_HISTORY_TURNS = 6;
/** プロンプトでは 150 字以内と指示している。少し余裕を見て、これを超えたら使わない */
export const MAX_ANSWER_LENGTH = 220;
/** 1 人 1 日の質問の上限（全体の上限 GEMINI_DAILY_LIMIT とは別に数える） */
export const ASK_DAILY_LIMIT = 10;

export const SUGGESTED_QUESTIONS = [
  "先週の自分はどうだった？",
  "今日は何をするのがおすすめ？",
  "はかどった日の共通点は？",
  "最近、元気がない日はどんな日？",
] as const;

const score = z.number().int().min(0).max(100);

export const askDiarySchema = z.object({
  /** 例：11/13（金） */
  date: z.string().min(1).max(12),
  text: z.string().max(ASK_TEXT_LENGTH + 1),
  scores: z.object({ mood: score, energy: score, focus: score, stress: score }).nullable(),
  labels: z.array(z.string().max(20)).max(6),
  /** 「はかどった？」の答え（1〜3） */
  productivity: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
});
export type AskDiary = z.infer<typeof askDiarySchema>;

export const askTurnSchema = z.object({
  role: z.enum(["user", "hakadori"]),
  text: z.string().min(1).max(MAX_ANSWER_LENGTH + MAX_QUESTION_LENGTH),
});
export type AskTurn = z.infer<typeof askTurnSchema>;

export const askRequestSchema = z.object({
  /** 例：2026-11-14（土）21:45 */
  now: z.string().min(1).max(40),
  grade: z.string().min(1).max(20),
  diaries: z.array(askDiarySchema).max(ASK_HISTORY_DAYS * 3),
  forecast: z.string().max(200).nullable(),
  history: z.array(askTurnSchema).max(MAX_HISTORY_TURNS),
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});
export type AskRequest = z.infer<typeof askRequestSchema>;

/** 本文を 1 行にして、要点（先頭 200 字）だけにする */
export function shortenForAsk(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > ASK_TEXT_LENGTH ? `${oneLine.slice(0, ASK_TEXT_LENGTH)}…` : oneLine;
}

const PRODUCTIVITY_WORDS = { 1: "はかどらなかった", 2: "ふつう", 3: "はかどった" } as const;

/** プロンプト③の「入力の形（質問の場合）」に合わせる */
export function buildAskMessage(input: AskRequest): string {
  const diaries =
    input.diaries.length === 0
      ? ["recent_diaries: なし"]
      : [
          "recent_diaries:",
          ...input.diaries.map((d) => {
            const parts: string[] = [];
            if (d.scores) {
              const s = d.scores;
              parts.push(`mood ${s.mood}, energy ${s.energy}, focus ${s.focus}, stress ${s.stress}`);
            }
            if (d.labels.length > 0) parts.push(`気持ち：${d.labels.join("・")}`);
            if (d.productivity) parts.push(`はかどった？：${PRODUCTIVITY_WORDS[d.productivity]}`);
            const meta = parts.length > 0 ? `（${parts.join("／")}）` : "";
            return `- ${d.date}：${d.text}${meta}`;
          }),
        ];
  const history = input.history.slice(-MAX_HISTORY_TURNS).map((t) => `${t.role === "user" ? "user" : "hakadori"}: ${t.text}`);
  return [
    "mode: chat",
    `now: ${input.now}`,
    `grade: ${input.grade}`,
    ...diaries,
    `today_forecast: ${input.forecast ?? "まだなし"}`,
    ...(history.length > 0 ? ["conversation:", ...history] : []),
    `user: ${input.question}`,
  ].join("\n");
}

/** Gemini の答えを整える。空や長すぎるときは null（やり直す） */
export function normalizeAnswer(text: string | undefined | null): string | null {
  if (!text) return null;
  const cleaned = text
    .trim()
    .replace(/^(hakadori|ハカドリ)\s*[:：]\s*/i, "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (cleaned.length === 0 || cleaned.length > MAX_ANSWER_LENGTH) return null;
  return cleaned;
}
