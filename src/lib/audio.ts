// 声の日記の録音形式と大きさ。ブラウザとサーバーの両方で使う。
// Node.js のテストから直接読み込むので、ほかのファイルを import しない。

/** 録音できる長さ（秒） */
export const MAX_RECORDING_SECONDS = 180;

/** 録音の音質（ビット/秒）。声が聞き取れる範囲で小さくする */
export const RECORDING_BITS_PER_SECOND = 32_000;

/**
 * サーバーが受け取る音声の上限（バイト）。
 * Vercel の関数が受け取れるのは約 4.5MB。3 分・32kbps なら約 0.7MB なので余裕がある
 */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

/**
 * ブラウザの MediaRecorder で試す形式（上から順に、使えるものを選ぶ）。
 * Chrome・Edge は webm、Safari は mp4 になる
 */
export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

/** Gemini に渡せることを確かめた音声の形式 */
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/aac",
]);

/**
 * "audio/webm;codecs=opus" のような形式名から、Gemini に渡す形式名（"audio/webm"）を取り出す。
 * 対応していない形式なら null
 */
export function normalizeAudioMimeType(mimeType: string): string | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  // Safari は録音を video/mp4 と名乗ることがある
  const normalized = base === "video/mp4" ? "audio/mp4" : base === "video/webm" ? "audio/webm" : base;
  return SUPPORTED_AUDIO_TYPES.has(normalized) ? normalized : null;
}
