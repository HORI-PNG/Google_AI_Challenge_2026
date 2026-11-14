import "server-only";
import { ASK_LIMIT_MESSAGE, DAILY_LIMIT_MESSAGE, jstDateKey, parseDailyLimit, readUsageDocument } from "@/lib/usage";

// Gemini を使える回数を、1 人 1 日の上限で数える（段階10）。
// 公開すると誰でもログインして使えるため、1 人に無料枠を使い切られないようにする。
// 回数は users/{uid}/usage/{日付} に、本人のログイン（ID トークン）で Firestore の REST API から書く。
// セキュリティルールで「1 から始めて 1 ずつしか増やせない」ようにしてあるので、秘密鍵は要らない

export class DailyLimitError extends Error {
  constructor(message: string = DAILY_LIMIT_MESSAGE) {
    super(message);
    this.name = "DailyLimitError";
  }
}

/**
 * 「ハカドリに聞く」の質問を 1 回数える（段階12）。全体の上限とは別に、users/{uid}/usage/{日付}_ask に数える。
 * 全体の上限（consumeGeminiQuota）も別に数える
 */
export async function consumeAskQuota(request: Request, uid: string, limit: number): Promise<void> {
  await consumeQuota(request, uid, `${jstDateKey(new Date())}_ask`, limit, ASK_LIMIT_MESSAGE);
}

const TIMEOUT_MS = 5000;

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

/**
 * 1 回分を数える。上限に達していたら DailyLimitError を投げる。
 * Firestore につながらないときは、アプリが止まらないよう数えずに通す
 */
export async function consumeGeminiQuota(request: Request, uid: string): Promise<void> {
  await consumeQuota(
    request,
    uid,
    jstDateKey(new Date()),
    parseDailyLimit(process.env.GEMINI_DAILY_LIMIT),
    DAILY_LIMIT_MESSAGE,
  );
}

async function consumeQuota(request: Request, uid: string, docId: string, limit: number, message: string): Promise<void> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const token = bearerToken(request);
  if (!projectId || !token) return;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/usage/${encodeURIComponent(docId)}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    // 同時に数えようとしてぶつかったら、読み直してやり直す
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      let next: number;
      let precondition: string;
      if (current.status === 404) {
        next = 1;
        precondition = "currentDocument.exists=false";
      } else if (current.ok) {
        const usage = readUsageDocument(await current.json());
        if (!usage) return;
        if (usage.count >= limit) throw new DailyLimitError(message);
        next = usage.count + 1;
        precondition = `currentDocument.updateTime=${encodeURIComponent(usage.updateTime)}`;
      } else {
        console.error(`[usage] 回数を読めませんでした：${current.status}`);
        return;
      }

      const write = await fetch(`${url}?${precondition}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fields: { count: { integerValue: String(next) } } }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (write.ok) return;
      // 400（FAILED_PRECONDITION）・409：ほかの呼び出しが先に数えた
      if (write.status !== 400 && write.status !== 409) {
        console.error(`[usage] 回数を書けませんでした：${write.status}`);
        return;
      }
    }
  } catch (e) {
    if (e instanceof DailyLimitError) throw e;
    console.error(`[usage] 回数を数えられませんでした：${e instanceof Error ? e.name : "unknown"}`);
  }
}
