// Gemini の呼び出しを「同じモデルでやり直す → 別のモデルに切り替える」順で粘るための仕組み。
// Gemini の SDK には依存させず、テストしやすいように呼び出しの中身は外から渡す。

/** やり直すかどうかの判断 */
export type FailureKind =
  /** 混雑・回数制限・タイムアウト・形の崩れなど。同じモデルでやり直す */
  | "retryable"
  /** モデルが見つからないなど。そのモデルはあきらめて次のモデルへ */
  | "skipModel"
  /** API キーの誤りなど。どのモデルでも失敗するので、すぐにやめる */
  | "fatal";

// Node.js でそのままテストできるよう、constructor の引数でプロパティを宣言する書き方は使わない

export class AttemptError extends Error {
  readonly kind: FailureKind;
  /** ログに出す短い説明（日記の本文は入れない） */
  readonly detail: string;

  constructor(kind: FailureKind, detail: string) {
    super(detail);
    this.name = "AttemptError";
    this.kind = kind;
    this.detail = detail;
  }
}

export class AllAttemptsFailedError extends Error {
  readonly failures: AttemptLog[];

  constructor(failures: AttemptLog[]) {
    super("すべてのモデルで分析に失敗しました");
    this.name = "AllAttemptsFailedError";
    this.failures = failures;
  }
}

export class FatalAttemptError extends Error {
  readonly failure: AttemptLog;

  constructor(failure: AttemptLog) {
    super(`設定の誤りで分析できません：${failure.detail}`);
    this.name = "FatalAttemptError";
    this.failure = failure;
  }
}

export type AttemptLog = {
  model: string;
  attempt: number;
  kind: FailureKind;
  detail: string;
};

export type FallbackOptions = {
  /** 同じモデルで試す最大回数 */
  attemptsPerModel: number;
  /** やり直す前に待つ時間（ミリ秒）。n 回目の失敗のあとに delaysMs[n-1] だけ待つ */
  delaysMs: number[];
  sleep?: (ms: number) => Promise<void>;
  onFailure?: (log: AttemptLog) => void;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * models の順に call を試す。
 * 1つのモデルで attemptsPerModel 回まで試し、だめなら次のモデルへ切り替える。
 */
export async function runWithFallback<T>(
  models: readonly string[],
  call: (model: string) => Promise<T>,
  options: FallbackOptions,
): Promise<{ result: T; model: string }> {
  const sleep = options.sleep ?? defaultSleep;
  const failures: AttemptLog[] = [];

  for (const model of models) {
    for (let attempt = 1; attempt <= options.attemptsPerModel; attempt++) {
      try {
        const result = await call(model);
        return { result, model };
      } catch (error) {
        const failure: AttemptLog =
          error instanceof AttemptError
            ? { model, attempt, kind: error.kind, detail: error.detail }
            : {
                model,
                attempt,
                kind: "retryable",
                detail: error instanceof Error ? error.name : "unknown",
              };
        failures.push(failure);
        options.onFailure?.(failure);

        if (failure.kind === "fatal") {
          throw new FatalAttemptError(failure);
        }
        if (failure.kind === "skipModel") {
          break;
        }
        const isLastAttempt = attempt === options.attemptsPerModel;
        if (!isLastAttempt) {
          await sleep(options.delaysMs[attempt - 1] ?? 0);
        }
      }
    }
  }

  throw new AllAttemptsFailedError(failures);
}
