import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";

/** PLAN.md「データ構造」の users/{uid}.settings */
export type UserSettings = {
  themeId: string;
  characterId: string;
  locationEnabled: boolean;
};

export const DEFAULT_SETTINGS: UserSettings = {
  // src/lib/themes.ts の DEFAULT_THEME_ID と同じ
  themeId: "kotori",
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

const userSettingsSchema = z.object({
  themeId: z.string().catch(DEFAULT_SETTINGS.themeId),
  characterId: z.string().catch(DEFAULT_SETTINGS.characterId),
  locationEnabled: z.boolean().catch(DEFAULT_SETTINGS.locationEnabled),
});

/**
 * users/{uid} を読み、なければ設定の初期値で作る。
 * 基本情報（profile）がまだ登録されていなければ profile は null。
 */
export async function loadOrCreateUser(
  uid: string,
): Promise<{ profile: UserProfile | null; settings: UserSettings }> {
  const ref = doc(getDb(), "users", uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      settings: DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
    });
    return { profile: null, settings: DEFAULT_SETTINGS };
  }
  const profile = userProfileSchema.safeParse(snapshot.get("profile"));
  const settings = userSettingsSchema.safeParse(snapshot.get("settings") ?? {});
  return {
    profile: profile.success ? profile.data : null,
    settings: settings.success ? settings.data : DEFAULT_SETTINGS,
  };
}

/** UI テーマを保存する（PLAN.md「データ構造」の settings.themeId） */
export async function saveThemeId(uid: string, themeId: string): Promise<void> {
  await updateDoc(doc(getDb(), "users", uid), { "settings.themeId": themeId });
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
