// 共通の黒金の舞台衣装から、瞑想終了時の3つの追加ムーブを生成する。
import { readFileSync, writeFileSync } from "node:fs";
import "./create-mindfulness-singing.mjs";

import "./create-mindfulness-dances.mjs";
const write = (name, svg) => writeFileSync(new URL(`../public/animations/mindfulness-stage-${name}.svg`, import.meta.url), svg);

// 既存のムーンウォークの、最初の1秒にある足運びだけを再利用する。
const moonwalk = readFileSync(new URL("../public/animations/moonwalk.svg", import.meta.url), "utf8");
function group(source, className) {
  const start = source.indexOf(`<g class="mw-anim ${className}">`);
  if (start < 0) throw new Error(`グループがありません: ${className}`);
  let depth = 0;
  for (const match of source.slice(start).matchAll(/<g\b[^>]*>|<\/g>/g)) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return source.slice(start, start + match.index + match[0].length);
  }
  throw new Error("SVGのグループを閉じられません");
}
let profile = group(moonwalk, "mw-pvis");
profile = profile.replace(group(profile, "mw-hat"), "").replace('class="mw-anim mw-pvis"', 'class="moonwalk-profile"');
const palette = { '#FFFFFF':'#242c3a', '#F8FAFC':'#202938', '#F1F5F9':'#1a2230', '#CBD5E1':'#384455', '#94A3B8':'#1c2633', '#B0BEC5':'#344253', '#E2E8F0':'#303b4c', '#0284C7':'#d9af58', '#0369A1':'#a27a35', '#FCE7F3':'#e6bda3', '#38BDF8':'#f3d58e', '#0F172A':'#657284' };
profile = profile.replace(/#[0-9A-Fa-f]{6}/g, (color) => palette[color] ?? color);
profile = profile.replace(/(<rect x="-2\.5" y="-9\.5"[^>]*fill=")[^"]+/g, '$1#eef0e9');
profile = profile.replace('<polygon points="-14,-110 14,-110 8,-70 -10,-70" fill="#202938" stroke="#657284" stroke-width="1.8" />', `<polygon points="-14,-110 14,-110 8,-70 -10,-70" fill="#202938" stroke="#657284" stroke-width="1.8" />
        <path d="M-11,-108L8,-77M11,-108L-8,-77" fill="none" stroke="#d9af58" stroke-width="4" />
        <path d="M-9,-72H8M-9,-68H8M-8,-64H8" stroke="#d9af58" stroke-width="2" />`);
profile = profile.replace('<!-- 頭（右向きの横顔） -->', `<!-- 頭（右向きの横顔） -->
        <path d="M-8,-120Q-12,-134 0,-137Q8,-140 13,-129L12,-120L8,-123L3,-122L-3,-117Z" fill="#0b1018" stroke="#47505c" stroke-width=".7" />`);
const needed = new Set(['mw-actor', ...[...profile.matchAll(/class="mw-anim (mw-[\w]+)"/g)].map((m) => m[1])]);
const cyclePercent = 100 / 10.47;
const initialTransforms = new Map();
let styles = '.mw-anim { transform-box: view-box; transform-origin: 0 0; animation-duration: 1s; animation-timing-function: linear; animation-iteration-count: infinite; }\n';
for (const match of moonwalk.matchAll(/@keyframes (mw-[\w]+)\s*\{([\s\S]*?)\n    \}/g)) {
  if (!needed.has(match[1])) continue;
  const frames = [...match[2].matchAll(/([\d.]+)%\s*\{([^}]+)\}/g)].filter((m) => Number(m[1]) < cyclePercent);
  if (!frames.length) throw new Error(`動きがありません: ${match[1]}`);
  initialTransforms.set(match[1], frames[0][2].trim().replace(/^transform:/, '').replaceAll('px', '').replaceAll('deg', ''));
  styles += `.${match[1]} { animation-name: ${match[1]}; }\n@keyframes ${match[1]} {\n`;
  for (const frame of frames) styles += `${(Number(frame[1]) / cyclePercent * 100).toFixed(2)}% { ${frame[2]} }\n`;
  styles += `100% { ${frames[0][2]} }\n}\n`;
}
styles += '@media (prefers-reduced-motion: reduce) { .mw-anim { animation-play-state: paused; } }';
profile = profile.replace(/class="mw-anim (mw-[\w]+)"/g, (attribute, name) => `${attribute} transform="${initialTransforms.get(name)}"`);
write('moonwalk', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="205 185 90 165" width="240" height="440">
  <style>${styles}</style>
  <svg x="0" y="0" width="500" height="500" viewBox="0 0 500 500" overflow="visible">
    <g class="mw-anim mw-actor" transform="${initialTransforms.get('mw-actor')}">${profile}</g>
  </svg>
</svg>
`.replace(/[ \t]+$/gm, ''));
