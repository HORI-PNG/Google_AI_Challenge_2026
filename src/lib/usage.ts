// Gemini を使える回数（1 人 1 日の上限。段階10）の、計算だけの部分。
// テストから読み込むため、何も import しない

/** 上限の初期値（日記の分析・声の文字起こし・話しかけ・予報を合わせた回数） */
export const DEFAULT_DAILY_LIMIT = 50;

/** 環境変数 GEMINI_DAILY_LIMIT を読む。0 以下・数でないときは初期値 */
export function parseDailyLimit(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
}

/** 日本時間の日付（YYYY-MM-DD）。サーバーは UTC で動くため、9 時間ずらす */
export function jstDateKey(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Firestore の REST API が返す文書から、count と更新時刻を読む */
export function readUsageDocument(json: unknown): { count: number; updateTime: string } | null {
  if (!json || typeof json !== "object") return null;
  const doc = json as { fields?: { count?: { integerValue?: string } }; updateTime?: unknown };
  const count = Number(doc.fields?.count?.integerValue);
  if (!Number.isInteger(count) || count < 0 || typeof doc.updateTime !== "string") return null;
  return { count, updateTime: doc.updateTime };
}

export const DAILY_LIMIT_MESSAGE = "今日 Gemini を使える回数の上限に達しました。明日また使えます。";
