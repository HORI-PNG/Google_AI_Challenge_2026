// 既存素材の正面ポーズを静止画にする。元の待機アニメーションは変更しない。
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../public/animations/moonwalk.svg", import.meta.url), "utf8");
const start = source.indexOf('<g class="mw-anim mw-fvis">');
if (start < 0) throw new Error("正面ポーズが見つかりません");
let depth = 0;
let end = 0;
for (const match of source.slice(start).matchAll(/<g\b[^>]*>|<\/g>/g)) {
  depth += match[0].startsWith("</") ? -1 : 1;
  if (depth === 0) {
    end = start + match.index + match[0].length;
    break;
  }
}
// 決めポーズ中の90%時点に達する直前の姿勢を固定する。
const poses = new Map();
for (const match of source.matchAll(/@keyframes (mw-[\w]+)\s*\{([\s\S]*?)\n    \}/g)) {
  for (const frame of match[2].matchAll(/([\d.]+)%\s*\{\s*transform:([^}]+)\}/g)) {
    if (Number(frame[1]) <= 90) poses.set(match[1], frame[2].trim().replaceAll("px", "").replaceAll("deg", ""));
  }
}
const figure = source.slice(start, end).replace(/[ \t]+$/gm, "").replace(/class="mw-anim (mw-[\w]+)"/g, (_, name) =>
  poses.has(name) ? `transform="${poses.get(name)}"` : "",
);
writeFileSync(new URL("../public/animations/mindfulness-pose.svg", import.meta.url), `<!-- moonwalk.svg の正面ポーズ。scripts/create-mindfulness-pose.mjs で生成 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-65 -160 130 170" width="260" height="340">
${figure}
</svg>
`);
