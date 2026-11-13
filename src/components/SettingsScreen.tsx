"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toMessage, useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Mascot } from "@/components/ui/Mascot";
import { getLatestDiary } from "@/lib/diaries";
import {
  getTheme,
  recommendTheme,
  THEMES,
  type RecommendInput,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/themes";

const noopSubscribe = () => () => undefined;
const currentHour = () => new Date().getHours();

// テーマ・設定（Figma Make の SettingsScreen から移した）
export function SettingsScreen({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const [scores, setScores] = useState<RecommendInput["scores"]>(null);
  // 今の時刻はブラウザで描くときだけ読む（サーバーでの事前描画では昼の扱い）
  const hour = useSyncExternalStore(noopSubscribe, currentHour, () => 12);
  const [error, setError] = useState<string | null>(null);

  // おすすめには、最新の日記の点数を使う
  useEffect(() => {
    let active = true;
    getLatestDiary(user.uid)
      .then((diary) => {
        if (active && diary?.analysis) setScores(diary.analysis.scores);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user.uid]);

  async function choose(id: ThemeId) {
    setError(null);
    try {
      await setTheme(id);
    } catch (e) {
      setError(toMessage(e, "テーマを保存できませんでした（この端末では切り替わっています）"));
    }
  }

  const recommendation = recommendTheme({ scores, hour });
  const recommended = getTheme(recommendation.themeId);
  const isRecommendedNow = theme?.id === recommended.id;

  return (
    <div className="space-y-6 p-4">
      <section className="recommend-card rounded-[var(--radius)] border p-5">
        <div className="flex items-center gap-3">
          <Mascot mood="normal" size={70} />
          <div>
            <p className="text-sm font-bold text-accent-strong">今日の気分には、このテーマはどう？</p>
            <p className="mt-1 font-display text-lg font-bold">{recommended.name}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{recommendation.reason}</p>
        <button
          type="button"
          onClick={() => choose(recommended.id)}
          disabled={isRecommendedNow}
          className="recommend-action mt-4 min-h-12 w-full rounded-[var(--radius-control)] px-5 font-bold disabled:opacity-60"
        >
          {isRecommendedNow ? "いまこのテーマです" : "このテーマにする"}
        </button>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">テーマを選ぶ</h2>
        <p className="mt-1 text-sm text-muted">色だけでなく、情報の並び方も好みに合わせて選べます。</p>
        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-accent-strong">
            {error}
          </p>
        )}
        <ThemeGroup
          label="やさしい"
          description="手帳のように、ゆったり縦に読む"
          themes={THEMES.filter((t) => t.group === "gentle")}
          selected={theme?.id ?? null}
          onChoose={choose}
        />
        <ThemeGroup
          label="スタイリッシュ"
          description="すりガラス・ビジネスの専用レイアウト"
          themes={THEMES.filter((t) => t.group === "stylish")}
          selected={theme?.id ?? null}
          onChoose={choose}
        />
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <Link
          href="/welcome"
          className="flex min-h-14 w-full items-center justify-between rounded-[var(--radius-control)] border border-border bg-card px-4 font-bold"
        >
          <span>基本情報を変更</span>
          <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
          className="min-h-14 w-full rounded-[var(--radius-control)] px-4 text-left font-bold text-muted"
        >
          ログアウト
        </button>
      </section>
    </div>
  );
}

function ThemeGroup({
  label,
  description,
  themes,
  selected,
  onChoose,
}: {
  label: string;
  description: string;
  themes: readonly ThemeDefinition[];
  selected: ThemeId | null;
  onChoose: (id: ThemeId) => void;
}) {
  return (
    <div className="mt-6">
      <div className="mb-3">
        <h3 className="font-bold">{label}</h3>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChoose(t.id)}
              aria-pressed={active}
              className={`theme-swatch theme-${t.id} min-h-36 overflow-hidden rounded-[var(--radius)] border-2 p-3 text-left transition ${
                active ? "border-accent shadow-[var(--card-shadow)]" : "border-transparent"
              }`}
            >
              <ThemePreview layout={t.layout} />
              <span className="flex items-center justify-between gap-2">
                <strong className="block text-sm text-[var(--swatch-text)]">{t.name}</strong>
                {active && (
                  <span className="text-[var(--swatch-accent)]" aria-hidden="true">
                    ●
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--swatch-muted)]">{t.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** テーマの見本（構成の違いも小さく見せる） */
function ThemePreview({ layout }: { layout: ThemeDefinition["layout"] }) {
  if (layout === "glass") {
    return (
      <div className="mb-3 grid h-16 grid-cols-[1fr_22px] gap-1.5 rounded-[var(--radius-small)] bg-[var(--swatch-bg)] p-2" aria-hidden="true">
        <span className="row-span-2 rounded-lg border border-white/60 bg-[var(--swatch-card)] shadow-sm" />
        <span className="rounded-full bg-[var(--swatch-accent)]" />
        <span className="rounded-md bg-[var(--swatch-card)]" />
      </div>
    );
  }
  if (layout === "office") {
    return (
      <div className="mb-3 grid h-16 grid-cols-[18px_1fr] overflow-hidden rounded-[var(--radius-small)] bg-[var(--swatch-card)]" aria-hidden="true">
        <span className="bg-[var(--swatch-bg)]" />
        <span className="p-2">
          <i className="mb-1 block h-1.5 w-1/3 bg-[var(--swatch-text)] opacity-80" />
          <svg className="h-7 w-full" viewBox="0 0 80 24">
            <path d="M0 20 C20 20 24 16 38 15 S57 12 80 3" fill="none" style={{ stroke: "var(--swatch-accent)" }} strokeWidth="2" />
          </svg>
          <i className="block h-1 w-full bg-[var(--swatch-bg)]" />
        </span>
      </div>
    );
  }
  return (
    <div className="mb-3 flex h-16 items-end gap-2 rounded-[var(--radius-small)] bg-[var(--swatch-bg)] p-2" aria-hidden="true">
      <span className="h-8 flex-1 rounded-[var(--radius-small)] bg-[var(--swatch-card)]" />
      <span className="size-8 rounded-full bg-[var(--swatch-accent)]" />
    </div>
  );
}
