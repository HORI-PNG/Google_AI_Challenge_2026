// 段階6：UI テーマのテスト
// 実行：npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  recommendTheme,
  THEME_IDS,
  THEMES,
} from "../../src/lib/themes.ts";

const css = readFileSync("src/app/globals.css", "utf8");

describe("テーマの定義", () => {
  test("7種類で、ID が重ならない", () => {
    assert.equal(THEMES.length, 7);
    assert.deepEqual(
      THEMES.map((t) => t.id),
      [...THEME_IDS],
    );
  });

  test("すべてのテーマに globals.css の見た目と、テーマを選ぶ画面の見本の色がある", () => {
    for (const id of THEME_IDS) {
      if (id !== DEFAULT_THEME_ID) {
        assert.match(css, new RegExp(`:root\\[data-theme="${id}"\\]`), `${id} の変数`);
      }
      assert.match(css, new RegExp(`\\.theme-${id} \\{`), `${id} の見本`);
    }
  });

  test("知らない ID は標準テーマとして扱う", () => {
    assert.equal(isThemeId("metal"), false);
    assert.equal(isThemeId("kotori"), true);
    assert.equal(getTheme("kotori").layout, "notebook");
    assert.equal(getTheme("clear").layout, "glass");
    assert.equal(getTheme("office").layout, "office");
  });
});

describe("気分でのおすすめ", () => {
  const s = (mood, stress, energy = 50, focus = 50) => ({ mood, energy, focus, stress });

  test("ストレスが高い日は、もりのとしょかん（夜でもこちらを優先）", () => {
    assert.equal(recommendTheme({ scores: s(80, 70), hour: 14 }).themeId, "mori");
    assert.equal(recommendTheme({ scores: s(50, 65), hour: 23 }).themeId, "mori");
  });

  test("夜おそい時間（22時〜3時）は、よぞら", () => {
    assert.equal(recommendTheme({ scores: s(80, 20), hour: 22 }).themeId, "yozora");
    assert.equal(recommendTheme({ scores: null, hour: 2 }).themeId, "yozora");
  });

  test("気分が高い日は、ソーダ", () => {
    assert.equal(recommendTheme({ scores: s(70, 20), hour: 10 }).themeId, "soda");
  });

  test("ふつうの日や、日記がまだない日は、ことり", () => {
    assert.equal(recommendTheme({ scores: s(55, 40), hour: 10 }).themeId, "kotori");
    assert.equal(recommendTheme({ scores: null, hour: 10 }).themeId, "kotori");
  });

  test("おすすめは「やさしい」まとまりからだけ出す", () => {
    for (let hour = 0; hour < 24; hour++) {
      for (const scores of [null, s(90, 10), s(10, 90), s(50, 50)]) {
        const { themeId } = recommendTheme({ scores, hour });
        assert.equal(getTheme(themeId).group, "gentle");
      }
    }
  });
});
