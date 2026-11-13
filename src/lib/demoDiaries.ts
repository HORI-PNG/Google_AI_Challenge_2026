// デモ用の架空の日記（開発中だけ使う）。
// グラフの確認とデモ動画の撮影のため。実在の人の日記は使わない（.agents/rules/privacy.md）。
import {
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { ScoreSet } from "@/lib/moodSeries";

export const DEMO_DAYS = 30;

type DemoTemplate = {
  text: string;
  labels: string[];
  reply: string;
  reason: string;
};

// 気分の高い日・ふつうの日・低い日の架空の日記
const TEMPLATES: Record<"high" | "mid" | "low", DemoTemplate[]> = {
  high: [
    {
      text: "（デモ用の架空の日記）朝から図書館で勉強したら、数学の問題がすらすら解けた。",
      labels: ["達成感", "やる気"],
      reply: "朝の図書館、相性いいみたいだね！その調子♪",
      reason: "勉強がはかどり、達成感がある",
    },
    {
      text: "（デモ用の架空の日記）小テストで満点だった。友だちとお祝いにアイスを食べた。",
      labels: ["喜び", "楽しい"],
      reply: "満点おめでとう！アイスもおいしかったね🍨",
      reason: "テストの結果が良く、気分が高い",
    },
  ],
  mid: [
    {
      text: "（デモ用の架空の日記）授業と部活でふつうの一日。英単語を少し覚えた。",
      labels: ["穏やか"],
      reply: "コツコツ続けててえらいね。",
      reason: "大きな出来事はなく、落ち着いている",
    },
    {
      text: "（デモ用の架空の日記）課題を半分終わらせた。少し眠いけど、まあまあ。",
      labels: ["眠い", "やる気"],
      reply: "半分できたの、ちゃんと前に進んでるよ。",
      reason: "眠気はあるが、課題は進んでいる",
    },
  ],
  low: [
    {
      text: "（デモ用の架空の日記）課題がたまっていて焦った。夜遅くまで起きてしまった。",
      labels: ["焦り", "疲れ"],
      reply: "焦る日もあるよね。今日は早めに休もう。",
      reason: "課題が多く、ストレスが高い",
    },
    {
      text: "（デモ用の架空の日記）友だちとけんかして、勉強が手につかなかった。",
      labels: ["悲しい", "イライラ"],
      reply: "書いてくれてありがとう。ゆっくり休んでね。",
      reason: "人間関係で気持ちが沈んでいる",
    },
  ],
};

/** 毎回同じ並びになる乱数（デモの見た目を固定するため） */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** 1 週間ほどの波がある、架空の点数 */
function demoScores(dayIndex: number, rand: () => number): ScoreSet {
  const wave = Math.sin((dayIndex / 7) * Math.PI * 2);
  const noise = () => (rand() - 0.5) * 16;
  const mood = clamp(58 + wave * 20 + noise());
  return {
    mood,
    energy: clamp(52 + wave * 15 + noise()),
    focus: clamp(55 + wave * 18 + noise()),
    // ストレスは気分とおおむね逆に動く
    stress: clamp(100 - mood - 5 + noise()),
  };
}

/** 今日までの DEMO_DAYS 日分のうち、ところどころ休んだ日を空けて、架空の日記を入れる */
export async function seedDemoDiaries(uid: string, today = new Date()): Promise<number> {
  const db = getDb();
  const batch = writeBatch(db);
  const rand = seededRandom(20261114);
  let count = 0;

  for (let i = 0; i < DEMO_DAYS; i++) {
    // 日記をつけなかった日も作る（グラフの線が途切れる様子を見せるため）
    if (rand() < 0.15) continue;
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DEMO_DAYS - 1 - i), 22, 0);
    const scores = demoScores(i, rand);
    const band = scores.mood >= 65 ? "high" : scores.mood >= 45 ? "mid" : "low";
    const options = TEMPLATES[band];
    const t = options[Math.floor(rand() * options.length)];

    batch.set(doc(collection(db, "users", uid, "diaries")), {
      createdAt: Timestamp.fromDate(day),
      inputType: "text",
      rawText: t.text,
      scores,
      emotionLabels: t.labels,
      learnings: [],
      characterReply: t.reply,
      reason: t.reason,
      confidence: "high",
      concernLevel: "none",
      analysisStatus: "done",
      analyzedModel: "demo",
      isDemo: true,
    });
    count++;
  }
  await batch.commit();
  return count;
}

/** デモ用の日記をすべて消す（isDemo が付いたものだけ） */
export async function deleteDemoDiaries(uid: string): Promise<number> {
  const db = getDb();
  const snapshot = await getDocs(
    query(collection(db, "users", uid, "diaries"), where("isDemo", "==", true)),
  );
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snapshot.size;
}
