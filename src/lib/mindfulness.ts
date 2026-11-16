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
