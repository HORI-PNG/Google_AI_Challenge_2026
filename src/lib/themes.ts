// UI テーマの定義と、気分でのおすすめ。
// Node.js のテストから直接読み込むので、ほかのファイルを import しない。
// 見た目（色・フォント・角丸など）は src/app/globals.css の [data-theme="..."] にある。

/** 画面の構成の系統。系統が違うと、ホームの並べ方が変わる */
export type ThemeLayout = "notebook" | "glass" | "office";

export const THEME_IDS = ["kotori", "yozora", "mori", "soda", "sakura", "clear", "office"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = "kotori";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  layout: ThemeLayout;
  /** テーマを選ぶ画面でのまとまり */
  group: "gentle" | "stylish";
  /** ブラウザの上の帯の色（viewport の themeColor） */
  browserColor: string;
};

export const THEMES: readonly ThemeDefinition[] = [
  { id: "kotori", name: "ことり", description: "やさしい手帳", layout: "notebook", group: "gentle", browserColor: "#fffaf0" },
  { id: "yozora", name: "よぞら", description: "静かな夜", layout: "notebook", group: "gentle", browserColor: "#10182b" },
  { id: "mori", name: "もりのとしょかん", description: "深呼吸できる緑", layout: "notebook", group: "gentle", browserColor: "#f3f0e3" },
  { id: "soda", name: "ソーダ", description: "しゅわっと軽やか", layout: "notebook", group: "gentle", browserColor: "#f4fdff" },
  { id: "sakura", name: "さくらもち", description: "ふんわり春色", layout: "notebook", group: "gentle", browserColor: "#fff7f5" },
  { id: "clear", name: "クリア", description: "光と透明感", layout: "glass", group: "stylish", browserColor: "#0d1411" },
  { id: "office", name: "ビジネス", description: "静かで上質なダッシュボード", layout: "office", group: "stylish", browserColor: "#fafafa" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** 気分でのおすすめに使う点数（最新の日記） */
export type RecommendInput = {
  scores: { mood: number; energy: number; focus: number; stress: number } | null;
  /** 今の時刻（0〜23） */
  hour: number;
};

export type ThemeRecommendation = {
  themeId: ThemeId;
  reason: string;
};

/**
 * 今日の気分に合うテーマを1つ選ぶ（design/figma-make-brief.md の目安）。
 * ストレスが高い日 → もりのとしょかん／夜遅い時間 → よぞら／気分が高い日 → ソーダ／ふつう → ことり
 * おすすめは「やさしい」まとまりからだけ出す（クリア・ビジネスは好みで選ぶテーマ）
 */
export function recommendTheme({ scores, hour }: RecommendInput): ThemeRecommendation {
  if (scores && scores.stress >= 65) {
    return { themeId: "mori", reason: "少しストレスが高めの日に。深い緑で、ゆっくり深呼吸できる雰囲気です。" };
  }
  if (hour >= 22 || hour < 4) {
    return { themeId: "yozora", reason: "夜おそい時間に。まぶしくない色で、静かに書けます。" };
  }
  if (scores && scores.mood >= 70) {
    return { themeId: "soda", reason: "気分がいい日に。しゅわっと軽やかな色で、勢いにのれます。" };
  }
  return { themeId: "kotori", reason: "いつもの日に。やさしい手帳のような、落ち着く色です。" };
}

/** ブラウザに置くテーマの控え（開いた瞬間に色がちらつかないように） */
export const THEME_STORAGE_KEY = "renote-theme";
