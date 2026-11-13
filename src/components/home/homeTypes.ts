import type { Diary } from "@/lib/diaries";

/** 最新の日記の読み込み状態 */
export type LatestDiaryState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "loaded"; diary: Diary };

/**
 * ホームの見た目の部品（手帳・クリア・ビジネス）が受け取るデータ。
 * 系統が違っても、この形は同じにする（design/figma-make-brief.md の約束）
 */
export type HomeViewProps = {
  /** 例：11月14日（土） */
  dateLabel: string;
  nickname: string;
  name: string;
  grade: string;
  email: string | null;
  latest: LatestDiaryState;
  /** 最新の日記の分析をやり直す */
  onRetry: () => void;
  retrying: boolean;
  retryError: string | null;
};
