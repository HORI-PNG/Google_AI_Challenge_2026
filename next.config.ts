import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
