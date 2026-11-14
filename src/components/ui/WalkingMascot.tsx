"use client";

import { useState } from "react";
import { Mascot } from "@/components/ui/Mascot";

// 待ち時間のアニメーション：ハカドリが右から左へ歩き、道の小石をジャンプしたり、たまにつまずいて転んだりする。
// 動きは globals.css の walk-* のキーフレーム。1周ごとに、次の動きをランダムに選ぶ。
// 「視差効果を減らす」設定の人には、動かない絵を出す（globals.css）

type Variant = "hop" | "trip";

/** つまずく周の割合 */
const TRIP_RATE = 0.3;

/**
 * 最初の周だけ、途中（画面の右寄り）から始める。
 * 右の外から歩いて入ってくると、分析が早く終わったときにハカドリがほとんど見えないため。
 * 2.5 秒ぶん進めると、開いた直後から画面の中にいて、約 0.6 秒後に 1 つ目の小石を跳ぶ
 */
const FIRST_LAP_HEAD_START = "-2.5s";

export function WalkingMascot({ label = "ハカドリが歩いています" }: { label?: string }) {
  const [lap, setLap] = useState(0);
  const [variant, setVariant] = useState<Variant>("hop");
  // 歩く動きと跳ねる動きは、同じだけ進めないとずれる
  const headStart = lap === 0 ? { animationDelay: FIRST_LAP_HEAD_START } : undefined;

  return (
    <div className="walk-scene" role="img" aria-label={label}>
      <span className="walk-stone walk-stone-1" aria-hidden="true" />
      <span className="walk-stone walk-stone-2" aria-hidden="true" />
      {/* key を変えると、アニメーションが最初からやり直しになる */}
      <div
        key={lap}
        className={`walk-walker walk-x-${variant}`}
        style={headStart}
        onAnimationEnd={(e) => {
          // 歩いて画面の左に消えたら（中の跳ねる動きの終わりは数えない）、次の周へ
          if (e.target !== e.currentTarget) return;
          setVariant(Math.random() < TRIP_RATE ? "trip" : "hop");
          setLap((l) => l + 1);
        }}
        aria-hidden="true"
      >
        <div className={`walk-body walk-y-${variant}`} style={headStart}>
          <div className="walk-bob">
            <Mascot mood="normal" size={64} />
          </div>
        </div>
      </div>
      <span className="walk-ground" aria-hidden="true" />
    </div>
  );
}
