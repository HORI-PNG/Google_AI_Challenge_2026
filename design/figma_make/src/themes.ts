import type { ThemeId, ThemeLayout } from "./types";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  layout: ThemeLayout;
  group: "gentle" | "stylish";
};

export const themes: ThemeDefinition[] = [
  {
    id: "kotori",
    name: "ことり",
    description: "やさしい手帳",
    layout: "notebook",
    group: "gentle",
  },
  {
    id: "yozora",
    name: "よぞら",
    description: "静かな夜",
    layout: "notebook",
    group: "gentle",
  },
  {
    id: "mori",
    name: "もりのとしょかん",
    description: "深呼吸できる緑",
    layout: "notebook",
    group: "gentle",
  },
  {
    id: "soda",
    name: "ソーダ",
    description: "しゅわっと軽やか",
    layout: "notebook",
    group: "gentle",
  },
  {
    id: "sakura",
    name: "さくらもち",
    description: "ふんわり春色",
    layout: "notebook",
    group: "gentle",
  },
  {
    id: "clear",
    name: "クリア",
    description: "光と透明感",
    layout: "glass",
    group: "stylish",
  },
  {
    id: "office",
    name: "ビジネス",
    description: "静かで上質なダッシュボード",
    layout: "office",
    group: "stylish",
  },
];

export function getTheme(themeId: ThemeId) {
  return themes.find((theme) => theme.id === themeId) ?? themes[0];
}
