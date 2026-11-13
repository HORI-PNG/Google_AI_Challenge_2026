// 声の日記の録音形式と大きさ。ブラウザとサーバーの両方で使う。
// Node.js のテストから直接読み込むので、ほかのファイルを import しない。

/**
 * 録音できる長さ（秒）。
 * Gemini は音声を 1 秒あたり約 32 トークンと数える（2 分で約 3,800、3 分で約 5,800 トークン）。
 * 文章の日記の分析（プロンプト込みで千数百トークン）の数倍になり、無料枠の制限にも当たりやすいので、
 * 上限を上げるときはトークンの消費が増えることに注意する
 */
export const MAX_RECORDING_SECONDS = 120;

/** 録音の音質（ビット/秒）。声が聞き取れる範囲で小さくする */
export const RECORDING_BITS_PER_SECOND = 32_000;

/**
 * サーバーが受け取る音声の上限（バイト）。
 * Vercel の関数が受け取れるのは約 4.5MB。2 分・32kbps なら約 0.5MB なので余裕がある
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
