import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MINDFULNESS_CHARACTER_MODEL, MINDFULNESS_CHARACTER_POSTER, MINDFULNESS_FINISHES, pickMindfulnessFinish } from "../../src/lib/mindfulness.ts";

describe("瞑想終了時のムーブ", () => {
  it("歌唱と3つの追加ムーブを選択でき、3D素材と静止画が配置されている", () => {
    const choices = [0, 0.25, 0.5, 0.75].map((value) => pickMindfulnessFinish(null, () => value).id);
    assert.equal(new Set(choices).size, 4);
    for (const finish of MINDFULNESS_FINISHES) {
      assert.ok(choices.includes(finish.id));
    }
    for (const source of [MINDFULNESS_CHARACTER_MODEL, MINDFULNESS_CHARACTER_POSTER]) {
      assert.ok(existsSync(new URL(`../../public${source}`, import.meta.url)), source);
    }
  });

  it("直前のムーブを除いた候補すべてから選べる", () => {
    for (const previous of MINDFULNESS_FINISHES) {
      const choices = [0, 0.34, 0.67, 0.999999].map((value) => pickMindfulnessFinish(previous.id, () => value));
      assert.equal(new Set(choices.map((finish) => finish.id)).size, 3);
      assert.ok(choices.every((finish) => finish.id !== previous.id));
    }
  });
});

/** ヘッダーとチャンク境界を調べ、実際に配布するGLBの値を読む。 */
function readGlb(url) {
  const file = readFileSync(url);
  assert.ok(file.length >= 28, "GLBが途中で切れていない");
  assert.equal(file.readUInt32LE(0), 0x46546c67, "GLBの識別子");
  assert.equal(file.readUInt32LE(4), 2, "glTF 2形式");
  assert.equal(file.readUInt32LE(8), file.length, "宣言されたファイル長が一致する");
  const chunks = [];
  for (let offset = 12; offset < file.length;) {
    assert.ok(offset + 8 <= file.length, "チャンクのヘッダーが欠けていない");
    const length = file.readUInt32LE(offset);
    const type = file.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0, "チャンクが4バイト境界にそろっている");
    assert.ok(length > 0 && offset + 8 + length <= file.length, "チャンクの内容が欠けていない");
    chunks.push({ type, data: file.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.equal(chunks[0].type, 0x4e4f534a, "先頭はJSONチャンク");
  assert.equal(chunks.filter((chunk) => chunk.type === 0x4e4f534a).length, 1);
  const document = JSON.parse(chunks[0].data.toString("utf8").trim());
  assert.equal(document.asset.version, "2.0");
  const binaries = chunks.filter((chunk) => chunk.type === 0x004e4942);
  assert.equal(binaries.length, 1, "バイナリを1つのGLBに内包する");
  assert.ok(document.buffers.length > 0);
  assert.equal(document.buffers[0].uri, undefined, "外部のバッファーを必要としない");
  const binary = binaries[0].data;
  const byteLength = document.buffers[0].byteLength;
  assert.ok(Number.isInteger(byteLength) && byteLength > 0 && byteLength <= binary.length);
  assert.ok(binary.length - byteLength <= 3, "末尾はGLBのパディングだけ");
  for (const buffer of document.buffers.slice(1)) {
    assert.equal(buffer.uri, undefined, "外部ファイルを必要としない");
    assert.equal(buffer.extensions?.EXT_meshopt_compression?.fallback, true,
      "追加バッファーは圧縮データの展開先");
  }

  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const readers = {
    5120: [1, "getInt8"], 5121: [1, "getUint8"],
    5122: [2, "getInt16"], 5123: [2, "getUint16"],
    5125: [4, "getUint32"], 5126: [4, "getFloat32"],
  };
  const cache = new Map();
  function accessor(index) {
    if (cache.has(index)) return cache.get(index);
    assert.ok(Number.isInteger(index) && document.accessors[index], `accessor ${index}が存在する`);
    const definition = document.accessors[index];
    assert.equal(definition.sparse, undefined, "配布モデルの値はバッファーに内包する");
    const view = document.bufferViews[definition.bufferView];
    assert.ok(view && document.buffers[view.buffer], `accessor ${index}のバッファーが存在する`);
    const width = components[definition.type];
    const reader = readers[definition.componentType];
    assert.ok(width && reader, `accessor ${index}の型を読める`);
    assert.ok(Number.isInteger(definition.count) && definition.count > 0);
    const [size, method] = reader;
    const stride = view.byteStride ?? width * size;
    const viewStart = view.byteOffset ?? 0;
    const start = viewStart + (definition.byteOffset ?? 0);
    assert.ok(stride >= width * size && start >= viewStart);
    assert.ok(viewStart + view.byteLength <= document.buffers[view.buffer].byteLength,
      "bufferViewが宣言されたバッファー内に収まる");
    assert.ok(start + (definition.count - 1) * stride + width * size <= viewStart + view.byteLength,
      `accessor ${index}がbufferView内に収まる`);
    const compressed = view.extensions?.EXT_meshopt_compression;
    if (compressed) {
      assert.equal(compressed.buffer, 0, "圧縮データがGLBに内包されている");
      assert.ok(Number.isInteger(compressed.byteOffset ?? 0) && (compressed.byteOffset ?? 0) >= 0);
      assert.ok(Number.isInteger(compressed.byteLength) && compressed.byteLength > 0);
      assert.ok((compressed.byteOffset ?? 0) + compressed.byteLength <= byteLength,
        "圧縮データが途中で切れていない");
      assert.ok(Number.isInteger(compressed.count) && compressed.count > 0);
      assert.ok(Number.isInteger(compressed.byteStride) && compressed.byteStride > 0);
      assert.equal(compressed.count * compressed.byteStride, view.byteLength);
      assert.ok(["ATTRIBUTES", "TRIANGLES", "INDICES"].includes(compressed.mode));
      for (const value of [...(definition.min ?? []), ...(definition.max ?? [])]) {
        assert.ok(Number.isFinite(value), "圧縮accessorの境界値が有限");
      }
      // 展開後のNaN・姿勢・ループはMeshoptDecoder付きGLTFLoaderでも検証する。
      const result = { ...definition, width, values: null };
      cache.set(index, result);
      return result;
    }
    assert.equal(view.buffer, 0, "未圧縮の実データはGLBに内包する");
    const data = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    const values = new Float64Array(definition.count * width);
    for (let row = 0; row < definition.count; row++) {
      for (let column = 0; column < width; column++) {
        let value = data[method](start + row * stride + column * size, true);
        if (definition.normalized) {
          const maximum = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[definition.componentType];
          assert.ok(maximum, "正規化できる整数型");
          value = Math.max(-1, value / maximum);
        }
        assert.ok(Number.isFinite(value), `accessor ${index}にNaNや無限大がない`);
        values[row * width + column] = value;
      }
    }
    const result = { ...definition, width, values };
    cache.set(index, result);
    return result;
  }
  return { document, accessor };
}

describe("配布する3Dキャラクター", () => {
  function model() {
    const source = MINDFULNESS_CHARACTER_MODEL;
    assert.match(source, /^\/animations\/[^/]+\.glb$/);
    return readGlb(new URL(`../../public${source}`, import.meta.url));
  }

  it("骨格とウェイトを持ち、関節で動かせるメッシュを含む", () => {
    const { document, accessor } = model();
    const skinnedNodes = document.nodes.filter((node) => node.skin !== undefined && node.mesh !== undefined);
    assert.ok(skinnedNodes.length > 0, "スキン付きメッシュが存在する");
    for (const node of skinnedNodes) {
      const skin = document.skins[node.skin];
      const mesh = document.meshes[node.mesh];
      assert.ok(skin?.joints?.length > 0 && mesh?.primitives?.length > 0);
      assert.ok(skin.joints.every((joint) => Number.isInteger(joint) && document.nodes[joint]));
      if (skin.inverseBindMatrices !== undefined) {
        const inverse = accessor(skin.inverseBindMatrices);
        assert.equal(inverse.type, "MAT4");
        assert.equal(inverse.count, skin.joints.length);
      }
      for (const primitive of mesh.primitives) {
        const position = accessor(primitive.attributes.POSITION);
        const joints = accessor(primitive.attributes.JOINTS_0);
        const weights = accessor(primitive.attributes.WEIGHTS_0);
        assert.equal(position.type, "VEC3");
        assert.equal(joints.type, "VEC4");
        assert.equal(weights.type, "VEC4");
        assert.equal(joints.count, position.count);
        assert.equal(weights.count, position.count);
        if (joints.values) {
          assert.ok(joints.values.every((joint) => Number.isInteger(joint) && joint >= 0 && joint < skin.joints.length));
        }
        if (weights.values) {
          assert.ok(weights.values.every((weight) => weight >= 0 && weight <= 1));
          assert.ok(weights.values.some((weight) => weight > 0), "頂点が骨格に結び付いている");
        }
      }
    }
  });

  it("4種類の終了ムーブが正の再生時間と有効なキーを持つ", () => {
    const { document, accessor } = model();
    const expected = ["singing", "spin-kick", "robot", "moonwalk"];
    assert.deepEqual(MINDFULNESS_FINISHES.map((finish) => finish.id).sort(), expected.sort());
    assert.deepEqual(document.animations.map((clip) => clip.name).sort(), expected.sort());
    for (const clip of document.animations) {
      assert.ok(clip.channels.length > 0 && clip.samplers.length > 0, clip.name);
      let duration = 0;
      let moves = false;
      let compressedValues = false;
      for (const channel of clip.channels) {
        assert.ok(document.nodes[channel.target.node], "動かす対象が存在する");
        assert.ok(["translation", "rotation", "scale"].includes(channel.target.path));
        const sampler = clip.samplers[channel.sampler];
        assert.ok(sampler, "アニメーションの値が存在する");
        const input = accessor(sampler.input);
        const output = accessor(sampler.output);
        assert.equal(input.type, "SCALAR");
        assert.equal(input.componentType, 5126);
        assert.equal(output.type, channel.target.path === "rotation" ? "VEC4" : "VEC3");
        assert.ok(input.min?.length === 1 && input.max?.length === 1, "再生時刻の境界値が存在する");
        assert.ok(Number.isFinite(input.min[0]) && Number.isFinite(input.max[0]));
        assert.ok(Math.abs(input.min[0]) < 0.000001, "時刻0から再生できる");
        assert.ok(input.max[0] >= input.min[0]);
        if (input.values) {
          assert.ok(Math.abs(input.min[0] - input.values[0]) < 0.00001);
          assert.ok(Math.abs(input.max[0] - input.values.at(-1)) < 0.00001);
          for (let index = 1; index < input.count; index++) {
            assert.ok(input.values[index] > input.values[index - 1], "キーの時刻が順に進む");
          }
        }
        duration = Math.max(duration, input.max[0]);
        const interpolation = sampler.interpolation ?? "LINEAR";
        assert.ok(["LINEAR", "STEP", "CUBICSPLINE"].includes(interpolation));
        const multiplier = interpolation === "CUBICSPLINE" ? 3 : 1;
        assert.equal(output.count, input.count * multiplier);
        if (!output.values) {
          compressedValues = true;
          continue;
        }
        const firstIndex = interpolation === "CUBICSPLINE" ? 1 : 0;
        const lastIndex = interpolation === "CUBICSPLINE" ? output.count - 2 : output.count - 1;
        const first = output.values.subarray(firstIndex * output.width, (firstIndex + 1) * output.width);
        const last = output.values.subarray(lastIndex * output.width, (lastIndex + 1) * output.width);
        const same = first.every((value, index) => Math.abs(value - last[index]) < 0.0001);
        const oppositeQuaternion = channel.target.path === "rotation"
          && first.every((value, index) => Math.abs(value + last[index]) < 0.0001);
        assert.ok(same || oppositeQuaternion, `${clip.name}の${channel.target.path}がループの継ぎ目で跳ばない`);
        for (let key = 1; key < input.count - 1 && !moves; key++) {
          const row = key * multiplier + firstIndex;
          const current = output.values.subarray(row * output.width, (row + 1) * output.width);
          const differs = current.some((value, index) => Math.abs(value - first[index]) > 0.0001);
          const onlyQuaternionSign = channel.target.path === "rotation"
            && current.every((value, index) => Math.abs(value + first[index]) < 0.0001);
          if (differs && !onlyQuaternionSign) moves = true;
        }
        if (interpolation === "CUBICSPLINE" && !moves) {
          moves = output.values.some((value, index) => Math.floor(index / output.width) % 3 !== 1 && Math.abs(value) > 0.0001);
        }
      }
      assert.ok(Number.isFinite(duration) && duration > 0, `${clip.name}の再生時間が正`);
      if (!compressedValues) assert.ok(moves, `${clip.name}に実際の動きがある`);
    }
  });
});
