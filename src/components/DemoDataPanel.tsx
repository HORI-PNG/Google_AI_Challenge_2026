"use client";

import { useState } from "react";
import { toMessage } from "@/components/AuthProvider";
import { DEMO_DAYS, deleteDemoDiaries, seedDemoDiaries } from "@/lib/demoDiaries";

// 開発中だけ出す、デモ用の架空の日記の操作パネル（本番では何も表示しない）
export function DemoDataPanel({ uid, onChange }: { uid: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  async function run(action: "seed" | "delete") {
    setBusy(true);
    setMessage(null);
    try {
      const count =
        action === "seed" ? await seedDemoDiaries(uid) : await deleteDemoDiaries(uid);
      setMessage(
        action === "seed" ? `架空の日記を ${count} 件入れました` : `架空の日記を ${count} 件消しました`,
      );
      onChange();
    } catch (e) {
      setMessage(toMessage(e, "できませんでした"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-dashed border-border p-4 text-sm">
      <p className="font-bold">開発用：デモの日記</p>
      <p className="text-xs leading-relaxed text-muted">
        グラフの確認とデモ動画のために、{DEMO_DAYS} 日分の架空の日記を入れます（本番には表示されません）。
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("seed")}
          className="min-h-11 flex-1 rounded-full border border-border bg-card font-bold disabled:opacity-60"
        >
          入れる
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("delete")}
          className="min-h-11 flex-1 rounded-full border border-border bg-card font-bold disabled:opacity-60"
        >
          消す
        </button>
      </div>
      {message && <p className="text-xs">{message}</p>}
    </section>
  );
}
