"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { WaitAnimation as WaitAnimationId } from "@/lib/userProfile";

// 日記を分析している間（と、声を文章にしている間）のアニメーション。
// 設定（settings.waitAnimation）で 3 種類から選べる。標準はハカドリ（ユーザーと決めたこと）。
// 絵と動きは public/animations/ にある（assets/mascot-walk-animation/ で作った ver1〜ver3）

export const WAIT_ANIMATION_INFO: Record<WaitAnimationId, { name: string; description: string }> = {
  hakadori: { name: "ハカドリ（標準）", description: "ハカドリがよちよち歩き、小石を跳び越えたり転んだりする" },
  moonwalk: { name: "ムーンウォーク", description: "ムーンウォークで進み、回転して決めポーズ" },
  battle: { name: "メガシティ・バトル", description: "巨大ロボと大怪獣の 3D バトル（通信量が多め・重め）" },
};

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function WaitAnimation({ label }: { label: string }) {
  const { settings } = useAuth();
  // 「視差効果を減らす」設定の人には、3D のバトルではなく、動かないハカドリを出す（SVG の中で止まる）
  const reduceMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
  const chosen = settings?.waitAnimation ?? "hakadori";
  const id: WaitAnimationId = reduceMotion && chosen === "battle" ? "hakadori" : chosen;

  if (id === "battle") {
    return (
      <div className="mx-auto aspect-video w-full max-w-[400px] overflow-hidden rounded-[var(--radius)] bg-black shadow-[var(--card-shadow)]">
        <iframe src="/animations/battle.html" title={label} className="block h-full w-full border-0" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- アニメーションつきの SVG は next/image では動かないため
    <img
      src={id === "moonwalk" ? "/animations/moonwalk.svg" : "/animations/hakadori.svg"}
      alt={label}
      width={240}
      height={240}
      className="mx-auto block size-60 max-w-full"
    />
  );
}
