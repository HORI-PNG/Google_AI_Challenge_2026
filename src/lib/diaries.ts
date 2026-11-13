import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
} from "firebase/firestore";
import {
  diaryAnalysisSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type DiaryAnalysis,
} from "@/lib/diaryAnalysis";
import { getDb } from "@/lib/firebase";

// users/{uid}/diaries/{diaryId} の読み書き（PLAN.md「データ構造」）

export type AnalysisStatus = "pending" | "done" | "failed";

export type Diary = {
  id: string;
  createdAt: Date | null;
  inputType: "text";
  rawText: string;
  analysisStatus: AnalysisStatus;
  analysis: DiaryAnalysis | null;
  analyzedModel: string | null;
};

function diariesRef(uid: string) {
  return collection(getDb(), "users", uid, "diaries");
}

/** 日記の本文を先に保存する（Gemini が失敗しても本文は必ず残す） */
export async function createDiary(uid: string, rawText: string): Promise<string> {
  const ref = await addDoc(diariesRef(uid), {
    createdAt: serverTimestamp(),
    inputType: "text",
    rawText,
    analysisStatus: "pending" satisfies AnalysisStatus,
  });
  return ref.id;
}

export async function saveAnalysis(
  uid: string,
  diaryId: string,
  analysis: DiaryAnalysis,
  model: string,
): Promise<void> {
  await updateDoc(doc(diariesRef(uid), diaryId), {
    scores: analysis.scores,
    emotionLabels: analysis.emotion_labels,
    learnings: analysis.learnings,
    characterReply: analysis.character_reply,
    reason: analysis.reason,
    confidence: analysis.confidence,
    concernLevel: analysis.concern_level,
    analysisStatus: "done" satisfies AnalysisStatus,
    analyzedModel: model,
    analyzedAt: serverTimestamp(),
  });
}

export async function markAnalysisFailed(uid: string, diaryId: string): Promise<void> {
  await updateDoc(doc(diariesRef(uid), diaryId), {
    analysisStatus: "failed" satisfies AnalysisStatus,
  });
}

function toDiary(snapshot: DocumentSnapshot): Diary {
  const data = snapshot.data() ?? {};
  const status: AnalysisStatus =
    data.analysisStatus === "done" || data.analysisStatus === "failed"
      ? data.analysisStatus
      : "pending";

  // Firestore のフィールド名（camelCase）を、プロンプトの出力の形に戻して確かめる
  const parsed =
    status === "done"
      ? diaryAnalysisSchema.safeParse({
          scores: data.scores,
          confidence: data.confidence,
          reason: data.reason,
          emotion_labels: data.emotionLabels,
          learnings: data.learnings,
          character_reply: data.characterReply,
          concern_level: data.concernLevel,
        })
      : null;

  return {
    id: snapshot.id,
    createdAt: typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate() : null,
    inputType: "text",
    rawText: typeof data.rawText === "string" ? data.rawText : "",
    analysisStatus: status,
    analysis: parsed?.success ? parsed.data : null,
    analyzedModel: typeof data.analyzedModel === "string" ? data.analyzedModel : null,
  };
}

export async function getLatestDiary(uid: string): Promise<Diary | null> {
  const snapshot = await getDocs(
    query(diariesRef(uid), orderBy("createdAt", "desc"), limit(1)),
  );
  const first = snapshot.docs[0];
  return first ? toDiary(first) : null;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** プロンプトの入力に使う日付（例：2026-11-13（金））と時刻（例：22:10） */
export function formatDateTime(date: Date): { date: string; time: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return {
    date: `${y}-${m}-${d}（${WEEKDAYS[date.getDay()]}）`,
    time: `${hh}:${mm}`,
  };
}

export class AnalyzeRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AnalyzeRequestError";
  }
}

/** サーバー（/api/analyze）に分析を頼む。Gemini はサーバーからだけ呼ぶ */
export async function requestAnalysis(
  user: User,
  body: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const token = await user.getIdToken();
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json && typeof json === "object" && "message" in json && typeof json.message === "string"
        ? json.message
        : "分析できませんでした";
    const code =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : "unknown";
    throw new AnalyzeRequestError(code, message);
  }

  const parsed = diaryAnalysisSchema.safeParse(
    json && typeof json === "object" && "analysis" in json ? json.analysis : null,
  );
  const model =
    json && typeof json === "object" && "model" in json && typeof json.model === "string"
      ? json.model
      : "unknown";
  if (!parsed.success) {
    throw new AnalyzeRequestError("invalid_response", "分析の結果が読めませんでした");
  }
  return { analysis: parsed.data, model };
}

/**
 * 保存済みの日記を分析し、結果を書き足す。失敗したら "failed" にして例外を投げ直す。
 */
export async function analyzeAndSave(
  user: User,
  diaryId: string,
  rawText: string,
  grade: string,
  writtenAt: Date,
): Promise<DiaryAnalysis> {
  const { date, time } = formatDateTime(writtenAt);
  try {
    const { analysis, model } = await requestAnalysis(user, {
      text: rawText,
      inputType: "text",
      grade,
      date,
      time,
    });
    await saveAnalysis(user.uid, diaryId, analysis, model);
    return analysis;
  } catch (e) {
    await markAnalysisFailed(user.uid, diaryId).catch(() => undefined);
    throw e;
  }
}
