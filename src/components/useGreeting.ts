"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { fallbackGreeting, RECENT_DIARY_COUNT } from "@/lib/characterMessage";
import { formatDateTime, getRecentDiaries, requestGreeting } from "@/lib/diaries";
import { mascotMoodFromScores, type MascotMood } from "@/lib/mascotMood";
import type { UserProfile } from "@/lib/userProfile";

export type GreetingState = {
  /** 話しかけ（読み込み中は null。画面では仮の話しかけを出す） */
  text: string | null;
  /** 最新の日記の点数から決めた表情 */
  mood: MascotMood;
};

const CACHE_PREFIX = "renote-greeting";

function readCache(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCache(key: string, text: string) {
  try {
    window.sessionStorage.setItem(key, text);
  } catch {
    // 保存できなくても表示はする
  }
}

/**
 * ハカドリの話しかけと表情。
 * Gemini の回数を節約するため、同じ日・同じ最新の日記なら、ブラウザのタブを閉じるまで使い回す
 */
export function useGreeting(user: User, profile: UserProfile): GreetingState {
  const [state, setState] = useState<GreetingState>({ text: null, mood: "normal" });

  useEffect(() => {
    let active = true;
    const now = new Date();
    const { date, time } = formatDateTime(now);

    (async () => {
      let diaries: Awaited<ReturnType<typeof getRecentDiaries>> = [];
      try {
        diaries = await getRecentDiaries(user.uid, RECENT_DIARY_COUNT);
      } catch {
        // 読めなくても、決まった話しかけは出す
      }
      const latest = diaries[0];
      const mood = mascotMoodFromScores(latest?.analysis ?? null);
      const cacheKey = `${CACHE_PREFIX}:${user.uid}:${date}:${latest?.id ?? "none"}`;

      const cached = readCache(cacheKey);
      if (cached) {
        if (active) setState({ text: cached, mood });
        return;
      }
      if (active) setState((prev) => ({ ...prev, mood }));

      let text: string;
      try {
        text = await requestGreeting(user, {
          now: `${date}${time}`,
          grade: profile.grade,
          recent: diaries.map((d) => ({
            date: d.createdAt ? `${d.createdAt.getMonth() + 1}/${d.createdAt.getDate()}` : "",
            text: d.rawText,
            scores: d.analysis?.scores ?? null,
          })),
        });
        writeCache(cacheKey, text);
      } catch {
        text = fallbackGreeting(date);
      }
      if (active) setState({ text, mood });
    })();

    return () => {
      active = false;
    };
  }, [user, profile.grade]);

  return state;
}
