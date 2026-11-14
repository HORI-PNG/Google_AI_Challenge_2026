import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  forecastSchema,
  PLACES,
  PRODUCTIVITY_VALUES,
  STUDY_TIMES,
  type FeedbackAnswer,
  type FeedbackRecord,
  type Forecast,
  type Place,
  type Productivity,
  type SavedForecast,
  type StudyTime,
} from "@/lib/forecast";

// users/{uid}/feedback/{date} と users/{uid}/forecasts/{date} の読み書き（PLAN.md「データ構造」）。
// date は YYYY-MM-DD。feedback の date は「はかどったか」を答えた対象の日（＝昨日）

function feedbackRef(uid: string) {
  return collection(getDb(), "users", uid, "feedback");
}
function forecastsRef(uid: string) {
  return collection(getDb(), "users", uid, "forecasts");
}

export async function saveFeedback(uid: string, date: string, answer: FeedbackAnswer): Promise<void> {
  await setDoc(doc(feedbackRef(uid), date), {
    productivity: answer.productivity,
    ...(answer.studyTime ? { studyTime: answer.studyTime } : {}),
    ...(answer.place ? { place: answer.place } : {}),
    answeredAt: serverTimestamp(),
  });
}

function toFeedback(date: string, data: Record<string, unknown>): FeedbackRecord | null {
  const p = data.productivity;
  if (!(PRODUCTIVITY_VALUES as readonly unknown[]).includes(p)) return null;
  return {
    date,
    productivity: p as Productivity,
    studyTime: (STUDY_TIMES as readonly unknown[]).includes(data.studyTime) ? (data.studyTime as StudyTime) : null,
    place: (PLACES as readonly unknown[]).includes(data.place) ? (data.place as Place) : null,
  };
}

export async function getFeedback(uid: string, date: string): Promise<FeedbackRecord | null> {
  const snapshot = await getDoc(doc(feedbackRef(uid), date));
  return snapshot.exists() ? toFeedback(date, snapshot.data()) : null;
}

/** since（YYYY-MM-DD）以降の答えを読む（ドキュメントの名前が日付なので、名前の範囲で絞る） */
export async function getFeedbackSince(uid: string, since: string): Promise<FeedbackRecord[]> {
  const snapshot = await getDocs(query(feedbackRef(uid), where(documentId(), ">=", since)));
  return snapshot.docs.flatMap((d) => toFeedback(d.id, d.data()) ?? []);
}

export async function saveForecast(uid: string, saved: SavedForecast): Promise<void> {
  const f = saved.forecast;
  await setDoc(doc(forecastsRef(uid), saved.date), {
    percent: f.percent,
    weather: f.weather,
    dataSufficiency: f.data_sufficiency,
    bestTime: f.best_time,
    places: f.places,
    luckyItem: f.lucky_item,
    studyStyle: f.study_style,
    restAdvice: f.rest_advice,
    message: f.message,
    evidence: f.evidence,
    basedOnDiaryId: saved.basedOnDiaryId,
    model: saved.model,
    createdAt: serverTimestamp(),
  });
}

/** 保存した予報を読む。形が崩れていたら null（作り直す） */
export async function getForecast(uid: string, date: string): Promise<SavedForecast | null> {
  const snapshot = await getDoc(doc(forecastsRef(uid), date));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const parsed = forecastSchema.safeParse({
    percent: data.percent,
    weather: data.weather,
    data_sufficiency: data.dataSufficiency,
    best_time: data.bestTime,
    places: data.places,
    lucky_item: data.luckyItem,
    study_style: data.studyStyle,
    rest_advice: data.restAdvice,
    message: data.message,
    evidence: data.evidence,
  });
  if (!parsed.success || typeof data.basedOnDiaryId !== "string") return null;
  const forecast: Forecast = parsed.data;
  return {
    date,
    forecast,
    basedOnDiaryId: data.basedOnDiaryId,
    model: typeof data.model === "string" ? data.model : "unknown",
  };
}
