"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Ui";

type Phase = "ready" | "entering" | "watching" | "done";
const DURATION_MS = 60_000;
const ENTRANCE_MS = 800;

export function MindfulnessScreen() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [remaining, setRemaining] = useState(60);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const deadline = useRef(0);
  const completion = useRef<HTMLHeadingElement>(null);

  function start() {
    setRemaining(60);
    setPhase("entering");
  }

  useEffect(() => {
    if (phase !== "entering") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 登場の時間を60秒に含めない。CSSと同じ長さで、動きを減らす設定にも対応する。
    const timer = window.setTimeout(() => {
      deadline.current = performance.now() + DURATION_MS;
      setPhase("watching");
    }, reduce ? 0 : ENTRANCE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "watching") return;
    // 間隔を数える方式にせず、タブを切り替えても経過時間がずれないようにする。
    function tick() {
      const milliseconds = Math.max(0, deadline.current - performance.now());
      setRemaining(Math.ceil(milliseconds / 1000));
      if (milliseconds === 0) setPhase("done");
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
        <p className="text-sm leading-7 text-muted">集中したいときも、リフレッシュしたいときも。<br />登場したマイケルを、1分間見つめてみよう。</p>
      </div>

      <div className="mindfulness-stage relative isolate flex h-[350px] items-end justify-center overflow-hidden rounded-[var(--radius)] border border-border bg-[#0c1222]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,#39435c_0%,transparent_65%)]" />
        <div aria-hidden="true" className="absolute inset-x-8 bottom-6 h-4 rounded-[50%] bg-black/40" />
        <Image
          src="/animations/mindfulness-pose.svg"
          alt="白いスーツと帽子で、正面を向いて静止するマイケル"
          width={260}
          height={340}
          unoptimized
          priority
          onLoad={() => { setImageReady(true); setImageError(false); }}
          onError={() => { setImageError(true); setImageReady(false); setPhase("ready"); }}
          className={`relative mb-7 h-[290px] w-auto ${phase === "ready" ? "invisible" : ""} ${phase === "entering" ? "mindfulness-enter" : ""}`}
        />
        {phase === "ready" && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-sm leading-7 text-slate-200">準備ができたら、スタート。<br />下からマイケルが登場します。</p>}
      </div>

      <div className="min-h-24 space-y-2">
        <p role="status" className="font-bold">{message}</p>
        {phase === "done" ? (
          <h2 ref={completion} tabIndex={-1} className="font-display text-xl">おつかれさま。自分のペースで戻ろう。</h2>
        ) : (
          <p role="timer" aria-label={`残り${remaining}秒`} className="font-num text-3xl tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
        )}
        {phase === "watching" && <p className="text-xs text-muted">呼吸はいつもどおり。気がそれたら、そっと視線を戻して。</p>}
      </div>
      {imageError && <p role="alert" className="text-sm text-accent-strong">マイケルを読み込めませんでした。ページを再読み込みしてください。</p>}
      <div className="flex flex-col gap-3">
        {active ? (
          <Button variant="secondary" onClick={() => { setPhase("ready"); setRemaining(60); }}>途中で終了する</Button>
        ) : (
          <Button disabled={!imageReady} onClick={start}>{phase === "done" ? "もう一度、1分間" : "1分間、はじめる"}</Button>
        )}
        <Link href="/" className={buttonClass("ghost")}>ホームに戻る</Link>
      </div>
    </section>
  );
}
