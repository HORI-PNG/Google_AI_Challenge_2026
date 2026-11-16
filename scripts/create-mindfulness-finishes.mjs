// 共通の黒金の舞台衣装から、瞑想終了時の3つの追加ムーブを生成する。
import { readFileSync, writeFileSync } from "node:fs";
import "./create-mindfulness-singing.mjs";

const base = readFileSync(new URL("../public/animations/mindfulness-stage-performer.svg", import.meta.url), "utf8");
const write = (name, svg) => writeFileSync(new URL(`../public/animations/mindfulness-stage-${name}.svg`, import.meta.url), svg);
function replace(svg, before, after) {
  if (!svg.includes(before)) throw new Error(`素材の構造が変わっています: ${before.slice(0, 45)}`);
  return svg.replace(before, after);
}
const rightArm = '    <path d="M162 104Q178 102 183 122L197 173L205 220L187 226L173 180L154 140Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>';
const rightHand = '    <path d="M189 226L202 221L210 232L208 240L196 244L189 238Z" fill="url(#skin)" stroke="#7d584b"/>';
const rightStripe = '    <path d="M183 181L194 178" stroke="#8d2933" stroke-width="2"/>';
let point = replace(base, rightArm, "");
point = replace(point, rightHand, "");
point = replace(point, rightStripe, "");
point = replace(point, 'M35 231L45 234M37 237L45 239M196 234L205 231M196 239L203 237', 'M35 231L45 234M37 237L45 239');
point = point.replace('</defs>', `</defs>
  <style>
    .point-arm { transform-box: view-box; transform-origin: 165px 108px; animation: point-hit 650ms ease-out both; }
    @keyframes point-hit { 0% { transform: rotate(-7deg); } 65% { transform: rotate(3deg); } 100% { transform: rotate(0deg); } }
    @media (prefers-reduced-motion: reduce) { .point-arm { animation: none; } }
  </style>`);
point = point.replace('  </g>\n</svg>', `    <g class="point-arm">
      <path d="M160 107Q168 97 178 88L195 65L210 76L195 102L173 125Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>
      <path d="M193 67L214 34L229 42L209 79Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>
      <path d="M199 58L211 64" stroke="#8d2933" stroke-width="2"/>
      <path d="M214 35L215 27L226 13Q230 10 232 14L224 29L230 27Q235 28 232 33L228 43L221 44Z" fill="url(#skin)" stroke="#7d584b" stroke-width="1.2"/>
      <path d="M218 32L225 36M217 36L224 40" stroke="#a2735a"/>
    </g>
  </g>
</svg>`);
write("point", point);

let toe = base;
const replacements = [
  ['M88 228L120 240L114 285L87 349L70 404L42 400L59 332L74 272Z', 'M88 228L120 240L113 292L101 333L116 398L94 400L76 332L83 278Z'],
  ['M120 240L152 228L167 273L183 332L199 400L170 404L152 350L126 286Z', 'M120 240L152 228L157 278L164 332L146 400L124 398L139 333L127 292Z'],
  ['M86 260L75 330L59 391M151 260L164 330L182 391', 'M91 260L86 330L104 391M149 260L154 330L136 391'],
  ['M98 280L88 320M142 280L152 320', 'M101 280L92 320M139 280L148 320'],
  ['M44 398L69 402L65 417L40 416ZM171 402L196 398L200 416L176 417Z', 'M94 398L113 398L117 415L100 421ZM127 398L146 398L140 421L123 415Z'],
  ['M40 411L65 413L67 423Q59 431 35 431L20 430Q17 423 27 419Z', 'M100 412L116 409L121 423Q122 432 114 433L104 433Q100 428 100 422Z'],
  ['M175 413L200 411L212 419Q223 423 220 430L205 431Q180 431 173 423Z', 'M124 409L140 412L140 422Q140 430 136 433L126 433Q118 432 120 423Z'],
  ['M23 427L62 426M179 426L217 427', 'M104 430L117 430M124 430L136 430'],
];
for (const [before, after] of replacements) toe = replace(toe, before, after);
toe = toe.replace('</defs>', `</defs>
  <style>
    .toe-rise { transform-box: view-box; transform-origin: 120px 433px; animation: toe-rise 750ms ease-out both; }
    @keyframes toe-rise { from { transform: scaleY(.96); } to { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .toe-rise { animation: none; } }
  </style>`).replace('<g stroke-linecap="round" stroke-linejoin="round">', '<g class="toe-rise" stroke-linecap="round" stroke-linejoin="round">');
write("toe-stand", toe);

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
