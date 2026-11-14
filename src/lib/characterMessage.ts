// ハカドリの話しかけ（src/prompts/03_character_chat.md、mode: greeting）の入力の組み立てと、返事の確認。
// Node.js のテストから直接読み込むので、ほかのファイルを import しない。

export type RecentDiaryInput = {
  /** 例：11/13 */
  date: string;
  /** 日記の本文（送る前に短くする） */
  text: string;
  scores: { mood: number; energy: number; focus: number; stress: number } | null;
};

export type GreetingInput = {
  /** 例：2026-11-14（土）21:45 */
  now: string;
  grade: string;
  recent: RecentDiaryInput[];
  /** はかどり予報（段階8 まではない） */
  forecast: string | null;
};

/** Gemini に送る日記の本文の長さ（話しかけには先頭だけで足りる） */
export const RECENT_TEXT_LENGTH = 60;
/** 話しかけに使う最近の日記の数 */
export const RECENT_DIARY_COUNT = 3;
/** プロンプトでは 80 字以内と指示している。少し余裕を見て、これを超えたら使わない */
export const MAX_GREETING_LENGTH = 100;

export function shortenDiaryText(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > RECENT_TEXT_LENGTH ? `${oneLine.slice(0, RECENT_TEXT_LENGTH)}…` : oneLine;
}

/** プロンプト③の「入力の形（話しかけの場合）」に合わせる */
export function buildGreetingMessage(input: GreetingInput): string {
  const diaries =
    input.recent.length === 0
      ? ["recent_diaries: なし"]
      : [
          "recent_diaries:",
          ...input.recent.slice(0, RECENT_DIARY_COUNT).map((d) => {
            const s = d.scores;
            const scoreText = s
              ? `（mood ${s.mood}, energy ${s.energy}, focus ${s.focus}, stress ${s.stress}）`
              : "";
            return `- ${d.date}：${shortenDiaryText(d.text)}${scoreText}`;
          }),
        ];
  return [
    "mode: greeting",
    `now: ${input.now}`,
    `grade: ${input.grade}`,
    ...diaries,
    `today_forecast: ${input.forecast ?? "まだなし"}`,
  ].join("\n");
}

/** Gemini の返事を整える。空や長すぎるときは null（決まった話しかけを使う） */
export function normalizeGreeting(text: string | undefined | null): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").replace(/^["「]|["」]$/g, "").trim();
  if (cleaned.length === 0 || cleaned.length > MAX_GREETING_LENGTH) return null;
  return cleaned;
}

/** Gemini が使えないときの、答えやすい話しかけ */
export const FALLBACK_GREETINGS = [
  "今日いちばん笑ったのはいつ？",
  "今日はどんな一日だった？ひとことでも大丈夫だよ。",
  "今日ちょっとでもできたこと、ボクに教えて！",
  "今日いちばん疲れたのはどんなとき？",
  "今日、ちょっとうれしかったことはあった？ピッ",
] as const;

/** 日付ごとに決まった1つを選ぶ（同じ日は同じ話しかけ） */
export function fallbackGreeting(dayKey: string): string {
  let hash = 0;
  for (const ch of dayKey) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_GREETINGS[hash % FALLBACK_GREETINGS.length];
}
