"use client";

import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { HomeGlass, HomeNotebook, HomeOffice } from "@/components/home/HomeViews";
import type { HomeViewProps, LatestDiaryState } from "@/components/home/homeTypes";
import { LoginView } from "@/components/home/LoginView";
import { useTheme } from "@/components/ThemeProvider";
import { useGreeting } from "@/components/useGreeting";
import { Loading } from "@/components/ui/Ui";
import { ApiRequestError, analyzeAndSave, getLatestDiary } from "@/lib/diaries";
import type { UserProfile } from "@/lib/userProfile";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatToday(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`;
}

export function HomeScreen() {
  const { state, profile } = useAuth();
  const router = useRouter();

  // 基本情報がまだの人は、先に登録してもらう
  useEffect(() => {
    if (state.status === "signedIn" && profile.status === "missing") {
      router.replace("/welcome");
    }
  }, [state.status, profile.status, router]);

  if (state.status === "signedOut") {
    return <LoginView />;
  }
  if (state.status === "signedIn" && profile.status === "ready") {
    return <SignedInHome user={state.user} profile={profile.profile} />;
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

/** ログイン後のホーム。データを読み込み、テーマの系統に合った見た目で表示する */
function SignedInHome({ user, profile }: { user: User; profile: UserProfile }) {
  const { theme } = useTheme();
  const greeting = useGreeting(user, profile);
  const [today] = useState(() => new Date());
  const [latest, setLatest] = useState<LatestDiaryState>({ status: "loading" });
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLatestDiary(user.uid)
      .then((diary) => {
        if (active) setLatest(diary ? { status: "loaded", diary } : { status: "empty" });
      })
      .catch(() => {
        if (active) setLatest({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [user.uid]);

  async function retry() {
    if (latest.status !== "loaded") return;
    const { diary } = latest;
    setRetrying(true);
    setRetryError(null);
    try {
      const analysis = await analyzeAndSave(
        user,
        { id: diary.id, rawText: diary.rawText, inputType: diary.inputType, writtenAt: diary.createdAt ?? new Date() },
        profile.grade,
      );
      setLatest({ status: "loaded", diary: { ...diary, analysisStatus: "done", analysis } });
    } catch (e) {
      setRetryError(e instanceof ApiRequestError ? e.message : "分析できませんでした");
    } finally {
      setRetrying(false);
    }
  }

  const props: HomeViewProps = {
    dateLabel: formatToday(today),
    nickname: profile.nickname,
    name: profile.name,
    grade: profile.grade,
    email: user.email,
    latest,
    greeting,
    onRetry: () => void retry(),
    retrying,
    retryError,
  };

  // サーバーで描画している間（theme が null）は、手帳の見た目にしておく
  const layout = theme?.layout ?? "notebook";
  if (layout === "glass") return <HomeGlass {...props} />;
  if (layout === "office") return <HomeOffice {...props} />;
  return <HomeNotebook {...props} />;
}
