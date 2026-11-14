"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  MAX_RECORDING_SECONDS,
  RECORDER_MIME_CANDIDATES,
  RECORDING_BITS_PER_SECOND,
} from "@/lib/audio";
import { ApiRequestError, requestTranscription } from "@/lib/diaries";
import { Button } from "@/components/ui/Ui";
import { WalkingMascot } from "@/components/ui/WalkingMascot";

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

  // 見た目は Figma Make の SpeakPanel から移した
  if (state.step === "review") {
    return (
      <div className="mt-6">
        <h2 className="font-display text-xl font-bold">文章を確認してね</h2>
        <p className="mt-2 text-sm text-muted">Gemini が文章にしました。聞き間違いがあれば、ここで直せます。</p>
        <label>
          <span className="sr-only">文章にした日記</span>
          <textarea
            className="field mt-5 min-h-64 resize-none leading-relaxed"
            value={state.text}
            onChange={(e) => setState({ step: "review", text: e.target.value })}
            maxLength={4000}
          />
        </label>
        <Button className="mt-5 w-full" disabled={saving || !state.text.trim()} onClick={() => onSubmit(state.text.trim())}>
          {saving ? "保存中…" : "保存して分析する"}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" disabled={saving} onClick={() => setState({ step: "idle" })}>
          録り直す
        </Button>
      </div>
    );
  }

  if (state.step === "transcribing") {
    return (
      <div className="grid min-h-[480px] place-items-center text-center">
        <div className="w-full">
          <div className="mx-auto mb-7 rounded-[var(--radius)] bg-soft-accent px-2 pt-4">
            <WalkingMascot label="ハカドリが声を文章にしながら歩いています" />
          </div>
          <h2 className="font-display text-xl font-bold" role="status">
            声を文章にしています
          </h2>
          <p className="mt-3 text-muted">
            Gemini が声を文章にしています…
            <br />
            混み合っているときは、少し時間がかかります。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
      {state.step === "recording" ? (
        <>
          <div className="relative mb-7 grid size-32 place-items-center rounded-full bg-soft-accent">
            <div className="absolute size-32 animate-ping rounded-full border border-recording opacity-30" />
            <div className="size-5 animate-pulse rounded-full bg-recording" />
          </div>
          <h2 className="font-display text-2xl font-bold" role="status">
            聞いているよ
          </h2>
          <p className="mt-3 font-num text-xl font-bold tabular-nums">
            {formatSeconds(state.elapsed)} <span className="text-muted">/ {formatSeconds(MAX_RECORDING_SECONDS)}</span>
          </p>
          <Button onClick={stop} className="mt-10 w-full">
            話し終わった
          </Button>
        </>
      ) : (
        <>
          <div className="mb-7 grid size-32 place-items-center rounded-full bg-soft-accent text-4xl text-accent-strong" aria-hidden="true">
            ◉
          </div>
          <h2 className="font-display text-xl font-bold">
            今日あったことや気持ちを、
            <br />
            そのまま話してね
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {MAX_RECORDING_SECONDS / 60}分まで録音できます。長く話すと、
            <br />
            全部は文字にできないことがあるよ。
          </p>

          {state.step === "error" && (
            <p role="alert" className="mt-5 text-sm font-bold leading-relaxed text-accent-strong">
              {state.message}
            </p>
          )}

          {state.step === "error" && state.retryAudio ? (
            <>
              <Button className="mt-8 w-full" onClick={() => state.retryAudio && transcribe(state.retryAudio)}>
                もう一度文章にする
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => setState({ step: "idle" })}>
                録り直す
              </Button>
            </>
          ) : (
            <Button className="mt-10 w-full" onClick={start} disabled={state.step === "starting"}>
              {state.step === "starting" ? "マイクを準備しています…" : "話しはじめる"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
