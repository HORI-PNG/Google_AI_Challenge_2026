# 瞑想キャラクターの再生成

承認済みの黒金衣装・サングラス・肩下までの後ろ髪を持つ人物を作り、
共通の骨格で4つの動きを付ける。アプリではGLBを読み込み、
静止とダンスを同じモデルで表示する。

## アプリを動かす場合

配布用GLBと静止画は `public/animations/` に含めているため、
Blenderや素材のダウンロードは不要。通常の `npm install` とアプリの起動で使える。

## 素材を再生成する場合

Blender 4.3.2とNode.jsを使用する。以下はリポジトリのルートから実行する。
Pythonの補助処理を使う場合は先に仮想環境を作り、その環境で実行する。
BlenderのスクリプトはBlender内蔵Pythonで動く。

```sh
python3 -m venv scripts/mindfulness-3d/.venv
blender -b -t 6 --python scripts/mindfulness-3d/build_character.py -- --model-only
blender -b -t 6 --python scripts/mindfulness-3d/animate_character.py -- --output=scripts/mindfulness-3d/export/character-raw.glb
npx --yes gltfpack@1.3.0 -i scripts/mindfulness-3d/export/character-raw.glb -o public/animations/mindfulness-stage-character.glb -cc -kn -km -ke -af 24
cp scripts/mindfulness-3d/export/mindfulness-stage-idle.png public/animations/mindfulness-stage-idle.png
```

`animate_character.py` に `--render-stills` を加えると、各動きの確認用画像も作る。
生成された `.blend` は編集用で、Gitには含めない。

## 動きと表示

- `singing`：右手のマイクを口元に上げ、顎・頭・体を動かす。
- `spin-kick`：全身が一周してから片脚を前へ蹴り上げる。
- `robot`：首・肘・手首・膝を区切って動かす。
- `moonwalk`：横を向き、交互にかかとを上げながら足を滑らせる。

全クリップは繰り返せるよう先頭と末尾の姿勢を揃えている。
瞑想中はクリップを再生しない。マイクは歌唱時だけ表示する。
WebGLが利用できない場合は、同じ人物の透過PNGを表示する。

## 出所と利用条件

人体、変形、骨格、ウェイトはMakeHuman公式のCC0 1.0 Universal素材を使用。
同梱の `source/MAKEHUMAN-LICENSE.md` と `source/LICENSE.ASSETS.md`、
取得URL・SHA-256を記録した `sources.json` を参照。
MakeHumanのプログラム本体は組み込んでいない。

髪・眼鏡・衣装装飾・靴・舞台・マイクとアニメーションはこの機能のために作成。
参考写真、動画、楽曲、第三者の人物モデルやモーションは配布物に含めない。
glTFの表示にはThree.js（MIT）、配布用データの圧縮にはgltfpack（MIT）を使用する。
