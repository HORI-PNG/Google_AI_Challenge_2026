"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AccountDetails } from "@/components/home/HomeParts";
import { useTheme } from "@/components/ThemeProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import type { UserProfile } from "@/lib/userProfile";

// クリアのテーマの、画面の下のメニュー（段階15）。どの画面にも出す。
// 6 つの項目を横にすべらせて選ぶ（画面に見えるのは 3 つ）。真ん中のガラスの上に来た項目が選ばれている。
// 押すと、その項目がガラスの上まですべってから開く。指でなぞって動かすこともできる

type NavItem = { id: string; label: string; icon: IconName | "mascot"; href: string | null };

const ITEMS: NavItem[] = [
  { id: "mood", label: "グラフ", icon: "chart", href: "/mood" },
  { id: "ask", label: "聞く", icon: "mascot", href: "/ask" },
  { id: "diary", label: "日記を書く", icon: "edit", href: "/diary/new" },
  { id: "review", label: "復習", icon: "review", href: "/review" },
  { id: "map", label: "場所", icon: "map", href: "/map" },
  // ユーザー情報（とテーマ）のパネルを開く
  { id: "user", label: "ユーザー", icon: "user", href: null },
];

/** 見えている項目の数 */
const VISIBLE = 3;
/** すべり終わるまで待ってから画面を移る時間（ミリ秒） */
const SLIDE_MS = 320;

/** 今の画面に合う項目（ホームでは「日記を書く」を真ん中に置く） */
function indexFor(pathname: string): number {
  if (pathname === "/settings") return ITEMS.findIndex((i) => i.id === "user");
  const found = ITEMS.findIndex((i) => i.href === pathname);
  return found >= 0 ? found : ITEMS.findIndex((i) => i.id === "diary");
}

export function GlassNav() {
  const { theme } = useTheme();
  const { state, profile } = useAuth();
  const pathname = usePathname();
  if (theme?.layout !== "glass" || state.status !== "signedIn" || profile.status !== "ready" || pathname === "/welcome") {
    return null;
  }
  // 画面が変わったら、その画面の項目を真ん中にして描き直す
  return <GlassNavBar key={pathname} pathname={pathname} user={state.user} profile={profile.profile} />;
}

function GlassNavBar({ pathname, user, profile }: { pathname: string; user: User; profile: UserProfile }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = indexFor(pathname);
  // 真ん中にある位置（0〜5。すべっている間は小数）
  const [pos, setPos] = useState(start);
  const [panelOpen, setPanelOpen] = useState(false);

  // 描く前に、今の画面の項目を真ん中に置く
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = start * (el.clientWidth / VISIBLE);
  }, [start]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function onScroll() {
    const el = scroller.current;
    if (el) setPos(el.scrollLeft / (el.clientWidth / VISIBLE));
  }

  function choose(index: number, event?: MouseEvent) {
    event?.preventDefault();
    const el = scroller.current;
    if (!el) return;
    const width = el.clientWidth / VISIBLE;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const centered = Math.abs(el.scrollLeft - index * width) < 2;
    if (!centered) el.scrollTo({ left: index * width, behavior: reduce ? "auto" : "smooth" });

    const item = ITEMS[index];
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        if (item.href === null) {
          setPanelOpen((open) => (centered ? !open : true));
          return;
        }
        setPanelOpen(false);
        if (item.href !== pathname) router.push(item.href);
      },
      centered || reduce ? 0 : SLIDE_MS,
    );
  }

  const current = indexFor(pathname);

  return (
    <>
      {/* 固定のメニューの下に中身が隠れないように、同じ高さの余白をとる */}
      <div aria-hidden="true" className="h-28 shrink-0" />

      {panelOpen && (
        <>
          <button
            type="button"
            aria-label="ユーザー情報を閉じる"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setPanelOpen(false)}
          />
          <div
            id="glass-account-panel"
            className="account-panel fixed inset-x-4 bottom-[100px] z-40 mx-auto max-w-[416px] rounded-[var(--radius)] border border-border p-4"
          >
            <AccountDetails nickname={profile.nickname} name={profile.name} grade={profile.grade} email={user.email} />
          </div>
        </>
      )}

      <nav
        aria-label="メニュー"
        className="material-nav fixed inset-x-4 bottom-3 z-40 mx-auto h-[80px] max-w-[416px] overflow-hidden rounded-[var(--radius)]"
      >
        {/* 真ん中のガラス（選ばれている所）。項目はこの上をすべる */}
        <div aria-hidden="true" className="glass-lens pointer-events-none absolute inset-y-2 left-1/3 w-1/3 rounded-[var(--radius-control)]" />
        <div
          ref={scroller}
          onScroll={onScroll}
          className="glass-nav-scroller relative z-10 flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          <span aria-hidden="true" className="basis-1/3 shrink-0" />
          {ITEMS.map((item, i) => {
            const distance = Math.min(Math.abs(i - pos), 1.5);
            const near = distance < 0.5;
            const style = {
              transform: `scale(${(1.06 - Math.min(distance, 1) * 0.16).toFixed(3)})`,
              opacity: 1 - distance * 0.4,
            };
            const content = (
              <span className="flex flex-col items-center gap-1" style={style}>
                <span aria-hidden="true" className="grid h-7 place-items-center">
                  {item.icon === "mascot" ? <Mascot mood="normal" size={28} /> : <Icon name={item.icon} size={23} />}
                </span>
                <span className="whitespace-nowrap text-xs font-bold">{item.label}</span>
              </span>
            );
            const className = `grid basis-1/3 shrink-0 snap-center place-items-center transition-colors ${
              near ? "text-accent-strong" : "text-foreground"
            }`;
            if (item.href === null) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => choose(i)}
                  aria-expanded={panelOpen}
                  aria-controls="glass-account-panel"
                  className={className}
                >
                  {content}
                </button>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => choose(i, e)}
                aria-current={i === current && item.href === pathname ? "page" : undefined}
                className={className}
              >
                {content}
              </Link>
            );
          })}
          <span aria-hidden="true" className="basis-1/3 shrink-0" />
        </div>
      </nav>
    </>
  );
}
