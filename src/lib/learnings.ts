import { arrayUnion, collection, doc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { getDiariesSince } from "@/lib/diaries";
import { getDb } from "@/lib/firebase";
import { startOfDay } from "@/lib/forecast";
import {
  LEARNING_DAYS,
  learningId,
  stabilityAfter,
  type LearningItem,
  type ReviewEvent,
  type ReviewResult,
} from "@/lib/forgetting";

// 学んだことと、その復習の記録（段階13）。
// 学んだことそのものは日記の分析（diaries/{id}.learnings）にあり、復習の記録だけを
// users/{uid}/learnings/{diaryId}_{番号} に保存する（PLAN.md「データ構造」）

function learningsRef(uid: string) {
  return collection(getDb(), "users", uid, "learnings");
}

function toReviews(value: unknown): ReviewEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const { at, result } = r as { at?: unknown; result?: unknown };
    if (!(at instanceof Timestamp) || (result !== "remembered" && result !== "forgot")) return [];
    return [{ at: at.toDate(), result }];
  });
}

/** 最近 LEARNING_DAYS 日の日記から学んだことを集め、復習の記録を合わせる */
export async function loadLearnings(uid: string, now: Date): Promise<LearningItem[]> {
  const [diaries, reviewDocs] = await Promise.all([
    getDiariesSince(uid, startOfDay(now, LEARNING_DAYS)),
    getDocs(learningsRef(uid)),
  ]);
  const reviews = new Map(reviewDocs.docs.map((d) => [d.id, toReviews(d.get("reviews"))]));
  return diaries.flatMap((d) => {
    if (d.analysisStatus !== "done" || !d.analysis || !d.createdAt) return [];
    const learnedAt = d.createdAt;
    return d.analysis.learnings.map((l, i) => {
      const id = learningId(d.id, i);
      return { id, diaryId: d.id, topic: l.topic, point: l.point, learnedAt, reviews: reviews.get(id) ?? [] };
    });
  });
}

/** 復習の結果を保存する。保存した後の記録を返す */
export async function saveReview(uid: string, item: LearningItem, result: ReviewResult, at: Date): Promise<LearningItem> {
  const reviews = [...item.reviews, { at, result }];
  await setDoc(
    doc(learningsRef(uid), item.id),
    {
      diaryId: item.diaryId,
      topic: item.topic,
      point: item.point,
      reviews: arrayUnion({ at: Timestamp.fromDate(at), result }),
      stability: stabilityAfter(reviews),
    },
    { merge: true },
  );
  return { ...item, reviews };
}
