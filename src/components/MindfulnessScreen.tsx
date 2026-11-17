"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Ui";
import { MindfulnessPerformer } from "@/components/MindfulnessPerformer";

import { MINDFULNESS_DURATION_MS, MINDFULNESS_ENTRANCE_MS, MINDFULNESS_JUMP_FRAMES, pickMindfulnessFinish, type MindfulnessFinish, type MindfulnessFinishId } from "@/lib/mindfulness";

type Phase = "ready" | "entering" | "watching" | "done";

export function MindfulnessScreen() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [finish, setFinish] = useState<MindfulnessFinish | null>(null);
  const previousFinish = useRef<MindfulnessFinishId | null>(null);
  const [characterReady, setCharacterReady] = useState(false);
  const [characterError, setCharacterError] = useState(false);
  const deadline = useRef(0);
  const performer = useRef<HTMLDivElement>(null);
  const completion = useRef<HTMLHeadingElement>(null);

  function start() {
    setFinish(null);
    setPhase("entering");
  }

  useEffect(() => {
    if (phase !== "entering" || !performer.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let active = true;
    // 実際の着地アニメーションが完了してから60秒を数える。
    const animation = performer.current.animate(MINDFULNESS_JUMP_FRAMES, {
      duration: reduce ? 0 : MINDFULNESS_ENTRANCE_MS,
      fill: "both",
      easing: "linear",
    });
    animation.finished.then(() => {
      if (!active) return;
      deadline.current = performance.now() + MINDFULNESS_DURATION_MS;
      setPhase("watching");
    }).catch(() => { /* 中止・画面移動で取り消したアニメーションは完了扱いにしない。 */ });
    return () => {
      active = false;
      animation.cancel();
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "watching") return;
    let completed = false;
    // 間隔を数える方式にせず、タブを切り替えても経過時間がずれないようにする。
    function tick() {
      const milliseconds = Math.max(0, deadline.current - performance.now());
      if (!completed && milliseconds === 0) {
        completed = true;
        const next = pickMindfulnessFinish(previousFinish.current);
        previousFinish.current = next.id;
        setFinish(next);
        setPhase("done");
      }
    }
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "done") completion.current?.focus();
  }, [phase]);

  const active = phase === "entering" || phase === "watching";
  const message = phase === "ready"
    ? "マイケルと、静かな1分。"
    : phase === "entering"
      ? "マイケル、登場。"
      : phase === "watching"
        ? "ただ、見つめる。"
        : "1分間の瞑想が終了しました。";

  return (
    <section className="space-y-6 px-4 py-6 text-center" aria-label="1分間の瞑想">
      <div className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-accent-strong">ひと息、つこう。</p>
        <h1 className="font-display text-2xl">1分間のマインドフルネス</h1>
        <p className="text-sm leading-7 text-muted">マイケルを1分間見つめよう</p>
      </div>

      <div className="mindfulness-stage" data-phase={phase} aria-label="ステージ下から跳び上がり、着地して静止する演出">
        <div className="mindfulness-stage-lights" aria-hidden="true" />
        <div className="mindfulness-stage-air">
          <div className="mindfulness-stage-smoke mindfulness-stage-smoke-left" aria-hidden="true" />
          <div className="mindfulness-stage-smoke mindfulness-stage-smoke-right" aria-hidden="true" />
          <div ref={performer} className="mindfulness-performer" aria-hidden={phase === "ready"}>
            <MindfulnessPerformer
              finish={phase === "done" && finish ? finish.id : null}
              onReady={() => { setCharacterReady(true); setCharacterError(false); }}
              onError={() => { setCharacterError(true); setCharacterReady(false); setPhase("ready"); }}
            />
          </div>
        </div>
        <div className="mindfulness-stage-floor" aria-hidden="true"><div className="mindfulness-stage-hatch" /></div>
        {phase === "ready" && <p className="mindfulness-stage-ready">ステージ下から、ジャンプして登場。<br />着地したら、静かな1分が始まります。</p>}
      </div>

      <div className="space-y-2">
        <p role="status" className="font-bold">{message}</p>
        {phase === "done" && (
          <h2 ref={completion} tabIndex={-1} className="font-display text-xl">おつかれさま。自分のペースで戻ろう。</h2>
        )}
      </div>
      {characterError && <p role="alert" className="text-sm text-accent-strong">マイケルを読み込めませんでした。ページを再読み込みしてください。</p>}
      <div className="flex flex-col gap-3">
        {active ? (
          <Button variant="secondary" onClick={() => setPhase("ready")}>途中で終了する</Button>
        ) : (
          <Button disabled={!characterReady} onClick={start}>{!characterReady && !characterError ? "準備しています…" : phase === "done" ? "もう一度、1分間" : "1分間、はじめる"}</Button>
        )}
        <Link href="/" className={buttonClass("ghost")}>ホームに戻る</Link>
      </div>
    </section>
  );
}
