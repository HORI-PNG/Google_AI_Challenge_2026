// ハカドリの表情を、日記の点数から決める。
// Node.js のテストから直接読み込むので、ほかのファイルを import しない。

export type MascotMood = "happy" | "normal" | "worried" | "sleepy" | "cheer";

export type MoodSource = {
  scores: { mood: number; energy: number; focus: number; stress: number };
  concern_level?: "none" | "watch" | "urgent";
};

/**
 * 上から順に当てはまったものにする。
 * つらい気持ち・ストレスが高い・気分が低い → 心配／元気が低い → ねむい／気分が高い → にっこり／集中できそう → おうえん
 */
export function mascotMoodFromScores(source: MoodSource | null): MascotMood {
  if (!source) return "normal";
  const { scores, concern_level } = source;
  if (concern_level === "urgent" || concern_level === "watch") return "worried";
  if (scores.stress >= 70 || scores.mood < 40) return "worried";
  if (scores.energy < 35) return "sleepy";
  if (scores.mood >= 70) return "happy";
  if (scores.focus >= 70) return "cheer";
  return "normal";
}
