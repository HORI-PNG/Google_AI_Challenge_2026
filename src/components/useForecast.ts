"use client";

import type { User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, formatDateTime, getDiariesSince, requestForecast } from "@/lib/diaries";
import { getFeedbackSince, getForecast, saveFeedback, saveForecast } from "@/lib/feedback";
import {
  buildHistory,
  dateKey,
  describeForecast,
  FEEDBACK_THANKS,
  HISTORY_DAYS,
  needsNewForecast,
  NO_SOURCE,
  pickTodaySource,
  shouldAskFeedback,
  startOfDay,
  type FeedbackAnswer,
  type FeedbackRecord,
  type SavedForecast,
  type ScoredDiary,
} from "@/lib/forecast";
import type { UserProfile } from "@/lib/userProfile";

// ホームの「昨日ははかどった？」と「今日のはかどり予報」。
// 流れ：昨日の日記があって未回答なら先に聞く → 答える（または「あとで」）→ 予報を出す。
// 予報は 1 日 1 回作って保存し、その日に新しい日記を書いたときだけ作り直す（ユーザーと決めたこと）

export type FeedbackState =
  | { status: "hidden" }
  | {
      status: "ask";
      /** 例：11/13（木） */
      dayLabel: string;
      saving: boolean;
      error: string | null;
      onAnswer: (answer: FeedbackAnswer) => void;
      onSkip: () => void;
    }
  | { status: "thanks"; message: string };

export type ForecastState =
  | { status: "loading" }
  /** 「昨日ははかどった？」の答えを待っている */
  | { status: "waiting" }
  /** 日記がまだ 1 件もない（予報の材料がない） */
  | { status: "noDiary" }
  | { status: "error"; message: string; onRetry: () => void }
  | { status: "ready"; saved: SavedForecast };

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const THANKS_MS = 4000;

type Data = { scored: ScoredDiary[]; feedback: FeedbackRecord[]; saved: SavedForecast | null };

export function useForecast(user: User, profile: UserProfile) {
  const [feedback, setFeedback] = useState<FeedbackState>({ status: "hidden" });
  const [forecast, setForecast] = useState<ForecastState>({ status: "loading" });
  const [now] = useState(() => new Date());
  const data = useRef<Data | null>(null);
  const alive = useRef(true);
  /** 「もう一度予報する」ボタンから呼ぶ（runForecast は自分自身を参照できないので、ref を通す） */
  const retryRef = useRef<() => void>(() => undefined);

  const today = dateKey(now);
  const yesterdayDate = startOfDay(now, 1);
  const yesterday = dateKey(yesterdayDate);

  /** 予報を出す（保存済みで足りるなら使い回す） */
  const runForecast = useCallback(async () => {
    const d = data.current;
    if (!d) return;
    if (d.scored.length === 0) {
      setForecast({ status: "noDiary" });
      return;
    }
    // 昨日・今日の日記があれば、今日の状態として使う（なくても、過去の傾向から予報する）
    const source = pickTodaySource(d.scored, now);
    if (d.saved && !needsNewForecast(d.saved, source)) {
      setForecast({ status: "ready", saved: d.saved });
      return;
    }
    setForecast({ status: "loading" });
    try {
      const history = buildHistory(d.scored, d.feedback, today);
      const { forecast: result, model } = await requestForecast(user, {
        date: formatDateTime(now).date,
        grade: profile.grade,
        today: source?.scores ?? null,
        history,
      });
      const saved: SavedForecast = { date: today, forecast: result, basedOnDiaryId: source?.id ?? NO_SOURCE, model };
      d.saved = saved;
      await saveForecast(user.uid, saved).catch(() => undefined);
      if (alive.current) setForecast({ status: "ready", saved });
    } catch (e) {
      if (!alive.current) return;
      // 作り直しに失敗しても、今日の前の予報があればそれを出す
      if (d.saved && d.saved.date === today) {
        setForecast({ status: "ready", saved: d.saved });
        return;
      }
      setForecast({
        status: "error",
        message: e instanceof ApiRequestError ? e.message : "予報を作れませんでした",
        onRetry: () => retryRef.current(),
      });
    }
  }, [user, profile.grade, now, today]);

  useEffect(() => {
    retryRef.current = () => void runForecast();
  }, [runForecast]);

  const answer = useCallback(
    async (value: FeedbackAnswer) => {
      setFeedback((prev) => (prev.status === "ask" ? { ...prev, saving: true, error: null } : prev));
      try {
        await saveFeedback(user.uid, yesterday, value);
      } catch {
        setFeedback((prev) =>
          prev.status === "ask" ? { ...prev, saving: false, error: "保存できませんでした。もう一度押してください" } : prev,
        );
        return;
      }
      data.current?.feedback.push({ date: yesterday, ...value });
      setFeedback({ status: "thanks", message: FEEDBACK_THANKS[value.productivity] });
      window.setTimeout(() => {
        if (alive.current) setFeedback({ status: "hidden" });
      }, THANKS_MS);
      void runForecast();
    },
    [user.uid, yesterday, runForecast],
  );

  useEffect(() => {
    // React の開発モードでは effect が 2 回動く。1 回目の読み込みは使わない（Gemini を 2 回呼ばないため）
    let active = true;
    alive.current = true;
    (async () => {
      let loaded: Data;
      try {
        const [diaries, feedbackList, saved] = await Promise.all([
          getDiariesSince(user.uid, startOfDay(now, HISTORY_DAYS)),
          getFeedbackSince(user.uid, dateKey(startOfDay(now, HISTORY_DAYS))),
          getForecast(user.uid, today),
        ]);
        loaded = {
          scored: diaries.flatMap((d) =>
            d.analysisStatus === "done" && d.analysis && d.createdAt
              ? [{ id: d.id, createdAt: d.createdAt, scores: d.analysis.scores, labels: d.analysis.emotion_labels }]
              : [],
          ),
          feedback: feedbackList,
          saved,
        };
      } catch {
        if (active) {
          setForecast({ status: "error", message: "記録を読み込めませんでした", onRetry: () => location.reload() });
        }
        return;
      }
      if (!active) return;
      data.current = loaded;

      const ask = shouldAskFeedback(
        loaded.scored.map((d) => dateKey(d.createdAt)),
        yesterday,
        loaded.feedback.some((f) => f.date === yesterday),
      );
      if (ask) {
        setFeedback({
          status: "ask",
          dayLabel: `${yesterdayDate.getMonth() + 1}/${yesterdayDate.getDate()}（${WEEKDAYS[yesterdayDate.getDay()]}）`,
          saving: false,
          error: null,
          onAnswer: (v) => void answer(v),
          onSkip: () => {
            setFeedback({ status: "hidden" });
            void runForecast();
          },
        });
        // 今日の予報がもう保存してあれば、答えを待たずに出す
        const source = pickTodaySource(loaded.scored, now);
        if (loaded.saved && !needsNewForecast(loaded.saved, source)) {
          setForecast({ status: "ready", saved: loaded.saved });
        } else {
          setForecast({ status: "waiting" });
        }
        return;
      }
      await runForecast();
    })();
    return () => {
      active = false;
      alive.current = false;
    };
    // 読み込みはホームを開いたときに 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  /** ハカドリの話しかけに渡す予報の説明。まだ決まっていなければ undefined（話しかけを待たせる） */
  const summary: string | null | undefined =
    forecast.status === "ready"
      ? describeForecast(forecast.saved.forecast)
      : forecast.status === "loading"
        ? undefined
        : null;

  return { feedback, forecast, summary };
}
