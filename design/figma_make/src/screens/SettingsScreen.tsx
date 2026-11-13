import { BackHeader, Mascot } from "../components/Ui";
import { themes, type ThemeDefinition } from "../themes";
import type { ThemeId } from "../types";

export function SettingsScreen({
  theme,
  onTheme,
  onBack,
  onLogout,
}: {
  theme: ThemeId;
  onTheme: (theme: ThemeId) => void;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="settings-screen relative min-h-dvh pb-10">
      <BackHeader title="テーマ・設定" onBack={onBack} />
      <div className="settings-content space-y-6 p-4">
        <section className="recommend-card rounded-[var(--radius)] border p-5">
          <div className="flex items-center gap-3">
            <Mascot mood="normal" size={70} />
            <div>
              <p className="text-sm font-bold text-[var(--accent-strong)]">
                今日の気分には、このテーマはどう？
              </p>
              <p className="mt-1 font-[var(--font-heading)] text-lg font-bold">もりのとしょかん</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            少しストレスが高めの日に。深い緑で、ゆっくり深呼吸できる雰囲気です。
          </p>
          <button
            onClick={() => onTheme("mori")}
            className="recommend-action mt-4 min-h-12 w-full rounded-[var(--radius-control)] px-5 font-bold"
          >
            このテーマにする
          </button>
        </section>
        <section>
          <h2 className="font-[var(--font-heading)] text-xl font-bold">テーマを選ぶ</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            色だけでなく、情報の並び方も好みに合わせて選べます。
          </p>
          <ThemeGroup
            label="やさしい"
            description="手帳のように、ゆったり縦に読む"
            themes={themes.filter((item) => item.group === "gentle")}
            selected={theme}
            onTheme={onTheme}
          />
          <ThemeGroup
            label="スタイリッシュ"
            description="Material・ビジネスの専用レイアウト"
            themes={themes.filter((item) => item.group === "stylish")}
            selected={theme}
            onTheme={onTheme}
          />
        </section>
        <section className="space-y-3 border-t border-[var(--border)] pt-6">
          <button className="flex min-h-14 w-full items-center justify-between rounded-[var(--radius-control)] bg-[var(--card)] px-4 font-bold">
            <span>基本情報を変更</span>
            <span>→</span>
          </button>
          <button
            onClick={onLogout}
            className="min-h-14 w-full rounded-[var(--radius-control)] text-left font-bold text-[var(--muted)]"
          >
            ログアウト
          </button>
        </section>
      </div>
    </main>
  );
}

function ThemeGroup({
  label,
  description,
  themes: items,
  selected,
  onTheme,
}: {
  label: string;
  description: string;
  themes: ThemeDefinition[];
  selected: ThemeId;
  onTheme: (theme: ThemeId) => void;
}) {
  return (
    <div className="mt-6">
      <div className="mb-3">
        <h3 className="font-bold">{label}</h3>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTheme(item.id)}
            aria-pressed={selected === item.id}
            className={`theme-swatch theme-${item.id} min-h-36 overflow-hidden rounded-[var(--radius)] border-2 p-3 text-left transition ${
              selected === item.id
                ? "border-[var(--accent)] shadow-[var(--card-shadow)]"
                : "border-transparent"
            }`}
          >
            <ThemePreview layout={item.layout} />
            <strong className="block text-sm text-[var(--swatch-text)]">{item.name}</strong>
            <span className="text-xs text-[var(--swatch-muted)]">{item.description}</span>
            {selected === item.id && (
              <span className="float-right -mt-5 text-[var(--swatch-accent)]">●</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemePreview({ layout }: { layout: ThemeDefinition["layout"] }) {
  if (layout === "glass") {
    return (
      <div className="mb-3 grid h-16 grid-cols-[1fr_22px] gap-1.5 rounded-[var(--radius-small)] bg-[var(--swatch-bg)] p-2">
        <span className="row-span-2 rounded-lg border border-white bg-[var(--swatch-card)] shadow-sm" />
        <span className="rounded-full bg-[var(--swatch-accent)]" />
        <span className="rounded-md bg-[var(--swatch-card)]" />
      </div>
    );
  }
  if (layout === "office") {
    return (
      <div className="mb-3 grid h-16 grid-cols-[18px_1fr] overflow-hidden rounded-[var(--radius-small)] bg-[var(--swatch-card)]">
        <span className="bg-[var(--swatch-bg)]" />
        <span className="p-2">
          <i className="mb-1 block h-1.5 w-1/3 bg-[var(--swatch-text)] opacity-80" />
          <svg className="h-7 w-full" viewBox="0 0 80 24">
            <path
              d="M0 20 C20 20 24 16 38 15 S57 12 80 3"
              fill="none"
              stroke="var(--swatch-accent)"
              strokeWidth="2"
            />
          </svg>
          <i className="block h-1 w-full bg-[var(--swatch-bg)]" />
        </span>
      </div>
    );
  }
  return (
    <div className="mb-3 flex h-16 items-end gap-2 rounded-[var(--radius-small)] bg-[var(--swatch-bg)] p-2">
      <span className="h-8 flex-1 rounded-[var(--radius-small)] bg-[var(--swatch-card)]" />
      <span className="size-8 rounded-full bg-[var(--swatch-accent)]" />
    </div>
  );
}
