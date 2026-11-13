// 項目を選んでつける日記。選んだ内容を、プロンプト①の「項目選択の場合の例」と同じ形の文章にする。
// Node.js のテストから直接読み込むので、ほかのファイルを import しない。

export const MOOD_OPTIONS = [
  "😄 とても良い",
  "🙂 良い",
  "😐 ふつう",
  "😞 いまいち",
  "😢 つらい",
] as const;

export const CONDITION_OPTIONS = [
  "💪 元気",
  "🙂 ふつう",
  "😪 眠い",
  "🥱 疲れた",
  "🤒 体調が悪い",
] as const;

export const EVENT_OPTIONS = [
  "授業",
  "テスト勉強",
  "宿題・課題",
  "塾",
  "部活",
  "研究",
  "バイト",
  "友だちと過ごした",
  "家族と過ごした",
  "家でのんびり",
  "その他",
] as const;

export const NOTE_MAX_LENGTH = 100;

export type SelectDiaryInput = {
  mood: string;
  condition: string;
  events: string[];
  note: string;
};

/**
 * 選んだ内容を、日記の本文（rawText）として保存する文章にする。
 * 例：
 *   気分: 😐 ふつう
 *   体調: 😪 眠い
 *   今日あったこと: 塾、テスト勉強
 *   ひとこと: 英単語あんまり覚えられなかった
 */
export function buildSelectText(input: SelectDiaryInput): string {
  // 選択肢の並び順にそろえる（選んだ順に左右されないように）
  const events = EVENT_OPTIONS.filter((e) => input.events.includes(e));
  const note = input.note.trim().slice(0, NOTE_MAX_LENGTH);
  const lines = [
    `気分: ${input.mood}`,
    `体調: ${input.condition}`,
    `今日あったこと: ${events.length > 0 ? events.join("、") : "とくになし"}`,
  ];
  if (note) {
    lines.push(`ひとこと: ${note}`);
  }
  return lines.join("\n");
}

/** 気分と体調が選ばれているか */
export function isSelectComplete(input: SelectDiaryInput): boolean {
  return (
    (MOOD_OPTIONS as readonly string[]).includes(input.mood) &&
    (CONDITION_OPTIONS as readonly string[]).includes(input.condition)
  );
}
