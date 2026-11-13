"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  MAX_RECORDING_SECONDS,
  RECORDER_MIME_CANDIDATES,
  RECORDING_BITS_PER_SECOND,
} from "@/lib/audio";
import { ApiRequestError, requestTranscription } from "@/lib/diaries";

// 声の日記：録音 → Gemini が文章にする → 本人が確認・修正 → 保存して分析
// 録音はブラウザのメモリにだけ置き、文章にしたら捨てる（どこにも保存しない）

type State =
  | { step: "idle" }
  | { step: "starting" }
  | { step: "recording"; elapsed: number }
  | { step: "transcribing" }
  | { step: "review"; text: string }
  | { step: "error"; message: string; retryAudio: Blob | null };

function pickMimeType(): string | undefined {
  return RECORDER_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceRecorder({
  user,
  onSubmit,
  saving,
}: {
  user: User;
  onSubmit: (text: string) => void;
  saving: boolean;
}) {
  const [state, setState] = useState<State>({ step: "idle" });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // 画面を離れたら、録音とマイクを止める
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      stopTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      releaseMicrophone();
    };
  }, []);

  async function transcribe(audio: Blob) {
    setState({ step: "transcribing" });
    try {
      const { text } = await requestTranscription(user, audio);
      if (!unmountedRef.current) setState({ step: "review", text });
    } catch (e) {
      if (unmountedRef.current) return;
      const message = e instanceof ApiRequestError ? e.message : "文章にできませんでした";
      // 混雑などでの失敗なら、録り直さずにもう一度送れるようにする
      const canRetry = !(e instanceof ApiRequestError) || !["no_speech", "too_large", "unsupported"].includes(e.code);
      setState({ step: "error", message, retryAudio: canRetry ? audio : null });
    }
  }

  async function start() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({
        step: "error",
        message: "このブラウザは録音に対応していません。「書く」か「選ぶ」で日記をつけてね",
        retryAudio: null,
      });
      return;
    }

    setState({ step: "starting" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      setState({
        step: "error",
        message: denied
          ? "マイクの使用が許可されていません。ブラウザの設定でこのサイトのマイクを許可してください"
          : "マイクが使えませんでした",
        retryAudio: null,
      });
      return;
    }
    if (unmountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: RECORDING_BITS_PER_SECOND,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stopTimer();
      releaseMicrophone();
      const audio = new Blob(chunksRef.current, {
        type: recorder.mimeType || mimeType || "audio/webm",
      });
      chunksRef.current = [];
      recorderRef.current = null;
      if (audio.size === 0) {
        setState({ step: "error", message: "録音できませんでした", retryAudio: null });
        return;
      }
      void transcribe(audio);
    };

    const startedAt = Date.now();
    recorder.start();
    setState({ step: "recording", elapsed: 0 });
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      if (elapsed >= MAX_RECORDING_SECONDS) {
        stop();
        return;
      }
      setState({ step: "recording", elapsed });
    }, 250);
  }

  function stop() {
    stopTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const primaryButton =
    "h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm disabled:opacity-60";
  const secondaryButton =
    "h-12 w-full rounded-full border border-black/10 text-sm text-muted disabled:opacity-60";

  if (state.step === "review") {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-sm text-muted">
            Gemini が文章にしました。聞き間違いがあれば直してね。
          </span>
          <textarea
            value={state.text}
            onChange={(e) => setState({ step: "review", text: e.target.value })}
            maxLength={4000}
            rows={8}
            className="min-h-48 w-full flex-1 resize-none rounded-2xl border border-black/10 bg-card p-4 text-base leading-relaxed outline-none focus:border-accent"
          />
        </label>
        <button
          type="button"
          disabled={saving || !state.text.trim()}
          onClick={() => onSubmit(state.text.trim())}
          className={primaryButton}
        >
          {saving ? "保存中…" : "保存して分析する"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setState({ step: "idle" })}
          className={secondaryButton}
        >
          録り直す
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {state.step === "idle" && (
        <>
          <p className="text-base leading-relaxed">
            今日あったことや気持ちを、
            <br />
            そのまま話してね（{MAX_RECORDING_SECONDS / 60}分まで）
          </p>
          <p className="text-xs leading-relaxed text-muted">
            長く話すと、全部は文字にできないことがあるよ。
            <br />
            伝えたいことを短めに話すと、早く文章になるよ。
          </p>
          <button type="button" onClick={start} className={primaryButton}>
            🎙️ 話しはじめる
          </button>
        </>
      )}

      {state.step === "starting" && <p className="text-sm text-muted">マイクを準備しています…</p>}

      {state.step === "recording" && (
        <>
          <p className="flex items-center gap-2 text-base" role="status">
            <span aria-hidden className="h-3 w-3 animate-pulse rounded-full bg-accent" />
            聞いているよ
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {formatSeconds(state.elapsed)}
            <span className="ml-2 text-sm font-normal text-muted">
              / {formatSeconds(MAX_RECORDING_SECONDS)}
            </span>
          </p>
          <button type="button" onClick={stop} className={primaryButton}>
            話し終わった
          </button>
        </>
      )}

      {state.step === "transcribing" && (
        <p className="text-sm leading-relaxed text-muted" role="status">
          Gemini が声を文章にしています…
          <br />
          混み合っているときは、少し時間がかかります。
        </p>
      )}

      {state.step === "error" && (
        <>
          <p role="alert" className="text-sm leading-relaxed text-accent">
            {state.message}
          </p>
          {state.retryAudio && (
            <button
              type="button"
              onClick={() => state.retryAudio && transcribe(state.retryAudio)}
              className={primaryButton}
            >
              もう一度文章にする
            </button>
          )}
          <button type="button" onClick={() => setState({ step: "idle" })} className={secondaryButton}>
            録り直す
          </button>
        </>
      )}
    </div>
  );
}
