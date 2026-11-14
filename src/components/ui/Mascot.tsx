// ハカドリ（仮の絵）。Figma Make のデザインから移した SVG。
// 色はテーマの CSS 変数（--bird、--bird-wing、--bird-ink、--bird-beak）で変わる。
// 表情を点数で切り替える仕組みと、絵の仕上げは段階7 で行う。
// SVG の属性では CSS 変数が効かないので、色は style で指定する。

import type { MascotMood } from "@/lib/mascotMood";

export type { MascotMood };

const MOOD_LABEL: Record<MascotMood, string> = {
  happy: "にっこり",
  normal: "ふつう",
  worried: "心配",
  sleepy: "ねむい",
  cheer: "おうえん",
};

const ink = { stroke: "var(--bird-ink)" };

export function Mascot({
  mood = "normal",
  size = 96,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
}) {
  const eyes =
    mood === "happy" || mood === "cheer" ? (
      <>
        <path d="M42 54q5-7 10 0" />
        <path d="M70 54q5-7 10 0" />
      </>
    ) : mood === "sleepy" ? (
      <>
        <path d="M42 54h10" />
        <path d="M70 54h10" />
      </>
    ) : mood === "worried" ? (
      <>
        <path d="M41 51q5-3 10 1" />
        <path d="M71 52q5-4 10-1" />
      </>
    ) : (
      <>
        <circle cx="47" cy="53" r="2.6" style={{ fill: "var(--bird-ink)", stroke: "none" }} />
        <circle cx="75" cy="53" r="2.6" style={{ fill: "var(--bird-ink)", stroke: "none" }} />
      </>
    );

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`ハカドリ（${MOOD_LABEL[mood]}）`}
    >
      <path
        d="M24 68c-1-27 16-45 38-45 22 0 37 17 37 40 0 24-15 39-39 39-21 0-35-12-36-34Z"
        style={{ fill: "var(--bird)", ...ink }}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M31 43 19 34l4 22" style={{ fill: "var(--bird-wing)", ...ink }} strokeWidth="3" />
      <path d="M91 42 103 31l-2 24" style={{ fill: "var(--bird-wing)", ...ink }} strokeWidth="3" />
      <path d="M58 63h9l-5 5Z" style={{ fill: "var(--bird-beak)", ...ink }} strokeWidth="2" />
      <g fill="none" style={ink} strokeWidth="3" strokeLinecap="round">
        {eyes}
      </g>
      {mood === "cheer" && (
        <>
          <path d="m22 70-10-7M99 68l10-9" style={ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M52 79q10 8 20 0" fill="none" style={ink} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === "worried" && (
        <path d="M56 80q6-5 12 0" fill="none" style={ink} strokeWidth="3" strokeLinecap="round" />
      )}
      {mood === "sleepy" && (
        <text x="90" y="25" style={{ fill: "var(--bird-ink)" }} fontSize="14" fontWeight="700">
          z
        </text>
      )}
      <path d="M46 100v7m29-8v8" style={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
