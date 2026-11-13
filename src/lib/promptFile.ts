// src/prompts/*.md から、見出しの下にあるコードブロックを取り出す。
// プロンプトは md を正（Google AI Studio で試したもの）とし、コードに書き写さない。

/**
 * `## 見出し` のあとに最初に出てくる ``` で囲まれたブロックの中身を返す。
 * 見出しが見つからないときは例外を投げる（プロンプトの書き換えに気づけるように）。
 */
export function extractCodeBlock(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex(
    (line) => line.startsWith("## ") && line.slice(3).trim().startsWith(heading),
  );
  if (headingIndex === -1) {
    throw new Error(`プロンプトの見出し「${heading}」が見つかりません`);
  }

  const start = lines.findIndex(
    (line, i) => i > headingIndex && line.trim().startsWith("```"),
  );
  if (start === -1) {
    throw new Error(`見出し「${heading}」の下にコードブロックがありません`);
  }
  const end = lines.findIndex(
    (line, i) => i > start && line.trim().startsWith("```"),
  );
  if (end === -1) {
    throw new Error(`見出し「${heading}」のコードブロックが閉じていません`);
  }

  return lines.slice(start + 1, end).join("\n").trim();
}
