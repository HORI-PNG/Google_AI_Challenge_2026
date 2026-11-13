"use client";

import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Loading } from "@/components/ui/Ui";
import type { UserProfile } from "@/lib/userProfile";

/**
 * ログインと基本情報の登録が済んでいるときだけ中身を出す。
 * ログアウト中はトップへ、基本情報がまだなら /welcome へ案内する。
 */
export function RequireProfile({
  children,
}: {
  children: (user: User, profile: UserProfile) => ReactNode;
}) {
  const { state, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "signedOut") {
      router.replace("/");
    } else if (state.status === "signedIn" && profile.status === "missing") {
      router.replace("/welcome");
    }
  }, [state.status, profile.status, router]);

  if (state.status === "signedIn" && profile.status === "ready") {
    return children(state.user, profile.profile);
  }
  if (profile.status === "error") {
    return (
      <p role="alert" className="p-6 text-sm text-accent-strong">
        ユーザー情報を読み込めませんでした。再読み込みしてください。
      </p>
    );
  }
  return <Loading />;
}
