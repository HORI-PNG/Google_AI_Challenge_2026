import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
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

/**
 * 初めてログインした人の users/{uid} を作る。すでにあれば何もしない。
 * 名前やメールアドレスは Firebase Authentication が持っているので、Firestore には保存しない。
 */
export async function ensureUserProfile(uid: string): Promise<void> {
  const ref = doc(getDb(), "users", uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return;
  }
  await setDoc(ref, {
    settings: DEFAULT_SETTINGS,
    createdAt: serverTimestamp(),
  });
}
