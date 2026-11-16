/** 登場は1回だけ。全身が床下から跳び上がり、落下・着地してから静止する。 */
export const MINDFULNESS_DURATION_MS = 60_000;
export const MINDFULNESS_ENTRANCE_MS = 1_200;

export const MINDFULNESS_JUMP_FRAMES: Keyframe[] = [
  { offset: 0, transform: "translateX(-50%) translateY(110%) scale(1, 1)", easing: "cubic-bezier(.1,.65,.3,1)" },
  { offset: 0.36, transform: "translateX(-50%) translateY(-48px) scale(1, 1)", easing: "cubic-bezier(.55,0,.9,.5)" },
  { offset: 0.65, transform: "translateX(-50%) translateY(0) scale(1, 1)", easing: "ease-out" },
  { offset: 0.73, transform: "translateX(-50%) translateY(0) scale(1.035, .90)", easing: "ease-out" },
  { offset: 0.91, transform: "translateX(-50%) translateY(0) scale(1, 1)" },
  { offset: 1, transform: "translateX(-50%) translateY(0) scale(1, 1)" },
];

export const MINDFULNESS_FINISHES = [
  { id: "singing", label: "歌う", src: "/animations/mindfulness-stage-singing.svg", alt: "マイクを口元に上げ、口と頭を動かして歌い始めるキャラクター" },
  { id: "point", label: "斜め上を指す", src: "/animations/mindfulness-stage-point.svg", alt: "片手を斜め上に伸ばして指をさす決めポーズのキャラクター" },
  { id: "toe-stand", label: "つま先立ち", src: "/animations/mindfulness-stage-toe-stand.svg", alt: "両足をそろえ、かかとを上げてつま先で立つキャラクター" },
  { id: "moonwalk", label: "ムーンウォーク", src: "/animations/mindfulness-stage-moonwalk.svg", alt: "横を向いたまま交互にかかとを上げ、足を滑らせるムーンウォークのキャラクター" },
] as const;

export type MindfulnessFinish = (typeof MINDFULNESS_FINISHES)[number];
export type MindfulnessFinishId = MindfulnessFinish["id"];

/** 終了時に1回だけ選び、直前に見せた動きの連続を避ける。 */
export function pickMindfulnessFinish(previous: MindfulnessFinishId | null = null, random = Math.random): MindfulnessFinish {
  const candidates = MINDFULNESS_FINISHES.filter((finish) => finish.id !== previous);
  return candidates[Math.floor(random() * candidates.length)];
}
