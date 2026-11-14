# Veo 3 用プロンプト：「湖の底の夢」（ずっと一人称視点）

Veo 3 は 1 回で **約 8 秒**の動画を作ります。ストーリーを 15 カットに分け、つなげて約 2 分の動画にします。

## 使い方

1. 各カットの **プロンプト（英語）** を、そのまま Veo 3（Flow または Gemini アプリ）に貼る。英語のほうが、意図どおりの絵になりやすい
2. 末尾の **共通スタイル** を、毎回プロンプトの最後に付ける（色・質感・視点がカット間でそろう）
3. つなぎ目をなめらかにするには、Flow の **「Extend（続きを作る）」** か **「Frames to Video」** を使う。前のカットの最後の 1 コマを、次のカットの最初の絵にする
4. ネガティブプロンプトが使える場合は、末尾の **共通ネガティブ** を入れる
5. 気に入らないカットは、同じプロンプトで 2〜4 回作り直して選ぶ（Veo は毎回少しずつ違う絵になる）

## Google Flow の無料枠で作るときの進め方

1 日に使えるクレジットが少ない（紹介記事では 1 日 50 クレジット、毎日回復）ので、**大事なカットから順に、1 日数本ずつ**作る。

1. https://labs.google/flow を開き、Google アカウントでログインする
2. モデルは **Veo 3.1 - Lite、16:9、×1** にする（2026-11-14 に画面で確認した 1 本あたりの消費量は下の表）

   | モデル | 画質 | 8 秒 ×1 |
   |---|---|---|
   | **Veo 3.1 - Lite** | 720p | **10 クレジット** ← いちばん得 |
   | Omni 1.2 Flash | 360p | 8 クレジット |
   | Omni 1.2 Flash | 720p | 24 クレジット |

   ×2・×3 にすると、その倍数だけクレジットが増える（同時に複数案ができる）
3. 下の **優先順** に、1 日に作れる本数だけ作る。気に入らなければ翌日に作り直す
4. 作れたカットはダウンロードして、番号つきのファイル名（`01_forest.mp4` など）で保存しておく

### 優先順（ストーリーの芯になるカットから）

| 順 | カット | 理由 |
|---|---|---|
| 1 | 13 棺の中の自分 | 話のオチ。これがないと伝わらない |
| 2 | 2 不自然に手入れされた湖 | 「怪しい」雰囲気の入口 |
| 3 | 7 小島の石の台と空の水盤 | 見せ場の一つ |
| 4 | 9 なぜか空が見える | 「湖のはずなのに」の驚き |
| 5 | 11 地形が崩れ始める | いちばん動きのある場面 |
| 6 | 14 真っ白になる | 結末 |
| 7〜 | 1, 4, 6, 10, 12, 3, 5, 8, 15 | つなぎの場面。足りなければ静止画や短いカットで代用 |

- 無料枠では、1 カット 8 秒ではなく **4〜6 秒** にすると本数を増やせる場合がある（長さで消費量が変わるなら）
- 毎日のクレジットが足りない場合は、つなぎの場面を Gemini アプリの画像（静止画）にして、編集でゆっくりズームさせる

## 注意（権利と生成のしやすさ）

- **作品名・キャラクター名はプロンプトに書かない**：「ハリーポッター」「リゼロ」「もののけ姫」「メイドインアビス」などの名前や表紙は、生成を断られたり、崩れた文字になったりする。応募や公開に使うなら、権利の面でも避けたほうが安全
  - 洞窟の場面は、「湖の中の小島に、石の台と空の水盤がある」と言い換えている
  - 棺のそばの本は、「表紙に文字のない、使い込まれたファンタジー小説と漫画の単行本」にしている。作品名を見せたい場合は、あとで編集ソフトで小さな字幕として入れるのがおすすめ
- **棺の中の「自分」**：Veo は使う人の顔を知らない。自分に似せたい場合は、Flow の **画像から動画（Ingredients / 参照画像）** に自分の写真を入れる。そうでなければ、カット 13 の 【自分の見た目】 を書き換える
- **心の声**（カット 13）：Veo 3 は声も作れる。日本語の声が不自然な場合は、声なしで作り、あとから自分の声やナレーションを重ねる

---

## カット一覧

| # | 場面 | 秒 |
|---|---|---|
| 1 | 日の落ちかけた森を進む | 8 |
| 2 | 木をかき分けると、不自然に手入れされた湖 | 8 |
| 3 | 湖に入り、水の中へ | 8 |
| 4 | 湖の底：人骨と、誰かが住んでいた跡 | 8 |
| 5 | 湖底の横穴を泳いで抜ける | 8 |
| 6 | 水面に顔を出すと、美しい鍾乳洞 | 8 |
| 7 | 小島の石の台と、空の水盤。転がる聖杯と人骨 | 8 |
| 8 | 聖杯を拾う | 6〜8 |
| 9 | 奥へ進むと、なぜか空が見える | 8 |
| 10 | 何もない草原と、遠くのまがまがしい扉 | 8 |
| 11 | 近づくと地形が崩れ始め、走る | 8 |
| 12 | 扉をこじ開けて中へ | 8 |
| 13 | 葬儀場の入口から出て、棺の中の自分を見る | 8 |
| 14 | 聖杯を渡すと、すべてが真っ白に | 8 |
| 15 | 何もない白い部屋に、ひとり | 8 |

---

## プロンプト

### カット 1：日の落ちかけた森
> First-person POV walking slowly through a dense old-growth forest at dusk. The last orange sunlight glows low between the tree trunks while deep blue shadows gather. Moss-covered roots, ferns and fallen leaves underfoot. The viewer's pale hands occasionally push thin branches aside. The forest is unnaturally silent: no birds, only footsteps on dry leaves, the viewer's breathing, and a faint low wind. Something feels wrong, as if the forest is watching.

### カット 2：不自然に手入れされた湖
> First-person POV. The viewer's hands part two large leafy branches, revealing a perfectly still lake in a clearing at dusk. The surroundings are unnaturally manicured: lawn trimmed to exact height, a symmetrical ring of identical white stones along the shore, a single wooden pier that looks brand new, everything too clean and too quiet for the middle of a wild forest. The water is mirror-flat and reflects the dark orange sky. The camera stops, hesitant. Sound: total silence except a faint high-pitched ringing.

### カット 3：湖に入る
> First-person POV stepping off the end of the wooden pier and wading into the still, cold lake. The water rises from the knees to the chest; the viewer's hands skim the dark surface, creating slow ripples. The viewer takes a deep breath and submerges. The camera goes underwater: muffled sound, bubbles rising past the lens, murky green-blue water with the last rays of sunset filtering from above.

### カット 4：湖の底（人骨と、暮らしの跡）
> First-person POV swimming slowly underwater near the bottom of a deep, murky lake. Shafts of dim light from the surface. On the silty lake floor lie the remains of someone's life: a rotted wooden table and chair, a cracked teapot, a child's shoe, a tarnished picture frame with a faded photo, rusted cutlery. Among them rest several human skeletons half-buried in silt, one still sitting against the table. Particles drift in the water. The viewer's hands push forward in slow breaststrokes. Sound: muffled underwater ambience, distant low groaning of water, slow heartbeat.

### カット 5：横穴を泳いで抜ける
> First-person POV swimming toward a dark circular opening in the rock wall at the bottom of the lake, then entering a narrow underwater tunnel. Rough stone walls close in, scraped by the viewer's hands. Darkness, then a faint pale glow appears ahead and grows brighter. Air bubbles stream past. Tension builds; the viewer swims faster toward the light. Sound: muffled water, bubbles, tense breathing held in.

### カット 6：水面に顔を出すと、鍾乳洞
> First-person POV bursting up through the surface of a pool inside a vast limestone cave, gasping for air, water streaming down. Then the view steadies to reveal a breathtakingly beautiful cavern: countless stalactites and stalagmites, flowstone formations glittering with mineral crystals, soft blue-green bioluminescent light reflecting on wet rock, droplets falling and echoing. It is beautiful but deeply eerie. Sound: dripping water echoing, the viewer catching their breath.

### カット 7：小島の石の台と、空の水盤
> First-person POV walking across the dry floor of the limestone cave toward a small raised rock island in the center. On the island stands an ancient stone pedestal holding a wide, empty stone basin, completely dry, its inner surface stained dark as if something once filled it. Nearby on the ground lies an ornate tarnished silver goblet on its side, and beside it a human skeleton slumped against the pedestal as if it died reaching for the basin. Cold blue light from above. Sound: dripping water, faint whispering echoes that might be the wind.

### カット 8：聖杯を拾う
> First-person POV kneeling down beside the slumped skeleton. The viewer's pale hand slowly reaches out and picks up the ornate tarnished silver goblet from the cave floor, turning it in the light. Faint engravings shimmer on its surface. Dust falls from it. The skeleton's empty eye sockets seem to watch. Sound: the metallic scrape of the goblet, a low resonant hum.

### カット 9：なぜか空が見える
> First-person POV walking deeper through a narrowing limestone passage, holding the silver goblet in one hand. Warm daylight spills in from an opening ahead. The viewer steps out and, impossibly, finds open sky overhead: a vast pale sky with slow-moving clouds, although this place should be deep beneath the lake. The camera tilts up at the sky in disbelief, then back down. Sound: cave echoes fading into an open, airy silence and soft wind.

### カット 10：何もない草原と、まがまがしい扉
> First-person POV standing at the edge of an endless, empty grassland under a pale overcast sky. Waist-high grass sways in a gentle wind; there are no trees, no buildings, no animals. Far in the distance stands a single enormous ancient door with no walls around it, made of black weathered wood and twisted iron, covered in strange carvings, radiating dread. The viewer begins walking toward it through the grass. Sound: wind through grass, a deep distant drone.

### カット 11：地形が崩れ始める
> First-person POV running through the grassland toward the ominous freestanding door. Suddenly the ground begins to collapse: huge cracks rip through the earth, chunks of soil and grass break away and fall into a dark bottomless void, the horizon tilts. The viewer runs desperately, jumping over a widening gap, breathing hard, the door getting closer. Sound: deep rumbling, cracking earth, heavy breathing, pounding footsteps.

### カット 12：扉をこじ開けて中へ
> First-person POV reaching the huge ominous black door as the ground crumbles behind. The viewer's hands grab the cold iron ring handle and pull with all their strength; the door groans and slowly opens a crack, revealing only darkness inside. The viewer squeezes through into the dark. The door slams shut behind. Sound: grinding wood and iron, the rumble of collapse cut off abruptly into silence.

### カット 13：葬儀場で、棺の中の自分を見る
> First-person POV stepping out of the darkness through the entrance doors of a quiet, softly lit Japanese funeral hall. White chrysanthemums line the altar, incense smoke drifts, rows of empty folding chairs, no mourners. At the front lies an open wooden coffin. The viewer walks slowly to it and looks down: inside lies 【自分の見た目：例 a young Japanese person in their early twenties with short black hair】, peaceful, eyes closed, dressed in white. Placed near the head are several well-loved fantasy novels and manga volumes with plain, unmarked covers. The viewer's hands tremble on the edge of the coffin. A quiet inner-monologue voice whispers in Japanese: "そうか…もう死んでいて、夢を見ているのか。" Sound: soft temple bell, distant incense crackle, the whisper.

### カット 14：聖杯を渡すと、真っ白に
> First-person POV looking down into the open coffin at the peaceful sleeping figure. The viewer's hands gently place the tarnished silver goblet into the figure's folded hands. A soft warm light begins to glow from the goblet, then rapidly expands, flooding the entire funeral hall until everything dissolves into pure overexposed white. Sound: a gentle rising tone that swells and fades into silence.

### カット 15：何もない白い部屋に、ひとり
> First-person POV in a completely empty, seamless white room with no visible walls, corners, or light source. Absolute silence. The viewer slowly turns around once, looking for anything, but there is nothing. The camera finally lowers, gazing at the empty white floor, and stays still. Very slow fade to white. Sound: near silence, a single faint breath.

---

## 共通スタイル（毎回、プロンプトの最後に付ける）

> Style: photorealistic, cinematic, shot on an ARRI Alexa with a 24mm lens, 24fps, natural handheld first-person camera movement with subtle breathing sway, shallow depth of field, muted desaturated color grade with crushed blacks, eerie and melancholic atmosphere, film grain. Strictly first-person point of view: the camera is the viewer's eyes, only the viewer's own pale hands and forearms in dark long sleeves are ever visible. No on-screen text, no subtitles, no music.

## 共通ネガティブ（使える場合）

> text, subtitles, captions, watermark, logo, cartoon, anime style, third-person view, the viewer's own face visible, extra fingers, distorted hands, bright cheerful colors, background music

（カット 13 だけは、棺の中の「自分」の顔を出すので、ネガティブから "the viewer's own face visible" を外す）

## 仕上げのヒント

- カット 3〜5 は Extend で続けて作ると、水の中の流れが途切れない
- カット 9（空が見える瞬間）とカット 14（真っ白になる瞬間）は、編集で 0.5 秒ほどスローにすると効く
- BGM は Veo では付けず（プロンプトで "no music" にしている）、最後に編集ソフトで静かなピアノやドローン音を薄く重ねると、カット間の音のばらつきが隠れる
