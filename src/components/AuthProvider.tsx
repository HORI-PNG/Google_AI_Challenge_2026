"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { firebaseConfigError, getFirebaseAuth } from "@/lib/firebase";
import {
  loadOrCreateUser,
  saveUserProfile,
  type UserProfile,
  type UserSettings,
} from "@/lib/userProfile";

type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: User };

/** 基本情報（名前・ニックネーム・学年）の読み込み状態 */
export type ProfileState =
  | { status: "loading" }
  /** まだ登録していない（初回） */
  | { status: "missing" }
  | { status: "ready"; profile: UserProfile }
  | { status: "error" };

type AuthContextValue = {
  state: AuthState;
  profile: ProfileState;
  /** users/{uid}.settings（ログインして読み込むまでは null） */
  settings: UserSettings | null;
  /** ログインやユーザー情報の準備で起きたエラー（画面に出す文） */
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ユーザーが自分でポップアップを閉じたときは、エラーとして扱わない
const IGNORED_SIGN_IN_ERRORS = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

export function toMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/popup-blocked") {
      return "ポップアップがブロックされました。ブラウザの設定でこのサイトのポップアップを許可してください。";
    }
    if (error.code === "permission-denied") {
      return "データの保存が許可されませんでした。Firestore のセキュリティルールを確認してください。";
    }
    return `${fallback}（${error.code}）`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // 設定が足りないときは、最初からログアウト状態にしてエラーを出す
  const [state, setState] = useState<AuthState>(
    firebaseConfigError ? { status: "signedOut" } : { status: "loading" },
  );
  const [profile, setProfile] = useState<ProfileState>({ status: "loading" });
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [error, setError] = useState<string | null>(firebaseConfigError);

  useEffect(() => {
    if (firebaseConfigError) {
      return;
    }

    let currentUid: string | null = null;
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      currentUid = user?.uid ?? null;
      if (!user) {
        setState({ status: "signedOut" });
        setProfile({ status: "loading" });
        setSettings(null);
        return;
      }
      setState({ status: "signedIn", user });
      setProfile({ status: "loading" });
      loadOrCreateUser(user.uid)
        .then(({ profile, settings }) => {
          // 読み込み中に別のユーザーに切り替わっていたら、結果を捨てる
          if (currentUid !== user.uid) return;
          setSettings(settings);
          setProfile(profile ? { status: "ready", profile } : { status: "missing" });
        })
        .catch((e: unknown) => {
          if (currentUid !== user.uid) return;
          setProfile({ status: "error" });
          setError(toMessage(e, "ユーザー情報を準備できませんでした"));
        });
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (e) {
      if (e instanceof FirebaseError && IGNORED_SIGN_IN_ERRORS.has(e.code)) {
        return;
      }
      setError(toMessage(e, "ログインできませんでした"));
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(getFirebaseAuth());
    } catch (e) {
      setError(toMessage(e, "ログアウトできませんでした"));
    }
  }, []);

  const updateProfile = useCallback(
    async (next: UserProfile) => {
      if (state.status !== "signedIn") {
        throw new Error("ログインしてから登録してください");
      }
      const saved = await saveUserProfile(state.user.uid, next);
      setProfile({ status: "ready", profile: saved });
    },
    [state],
  );

  const value = useMemo(
    () => ({ state, profile, settings, error, signIn, signOut, updateProfile }),
    [state, profile, settings, error, signIn, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth は AuthProvider の中で使ってください");
  }
  return value;
}
