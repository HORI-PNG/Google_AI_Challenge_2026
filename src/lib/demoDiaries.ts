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
import { dateKey, type Place, type Productivity, type StudyTime } from "@/lib/forecast";
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

/**
 * 架空の「学んだこと」（段階13 の忘却曲線を見せるため）。何日前の日記に入れるかと、復習の記録。
 * 復習の日は「学んだ日から何日後か」
 */
const DEMO_LEARNINGS: {
  daysAgo: number;
  note: string;
  learning: { topic: string; point: string };
  reviews: { afterDays: number; result: "remembered" | "forgot" }[];
}[] = [
  {
    daysAgo: 12,
    note: "平方完成のコツが分かった。",
    learning: { topic: "平方完成", point: "x²+6x は (x+3)²−9。x の係数の半分を 2 乗して引く" },
    reviews: [
      { afterDays: 1, result: "remembered" },
      { afterDays: 4, result: "remembered" },
    ],
  },
  {
    daysAgo: 8,
    note: "英単語 abandon を覚えた。",
    learning: { topic: "英単語 abandon", point: "abandon は「捨てる・あきらめる」。名詞は abandonment" },
    reviews: [{ afterDays: 2, result: "forgot" }],
  },
  {
    daysAgo: 5,
    note: "化学で 1 mol の意味がやっと分かった。",
    learning: { topic: "物質量（mol）", point: "1 mol は粒子 6.0×10²³ 個の集まり。質量は分子量に g を付けた値" },
    reviews: [],
  },
  {
    daysAgo: 3,
    note: "古文の「いと」は「とても」と習った。",
    learning: { topic: "古文の「いと」", point: "「いと」は「とても・たいそう」。「いとをかし」＝とても趣がある" },
    reviews: [],
  },
  {
    daysAgo: 1,
    note: "歴史で鎌倉幕府の成立を覚え直した。",
    learning: { topic: "鎌倉幕府の成立", point: "1185 年に守護・地頭を設置。1192 年に源頼朝が征夷大将軍に" },
    reviews: [],
  },
];

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

/**
 * 架空の「はかどった？」の答え。集中・元気が高く、ストレスが低い日ほど、はかどったことにする。
 * はかどった日は朝の図書館やカフェ、はかどらなかった日は夜の家、という傾向をつける（予報の根拠を見せるため）
 */
function demoFeedback(scores: ScoreSet, rand: () => number): { productivity: Productivity; studyTime: StudyTime; place: Place } {
  const index = scores.focus * 0.4 + scores.energy * 0.3 + (100 - scores.stress) * 0.3 + (rand() - 0.5) * 10;
  const productivity: Productivity = index >= 60 ? 3 : index >= 45 ? 2 : 1;
  const r = rand();
  if (productivity === 3) {
    return { productivity, studyTime: r < 0.7 ? "morning" : "noon", place: r < 0.55 ? "library" : r < 0.8 ? "cafe" : "home" };
  }
  if (productivity === 1) {
    return { productivity, studyTime: r < 0.7 ? "night" : "evening", place: r < 0.75 ? "home" : "school" };
  }
  return { productivity, studyTime: r < 0.5 ? "evening" : "noon", place: r < 0.5 ? "school" : "home" };
}

/**
 * 今日までの DEMO_DAYS 日分のうち、ところどころ休んだ日を空けて、架空の日記を入れる。
 * 「はかどった？」の答えも入れる（予報が「記録が十分」の状態になる）。
 * ただし昨日の分は答えずに残す（デモで「昨日ははかどった？」に答える場面を撮るため）
 */
export async function seedDemoDiaries(uid: string, today = new Date()): Promise<number> {
  const db = getDb();
  const batch = writeBatch(db);
  const rand = seededRandom(20261114);
  let count = 0;

  for (let i = 0; i < DEMO_DAYS; i++) {
    const daysAgo = DEMO_DAYS - 1 - i;
    const demoLearning = DEMO_LEARNINGS.find((l) => l.daysAgo === daysAgo);
    // 日記をつけなかった日も作る（グラフの線が途切れる様子を見せるため）。昨日と今日、学んだことの日は必ず書いたことにする
    if (rand() < 0.15 && daysAgo > 1 && !demoLearning) continue;
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DEMO_DAYS - 1 - i), 22, 0);
    const scores = demoScores(i, rand);
    const band = scores.mood >= 65 ? "high" : scores.mood >= 45 ? "mid" : "low";
    const options = TEMPLATES[band];
    const t = options[Math.floor(rand() * options.length)];

    if (daysAgo >= 2) {
      batch.set(doc(db, "users", uid, "feedback", dateKey(day)), {
        ...demoFeedback(scores, rand),
        answeredAt: Timestamp.fromDate(new Date(day.getTime() + 11 * 60 * 60 * 1000)),
        isDemo: true,
      });
    }

    const diaryRef = doc(collection(db, "users", uid, "diaries"));
    if (demoLearning) {
      const reviews = demoLearning.reviews.map((r) => ({
        at: Timestamp.fromDate(new Date(day.getTime() + r.afterDays * 24 * 60 * 60 * 1000)),
        result: r.result,
      }));
      if (reviews.length > 0) {
        // 復習の記録（learnings/{diaryId}_{番号}。src/lib/learnings.ts と同じ形）
        batch.set(doc(db, "users", uid, "learnings", `${diaryRef.id}_0`), {
          diaryId: diaryRef.id,
          ...demoLearning.learning,
          reviews,
          isDemo: true,
        });
      }
    }
    batch.set(diaryRef, {
      createdAt: Timestamp.fromDate(day),
      inputType: "text",
      rawText: demoLearning ? `${t.text}${demoLearning.note}` : t.text,
      scores,
      emotionLabels: t.labels,
      learnings: demoLearning ? [demoLearning.learning] : [],
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

/** デモ用の日記と「はかどった？」の答え、復習の記録をすべて消す（isDemo が付いたものだけ） */
export async function deleteDemoDiaries(uid: string): Promise<number> {
  const db = getDb();
  const [diaries, feedback, learnings] = await Promise.all(
    ["diaries", "feedback", "learnings"].map((name) =>
      getDocs(query(collection(db, "users", uid, name), where("isDemo", "==", true))),
    ),
  );
  const batch = writeBatch(db);
  [...diaries.docs, ...feedback.docs, ...learnings.docs].forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return diaries.size;
}
