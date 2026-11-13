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
import { ensureUserProfile } from "@/lib/userProfile";

type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: User };

type AuthContextValue = {
  state: AuthState;
  /** ログインやユーザー情報の準備で起きたエラー（画面に出す文） */
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ユーザーが自分でポップアップを閉じたときは、エラーとして扱わない
const IGNORED_SIGN_IN_ERRORS = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

function toMessage(error: unknown, fallback: string): string {
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
  const [error, setError] = useState<string | null>(firebaseConfigError);

  useEffect(() => {
    if (firebaseConfigError) {
      return;
    }

    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        setState({ status: "signedOut" });
        return;
      }
      setState({ status: "signedIn", user });
      ensureUserProfile(user.uid).catch((e: unknown) => {
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

  const value = useMemo(
    () => ({ state, error, signIn, signOut }),
    [state, error, signIn, signOut],
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
