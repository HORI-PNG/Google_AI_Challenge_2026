// 静止用の衣装を引き継ぎ、1分経過後に使う歌唱アニメーションを生成する。
import { readFileSync, writeFileSync } from "node:fs";

let svg = readFileSync(new URL("../public/animations/mindfulness-stage-performer.svg", import.meta.url), "utf8");
function replace(before, after) {
  if (!svg.includes(before)) throw new Error(`素材の構造が変わっています: ${before.slice(0, 50)}`);
  svg = svg.replace(before, after);
}

replace('  <!-- 足を開き、腕を下げて静止する舞台衣装。帽子やダンスの決めポーズは使わない。 -->', `  <style>
    .singer-forearm { transform-box: view-box; transform-origin: 180px 158px; animation: singer-mic-lift 800ms cubic-bezier(.2,.7,.3,1) both; }
    .singer-head { transform-box: view-box; transform-origin: 120px 91px; animation: singer-nod 1300ms 800ms ease-in-out infinite; }
    .singer-mouth { transform-box: view-box; transform-origin: 119px 71px; animation: singer-syllables 1050ms 800ms ease-in-out infinite; }
    @keyframes singer-mic-lift { from { transform: rotate(-160deg); } to { transform: rotate(0deg); } }
    @keyframes singer-nod { 0%, 100% { transform: rotate(-1deg); } 45% { transform: rotate(2deg); } 75% { transform: rotate(0deg); } }
    @keyframes singer-syllables { 0%, 18%, 52%, 80%, 100% { transform: scaleY(.25); } 10%, 35%, 68%, 90% { transform: scaleY(1); } }
    @media (prefers-reduced-motion: reduce) { .singer-forearm, .singer-head, .singer-mouth { animation: none; } }
  </style>
  <!-- マイクを口元へ上げ、口と頭を動かす。静止中の素材とは分けて開始時刻を守る。 -->`);
replace('    <path d="M162 104Q178 102 183 122L197 173L205 220L187 226L173 180L154 140Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>',
  '    <path d="M162 104Q179 104 184 123L190 152Q193 163 182 169L170 161L154 128Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>');
replace('    <path d="M183 181L194 178" stroke="#8d2933" stroke-width="2"/>',
  '    <path d="M173 144L186 140" stroke="#8d2933" stroke-width="2"/>');
replace('    <path d="M189 226L202 221L210 232L208 240L196 244L189 238Z" fill="url(#skin)" stroke="#7d584b"/>', '');
replace('    <path d="M35 231L45 234M37 237L45 239M196 234L205 231M196 239L203 237" stroke="#9f705b"/>',
  '    <path d="M35 231L45 234M37 237L45 239" stroke="#9f705b"/>');
replace('    <!-- 顔の細部を描き込まず、髪とサングラスで舞台姿を表す。 -->',
  '    <!-- 頭は首元を軸に小さく動かす。 -->\n    <g class="singer-head">');
replace('    <path d="M120 51L116 61L122 63M115 70L124 70" fill="none" stroke="#a5735e" stroke-width="1.2"/>',
  `    <path d="M120 51L116 61L122 63" fill="none" stroke="#a5735e" stroke-width="1.2"/>
    <g class="singer-mouth">
      <ellipse cx="119" cy="71" rx="4.2" ry="5.2" fill="#542a2b" stroke="#a5735e" stroke-width="1"/>
      <path d="M116 68H122" stroke="#edddd2" stroke-width="1.7"/>
      <path d="M117 74Q119 72 121 74" fill="none" stroke="#bb6c6d" stroke-width="1.5"/>
    </g>
    </g>
    <!-- 肘を軸にマイクを持つ前腕を上げる。顔より手前に描く。 -->
    <g class="singer-forearm">
      <path d="M187 154Q193 165 181 170L169 164L132 104L146 96Z" fill="url(#jacket)" stroke="#667181" stroke-width="1.4"/>
      <path d="M135 105L148 98" stroke="#778392" stroke-width="1.5"/>
      <g aria-label="マイク" transform="translate(7 5)">
        <path d="M128 80L149 103" stroke="#111924" stroke-width="7"/>
        <path d="M129 81L147 101" stroke="#a5b0b9" stroke-width="2.2"/>
        <ellipse cx="124" cy="75" rx="7.5" ry="10" transform="rotate(-42 124 75)" fill="#a8b5be" stroke="#172536" stroke-width="1.5"/>
        <path d="M118 70L128 79M117 73L126 81M121 68L131 77" stroke="#344858" stroke-width="1"/>
      </g>
      <path d="M133 102L144 96L141 85Q138 79 133 83L127 88L128 95Z" fill="url(#skin)" stroke="#7d584b" stroke-width="1.2"/>
      <path d="M131 89L139 93M130 93L138 97" stroke="#a2735a"/>
    </g>`);
writeFileSync(new URL("../public/animations/mindfulness-stage-singing.svg", import.meta.url), svg);
