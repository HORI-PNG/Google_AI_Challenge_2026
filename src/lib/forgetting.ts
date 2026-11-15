import { z } from "zod";

// 忘却曲線（段階13）の計算と、復習クイズの形。
// 記憶の残りは、エビングハウスの忘却曲線の形 R = e^(-t / S) で見積もる（t：最後に学んだ・復習した日からの日数、S：安定度）。
// 復習で「思い出せた」なら S を GROWTH 倍、「忘れてた」なら最初の値に戻す（復習するほど忘れにくくなる）。
// 数字は目安。テストから読み込むため、zod 以外は import しない

export const INITIAL_STABILITY = 1;
export const GROWTH = 2.5;
/** 記憶の残りがこれを下回ったら「復習のタイミング」 */
export const REVIEW_THRESHOLD = 0.5;
/** 材料にする日記の日数 */
export const LEARNING_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewResult = "remembered" | "forgot";
export type ReviewEvent = { at: Date; result: ReviewResult };

export type LearningItem = {
  /** {diaryId}_{番号} */
  id: string;
  diaryId: string;
  topic: string;
  point: string;
  learnedAt: Date;
  reviews: ReviewEvent[];
};

export function learningId(diaryId: string, index: number): string {
  return `${diaryId}_${index}`;
}

function sortedReviews(reviews: ReviewEvent[]): ReviewEvent[] {
  return [...reviews].sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** 復習のあとの安定度（日） */
export function stabilityAfter(reviews: ReviewEvent[]): number {
  let s = INITIAL_STABILITY;
  for (const r of sortedReviews(reviews)) {
    s = r.result === "remembered" ? s * GROWTH : INITIAL_STABILITY;
  }
  return s;
}

/** 最後に学んだ・復習した時刻 */
function anchorOf(item: Pick<LearningItem, "learnedAt" | "reviews">): Date {
  const last = sortedReviews(item.reviews).at(-1);
  return last ? last.at : item.learnedAt;
}

/** 今の記憶の残り（0〜1） */
export function retention(item: Pick<LearningItem, "learnedAt" | "reviews">, now: Date): number {
  const days = Math.max(0, (now.getTime() - anchorOf(item).getTime()) / DAY_MS);
  return Math.exp(-days / stabilityAfter(item.reviews));
}

/** 記憶の残りが REVIEW_THRESHOLD になる日時（次の復習のめやす） */
export function nextReviewAt(item: Pick<LearningItem, "learnedAt" | "reviews">): Date {
  const s = stabilityAfter(item.reviews);
  return new Date(anchorOf(item).getTime() + s * Math.log(1 / REVIEW_THRESHOLD) * DAY_MS);
}

export function isDue(item: Pick<LearningItem, "learnedAt" | "reviews">, now: Date): boolean {
  return retention(item, now) < REVIEW_THRESHOLD;
}

/** 記憶の残りが少ない順（同じなら新しく学んだ順） */
export function sortForReview<T extends LearningItem>(items: T[], now: Date): T[] {
  return [...items].sort(
    (a, b) => retention(a, now) - retention(b, now) || b.learnedAt.getTime() - a.learnedAt.getTime(),
  );
}

/**
 * グラフ用の点（学んだ日からの日数と記憶の残り）。復習した日は、下がった点と戻った点の 2 つを置く
 * （曲線が復習で「戻る」形になる）。now のあとも future 日だけ先まで描く
 */
export function curvePoints(
  item: Pick<LearningItem, "learnedAt" | "reviews">,
  now: Date,
  future = 7,
  step = 0.25,
): { day: number; value: number }[] {
  const start = item.learnedAt.getTime();
  const reviews = sortedReviews(item.reviews).filter((r) => r.at.getTime() >= start);
  const endDay = (now.getTime() - start) / DAY_MS + future;
  const points: { day: number; value: number }[] = [];
  let anchorDay = 0;
  let s = INITIAL_STABILITY;
  const value = (day: number) => Math.exp(-(day - anchorDay) / s);
  for (const r of reviews) {
    const rDay = (r.at.getTime() - start) / DAY_MS;
    for (let d = anchorDay; d < rDay; d += step) points.push({ day: d, value: value(d) });
    points.push({ day: rDay, value: value(rDay) });
    s = r.result === "remembered" ? s * GROWTH : INITIAL_STABILITY;
    anchorDay = rDay;
    points.push({ day: rDay, value: 1 });
  }
  for (let d = anchorDay + step; d <= endDay; d += step) points.push({ day: d, value: value(d) });
  return points;
}

/** 「3 日前」「今日」のような言い方 */
export function daysAgoLabel(date: Date, now: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / DAY_MS);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  return `${days} 日前`;
}

// --- 復習クイズ（プロンプト⑤ src/prompts/05_review_quiz.md） ---

export const quizRequestSchema = z.object({
  grade: z.string().min(1).max(20),
  topic: z.string().trim().min(1).max(60),
  point: z.string().trim().min(1).max(200),
});
export type QuizRequest = z.infer<typeof quizRequestSchema>;

export const quizSchema = z.object({
  question: z.string().trim().min(1).max(120),
  answer: z.string().trim().min(1).max(160),
  hint: z.string().trim().max(60),
});
export type Quiz = z.infer<typeof quizSchema>;

/** プロンプト⑤の「入力の形」に合わせる */
export function buildQuizMessage(req: QuizRequest): string {
  return [`grade: ${req.grade}`, `topic: ${req.topic}`, `point: ${req.point}`].join("\n");
}
