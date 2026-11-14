import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 開発中のキャッシュを使わない。
    // Windows 側（\\wsl.localhost）から編集すると WSL のファイル監視に変更が届かず、
    // キャッシュが古い CSS を返し続けることがあるため（起動し直せば必ず最新になる）
    turbopackFileSystemCacheForDev: false,
  },
  // Gemini のプロンプト（md）を実行時に読むので、本番の成果物にも含める
  outputFileTracingIncludes: {
    "/api/analyze": ["./src/prompts/**/*.md"],
    "/api/transcribe": ["./src/prompts/**/*.md"],
    "/api/character": ["./src/prompts/**/*.md"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
