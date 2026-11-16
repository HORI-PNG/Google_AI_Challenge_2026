// 共通の舞台衣装を関節ごとに分け、終了後に繰り返すダンスを生成する。
import { readFileSync, writeFileSync } from "node:fs";

const base = readFileSync(new URL("../public/animations/mindfulness-stage-performer.svg", import.meta.url), "utf8");
const defs = base.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
if (!defs) throw new Error("衣装の色定義が見つかりません");
const torso = base.slice(base.indexOf('    <!-- 軍服'), base.indexOf('    <!-- 顔')).replace(/    <g fill="#cdd2d7">[\s\S]*?<\/g>\n/, "");
const head = base.slice(base.indexOf('    <!-- 顔'), base.lastIndexOf('  </g>'));
const backTorso = `<path d="M89 96L108 90H132L151 96L166 110L157 155L154 213L145 239H95L86 213L83 155L74 110Z" fill="url(#jacket)" stroke="#78808d" stroke-width="1.5"/>
  <path d="M91 101L120 113L149 101M120 114V209" fill="none" stroke="#566171" stroke-width="1.3"/>
  <path d="M81 107L99 99M141 99L159 107" stroke="url(#gold)" stroke-width="7"/>
  <path d="M88 211Q120 216 152 211L153 236Q120 242 87 236Z" fill="url(#gold)" stroke="#e7c36e"/>
  <path d="M89 219Q120 224 151 219M88 229Q120 234 152 229" fill="none" stroke="#735022" stroke-width="2"/>`;
const backHead = `<path d="M108 76L107 95Q118 106 132 96L131 74Z" fill="url(#skin)" stroke="#936752"/>
  <path d="M95 30Q89 11 109 8Q127 1 141 16Q155 26 149 48L144 77Q135 94 118 91Q105 85 99 70L92 49Z" fill="#0b1018" stroke="#47505c" stroke-width="1.2"/>
  <path d="M105 19Q115 40 104 59Q100 74 115 86M126 15Q141 40 131 60Q126 75 136 81" fill="none" stroke="#273140" stroke-width="1.2"/>`;

function rig(name, back = false) {
  let drawing = `<g class="${name}-rig" transform="translate(8 0) scale(.933333 1)" stroke-linecap="round" stroke-linejoin="round">
  <g class="${name}-leg-left">
    <path d="M88 231L119 241L97 336L72 330Z" fill="url(#jacket)" stroke="#596170" stroke-width="1.4"/>
    <path d="M99 252L85 318" fill="none" stroke="#66707e" opacity=".55"/>
    <circle cx="96" cy="248" r="2" fill="#cdd2d7"/>
    <g class="${name}-calf-left">
      <path d="M72 328L97 334L74 404L51 400Z" fill="url(#jacket)" stroke="#596170" stroke-width="1.4"/>
      <path d="M85 343L62 393" stroke="#66707e" opacity=".55"/>
      <path d="M51 400L74 404L70 417L47 414Z" fill="#f0f0e8" stroke="#cbd0d1"/>
      <g class="${name}-foot-left">
        <path d="M47 410L70 414L70 423Q62 431 38 431L23 430Q20 423 31 419Z" fill="#0a0e14" stroke="#75818d" stroke-width="1.4"/>
        <path d="M26 427L65 426" stroke="#a6adb6" stroke-width="1.2"/>
      </g>
    </g>
  </g>
  <g class="${name}-leg-right">
    <path d="M121 241L152 231L168 330L143 336Z" fill="url(#jacket)" stroke="#596170" stroke-width="1.4"/>
    <path d="M141 252L155 318" fill="none" stroke="#66707e" opacity=".55"/>
    <circle cx="144" cy="248" r="2" fill="#cdd2d7"/>
    <g class="${name}-calf-right">
      <path d="M143 334L168 328L189 400L166 404Z" fill="url(#jacket)" stroke="#596170" stroke-width="1.4"/>
      <path d="M155 343L178 393" stroke="#66707e" opacity=".55"/>
      <path d="M166 404L189 400L193 414L170 417Z" fill="#f0f0e8" stroke="#cbd0d1"/>
      <g class="${name}-foot-right">
        <path d="M170 414L193 410L208 419Q219 423 216 430L201 431Q177 431 170 423Z" fill="#0a0e14" stroke="#75818d" stroke-width="1.4"/>
        <path d="M175 426L213 427" stroke="#a6adb6" stroke-width="1.2"/>
      </g>
    </g>
  </g>
  ${back ? backTorso : torso}
  <g class="${name}-arm-left">
    <path d="M70 105L86 113L65 176L47 169Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>
    <path d="M50 153L67 159L63 171L46 165Z" fill="url(#gold)" stroke="#e6c16a"/>
    <g class="${name}-forearm-left">
      <path d="M47 168L65 175L53 225L35 220Z" fill="#e4e9e8" stroke="#a3adae" stroke-width="1.3"/>
      <path d="M45 180L61 185M42 191L58 196M39 202L55 207" stroke="#99a6a7" stroke-width="1.2"/>
      <path d="M38 221L52 226L51 238L44 244L32 239L30 231Z" fill="url(#skin)" stroke="#7d584b"/>
      <path d="M35 231L45 234M37 237L45 239" stroke="#9f705b"/>
    </g>
  </g>
  <g class="${name}-arm-right">
    <path d="M154 113L170 105L193 169L175 176Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>
    <g class="${name}-forearm-right">
      <path d="M175 169L193 165L205 220L187 226Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>
      <path d="M181 181L197 177" stroke="#8d2933" stroke-width="2"/>
      <path d="M189 226L202 221L210 232L208 240L196 244L189 238Z" fill="url(#skin)" stroke="#7d584b"/>
      <path d="M196 234L205 231M196 239L203 237" stroke="#9f705b"/>
    </g>
  </g>
  <g class="${name}-head">${back ? backHead : head}</g>
</g>`;
  // 背面では、胸の前でたたんだ腕をジャケットの後ろへ隠す。
  if (back) drawing = drawing.replace(backTorso, "").replace(`<g class="${name}-head">`, `${backTorso}<g class="${name}-head">`);
  return drawing;
}
const pivots = {
  'arm-left': '78px 109px', 'forearm-left': '55px 170px',
  'arm-right': '162px 109px', 'forearm-right': '185px 170px',
  'leg-left': '102px 239px', 'calf-left': '84px 330px',
  'leg-right': '138px 239px', 'calf-right': '156px 330px',
  head: '120px 91px',
};
const jointCSS = (name) => Object.entries(pivots).map(([part, pivot]) => `.${name}-${part} { transform-box: view-box; transform-origin: ${pivot}; }`).join('\n');
const rotateFrames = (name, frames) => `@keyframes ${name} { ${frames.map(([time, angle]) => `${time}% { transform: rotate(${angle}deg); }`).join(' ')} }`;
const write = (name, style, drawing) => writeFileSync(new URL(`../public/animations/mindfulness-stage-${name}.svg`, import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 440" width="240" height="440">
${defs}
<style>${style}</style>
${drawing}
</svg>\n`);

let spin = jointCSS('spin') + `
.spin-turn { transform-box: view-box; transform-origin: 120px 240px; animation: spin-turn 4400ms linear infinite; }
.spin-front { animation: spin-front 4400ms steps(1,end) infinite; }
.spin-back { opacity: 0; animation: spin-back 4400ms steps(1,end) infinite; }
@keyframes spin-turn { 0% { transform: scaleX(1); } 10% { transform: scaleX(.06); } 20% { transform: scaleX(1); } 30% { transform: scaleX(.06); } 40%,100% { transform: scaleX(1); } }
@keyframes spin-front { 0%,9.99% { opacity: 1; } 10%,29.99% { opacity: 0; } 30%,100% { opacity: 1; } }
@keyframes spin-back { 0%,9.99% { opacity: 0; } 10%,29.99% { opacity: 1; } 30%,100% { opacity: 0; } }
.spin-arm-left { animation: spin-arm-left 4400ms ease-in-out infinite; }
.spin-arm-right { animation: spin-arm-right 4400ms ease-in-out infinite; }
.spin-forearm-left { animation: spin-forearm-left 4400ms ease-in-out infinite; }
.spin-forearm-right { animation: spin-forearm-right 4400ms ease-in-out infinite; }
.spin-leg-right { animation: spin-kick-thigh 4400ms ease-in-out infinite; }
.spin-calf-right { animation: spin-kick-calf 4400ms ease-in-out infinite; }
.spin-head { animation: spin-head 4400ms ease-in-out infinite; }
`;
spin += rotateFrames('spin-arm-left', [[0,0],[9,-35],[34,-35],[44,0],[100,0]]);
spin += rotateFrames('spin-arm-right', [[0,0],[9,35],[34,35],[44,0],[100,0]]);
spin += rotateFrames('spin-forearm-left', [[0,0],[9,-110],[34,-110],[44,0],[100,0]]);
spin += rotateFrames('spin-forearm-right', [[0,0],[9,110],[34,110],[44,0],[100,0]]);
spin += '@keyframes spin-kick-thigh { 0%,45% { transform: rotate(0deg) scale(1,1); } 55% { transform: rotate(28deg) scale(1,1); } 68%,74% { transform: rotate(-55deg) scale(.85,.37); } 86%,100% { transform: rotate(0deg) scale(1,1); } }';
spin += rotateFrames('spin-kick-calf', [[0,0],[45,0],[55,-118],[68,0],[74,0],[86,0],[100,0]]);
spin += rotateFrames('spin-head', [[0,0],[45,0],[62,-6],[82,0],[100,0]]);
spin += '@media (prefers-reduced-motion: reduce) { .spin-turn, .spin-front, .spin-back, .spin-arm-left, .spin-arm-right, .spin-forearm-left, .spin-forearm-right, .spin-leg-right, .spin-calf-right, .spin-head { animation: none; } .spin-leg-right { transform: rotate(-55deg) scale(.85,.37); } .spin-calf-right { transform: rotate(0deg); } }';
write('spin-kick', spin, `<g class="spin-turn"><g class="spin-back"><g transform="translate(240 0) scale(-1 1)">${rig('spin', true)}</g></g><g class="spin-front">${rig('spin')}</g></g>`);

let robot = jointCSS('robot');
const robotAngles = {
  'arm-left': [0,70,25,0,60,0], 'forearm-left': [0,-95,-115,-150,-100,0],
  'arm-right': [0,-70,-15,-60,-30,0], 'forearm-right': [0,95,125,100,110,0],
  'calf-left': [0,-6,0,5,0,0], 'calf-right': [0,0,6,0,-5,0],
  head: [0,-12,-12,10,10,0],
};
for (const [part, angles] of Object.entries(robotAngles)) {
  robot += `.robot-${part} { animation: robot-${part} 3800ms cubic-bezier(.65,0,.25,1) infinite; }\n`;
  const frames = [];
  for (let i = 0; i < angles.length; i++) {
    frames.push([i * 18, angles[i]]);
    frames.push([Math.min(i * 18 + 12, 100), angles[i]]);
  }
  robot += rotateFrames(`robot-${part}`, frames);
}
robot += '@media (prefers-reduced-motion: reduce) { .robot-arm-left, .robot-arm-right, .robot-forearm-left, .robot-forearm-right, .robot-calf-left, .robot-calf-right, .robot-head { animation: none; } .robot-arm-left { transform: rotate(70deg); } .robot-forearm-left { transform: rotate(-95deg); } .robot-arm-right { transform: rotate(-70deg); } .robot-forearm-right { transform: rotate(95deg); } .robot-head { transform: rotate(-12deg); } }';
write('robot', robot, rig('robot'));
