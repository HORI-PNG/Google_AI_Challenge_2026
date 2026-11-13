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
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
} from "firebase/firestore";
import {
  diaryAnalysisSchema,
  INPUT_TYPES,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type DiaryAnalysis,
  type InputType,
  type TranscribeResponse,
} from "@/lib/diaryAnalysis";
import { getDb } from "@/lib/firebase";

// users/{uid}/diaries/{diaryId} の読み書き（PLAN.md「データ構造」）

export type AnalysisStatus = "pending" | "done" | "failed";

export type Diary = {
  id: string;
  createdAt: Date | null;
  inputType: InputType;
  rawText: string;
  analysisStatus: AnalysisStatus;
  analysis: DiaryAnalysis | null;
  analyzedModel: string | null;
};

/** 分析に必要な、保存済みの日記の情報 */
export type SavedDiary = {
  id: string;
  rawText: string;
  inputType: InputType;
  writtenAt: Date;
};

function diariesRef(uid: string) {
  return collection(getDb(), "users", uid, "diaries");
}

/** 日記の本文を先に保存する（Gemini が失敗しても本文は必ず残す） */
export async function createDiary(
  uid: string,
  rawText: string,
  inputType: InputType,
): Promise<string> {
  const ref = await addDoc(diariesRef(uid), {
    createdAt: serverTimestamp(),
    inputType,
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

  const inputType: InputType = (INPUT_TYPES as readonly unknown[]).includes(data.inputType)
    ? (data.inputType as InputType)
    : "text";

  return {
    id: snapshot.id,
    createdAt: typeof data.createdAt?.toDate === "function" ? data.createdAt.toDate() : null,
    inputType,
    rawText: typeof data.rawText === "string" ? data.rawText : "",
    analysisStatus: status,
    analysis: parsed?.success ? parsed.data : null,
    analyzedModel: typeof data.analyzedModel === "string" ? data.analyzedModel : null,
  };
}

/** since 以降の日記を、古い順に読む（気分のグラフ用） */
export async function getDiariesSince(uid: string, since: Date): Promise<Diary[]> {
  const snapshot = await getDocs(
    query(
      diariesRef(uid),
      where("createdAt", ">=", Timestamp.fromDate(since)),
      orderBy("createdAt", "asc"),
    ),
  );
  return snapshot.docs.map(toDiary);
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

/** サーバー（/api/analyze、/api/transcribe）から返ったエラー */
export class ApiRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
  }
}

function field(json: unknown, key: string): unknown {
  return json && typeof json === "object" && key in json
    ? (json as Record<string, unknown>)[key]
    : undefined;
}

/** ログインした本人として、サーバーの API を呼ぶ。Gemini はサーバーからだけ呼ぶ */
async function callApi(
  user: User,
  path: string,
  body: BodyInit,
  fallbackMessage: string,
  contentType?: string,
): Promise<unknown> {
  const token = await user.getIdToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  let response: Response;
  try {
    response = await fetch(path, { method: "POST", headers, body });
  } catch {
    throw new ApiRequestError("network", "通信できませんでした。電波の状態を確認してください");
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = field(json, "message");
    const code = field(json, "error");
    throw new ApiRequestError(
      typeof code === "string" ? code : "unknown",
      typeof message === "string" ? message : fallbackMessage,
    );
  }
  return json;
}

export async function requestAnalysis(
  user: User,
  body: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const json = await callApi(
    user,
    "/api/analyze",
    JSON.stringify(body),
    "分析できませんでした",
    "application/json",
  );
  const parsed = diaryAnalysisSchema.safeParse(field(json, "analysis"));
  if (!parsed.success) {
    throw new ApiRequestError("invalid_response", "分析の結果が読めませんでした");
  }
  const model = field(json, "model");
  return { analysis: parsed.data, model: typeof model === "string" ? model : "unknown" };
}

/** 録音を送り、Gemini に文章にしてもらう（音声はサーバーにも残らない） */
export async function requestTranscription(
  user: User,
  audio: Blob,
): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("audio", audio, "diary-audio");
  const json = await callApi(user, "/api/transcribe", form, "文章にできませんでした");
  const text = field(json, "text");
  const model = field(json, "model");
  if (typeof text !== "string" || !text.trim()) {
    throw new ApiRequestError("invalid_response", "文章にできませんでした");
  }
  return { text: text.trim(), model: typeof model === "string" ? model : "unknown" };
}

/**
 * 保存済みの日記を分析し、結果を書き足す。失敗したら "failed" にして例外を投げ直す。
 */
export async function analyzeAndSave(
  user: User,
  diary: SavedDiary,
  grade: string,
): Promise<DiaryAnalysis> {
  const { date, time } = formatDateTime(diary.writtenAt);
  try {
    const { analysis, model } = await requestAnalysis(user, {
      text: diary.rawText,
      inputType: diary.inputType,
      grade,
      date,
      time,
    });
    await saveAnalysis(user.uid, diary.id, analysis, model);
    return analysis;
  } catch (e) {
    await markAnalysisFailed(user.uid, diary.id).catch(() => undefined);
    throw e;
  }
}
