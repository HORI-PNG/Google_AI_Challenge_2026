import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";

/** PLAN.md「データ構造」の users/{uid}.settings */
export type UserSettings = {
  themeId: string;
  characterId: string;
  locationEnabled: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  themeId: "default",
  characterId: "default",
  // 位置情報の記録は任意で、初期設定ではオフ（.agents/rules/privacy.md）
  locationEnabled: false,
};

export const GRADES = [
  "中学1年",
  "中学2年",
  "中学3年",
  "高校1年",
  "高校2年",
  "高校3年",
  "大学1年",
  "大学2年",
  "大学3年",
  "大学4年",
  "大学院（修士）",
  "大学院（博士）",
  "その他",
] as const;

/** PLAN.md「データ構造」の users/{uid}.profile（初回に登録してもらう基本情報） */
export const userProfileSchema = z.object({
  name: z.string().trim().min(1, "名前を入れてください").max(50, "名前は50文字以内にしてください"),
  nickname: z
    .string()
    .trim()
    .min(1, "ニックネームを入れてください")
    .max(20, "ニックネームは20文字以内にしてください"),
  grade: z.enum(GRADES, { message: "学年を選んでください" }),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * users/{uid} を読み、なければ設定の初期値で作る。
 * 基本情報（profile）がまだ登録されていなければ null を返す。
 */
export async function loadOrCreateUser(
  uid: string,
): Promise<{ profile: UserProfile | null }> {
  const ref = doc(getDb(), "users", uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      settings: DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
    });
    return { profile: null };
  }
  const parsed = userProfileSchema.safeParse(snapshot.get("profile"));
  return { profile: parsed.success ? parsed.data : null };
}

export async function saveUserProfile(
  uid: string,
  profile: UserProfile,
): Promise<UserProfile> {
  const valid = userProfileSchema.parse(profile);
  await setDoc(
    doc(getDb(), "users", uid),
    { profile: valid, profileUpdatedAt: serverTimestamp() },
    { merge: true },
  );
  return valid;
}
