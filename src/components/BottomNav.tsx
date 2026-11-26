"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AccountDetails } from "@/components/home/HomeParts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Mascot } from "@/components/ui/Mascot";
import type { UserProfile } from "@/lib/userProfile";

// 画面の下のメニュー（段階15 でクリア用に作り、段階17 で全テーマ共通にした）。ログイン後のどの画面にも出す。
// 7 つの項目を横にすべらせて選ぶ（画面に見えるのは 3 つ）。真ん中の丸の上に来た項目が選ばれている。
// 押すと、その項目が丸の上まですべってから開く。指でなぞって動かすこともできる。
// 色はテーマのトークン（globals.css の .bottom-nav／.bottom-nav-lens）で描く

type NavItem = { id: string; label: string; icon: IconName | "mascot"; href: string | null };

const ITEMS: NavItem[] = [
  { id: "mood", label: "グラフ", icon: "chart", href: "/mood" },
  { id: "ask", label: "聞く", icon: "mascot", href: "/ask" },
  { id: "diary", label: "日記を書く", icon: "edit", href: "/diary/new" },
  { id: "review", label: "復習", icon: "review", href: "/review" },
  { id: "map", label: "場所", icon: "map", href: "/map" },
  { id: "mindfulness", label: "瞑想", icon: "meditation", href: "/mindfulness" },
  // ユーザー情報（とテーマ）のパネルを開く
  { id: "user", label: "ユーザー", icon: "user", href: null },
];

/** 見えている項目の数 */
const VISIBLE = 3;
/**
 * 端で片側が空にならないように、項目を 3 回くり返して並べ、輪のようにつなぐ（ユーザーの次はグラフ）。
 * ふだんは真ん中のくり返しを使い、外側に出たら、止まったときに同じ見た目の真ん中へ瞬時に戻す
 */
const COPIES = 3;
const N = ITEMS.length;
const SLOTS = Array.from({ length: N * COPIES }, (_, v) => v);
/** 止まったとみなすまでの時間（ミリ秒） */
const SETTLE_MS = 140;
/** すべり終わるまで待ってから画面を移る時間（ミリ秒） */
const SLIDE_MS = 320;

/** 今の画面に合う項目（ホームでは「日記を書く」を真ん中に置く） */
function indexFor(pathname: string): number {
  if (pathname === "/settings") return ITEMS.findIndex((i) => i.id === "user");
  const found = ITEMS.findIndex((i) => i.href === pathname);
  return found >= 0 ? found : ITEMS.findIndex((i) => i.id === "diary");
}

export function BottomNav() {
  const { state, profile } = useAuth();
  const pathname = usePathname();
  if (state.status !== "signedIn" || profile.status !== "ready" || pathname === "/welcome") {
    return null;
  }
  // 画面が変わったら、その画面の項目を真ん中にして描き直す
  return <BottomNavBar key={pathname} pathname={pathname} user={state.user} profile={profile.profile} />;
}

function BottomNavBar({ pathname, user, profile }: { pathname: string; user: User; profile: UserProfile }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 真ん中のくり返しの中での位置
  const start = N + indexFor(pathname);
  // ガラスの上にある位置（くり返しを通した番号。すべっている間は小数）
  const [pos, setPos] = useState(start);
  const [panelOpen, setPanelOpen] = useState(false);

  /** v 番目の枠をガラスの上に置くときの scrollLeft（左端の枠の中心が、見える 3 つの真ん中に来る位置からかぞえる） */
  const leftFor = (v: number, el: HTMLDivElement) => (v - 1) * (el.clientWidth / VISIBLE);

  // 描く前に、今の画面の項目を真ん中に置く
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = leftFor(start, el);
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
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const width = el.clientWidth / VISIBLE;
    setPos(el.scrollLeft / width + 1);
    // 止まったら、外側のくり返しにいるときは、同じ見た目の真ん中のくり返しへ瞬時に戻す
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const v = Math.round(el.scrollLeft / width) + 1;
      if (v < N || v >= N * 2) {
        const middle = N + (((v % N) + N) % N);
        el.scrollLeft = leftFor(middle, el);
        setPos(middle);
      }
    }, SETTLE_MS);
  }

  function choose(v: number, event?: MouseEvent) {
    event?.preventDefault();
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = leftFor(v, el);
    const centered = Math.abs(el.scrollLeft - target) < 2;
    if (!centered) el.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });

    const item = ITEMS[v % N];
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
            id="bottom-nav-account-panel"
            className="account-panel fixed inset-x-4 bottom-[100px] z-40 mx-auto max-w-[416px] rounded-[var(--radius)] border border-border p-4 shadow-[0_18px_55px_color-mix(in_srgb,var(--foreground)_16%,transparent)]"
          >
            <AccountDetails nickname={profile.nickname} name={profile.name} grade={profile.grade} email={user.email} />
          </div>
        </>
      )}

      <nav
        aria-label="メニュー"
        className="bottom-nav fixed inset-x-4 bottom-3 z-40 mx-auto h-[80px] max-w-[416px] overflow-hidden rounded-[var(--radius)]"
      >
        {/* 真ん中の丸（選ばれている所）。項目はこの上をすべる */}
        <div aria-hidden="true" className="bottom-nav-lens pointer-events-none absolute inset-y-2 left-1/3 w-1/3 rounded-[var(--radius-control)]" />
        <div
          ref={scroller}
          onScroll={onScroll}
          className="bottom-nav-scroller relative z-10 flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {SLOTS.map((v) => {
            const item = ITEMS[v % N];
            // 真ん中のくり返しだけを、読み上げとキーボードの対象にする（外側は見た目のための写し）
            const copy = v < N || v >= N * 2;
            const distance = Math.min(Math.abs(v - pos), 1.5);
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
            const hidden = copy ? { "aria-hidden": true, tabIndex: -1 } : {};
            if (item.href === null) {
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => choose(v)}
                  aria-expanded={copy ? undefined : panelOpen}
                  aria-controls={copy ? undefined : "bottom-nav-account-panel"}
                  className={className}
                  {...hidden}
                >
                  {content}
                </button>
              );
            }
            return (
              <Link
                key={v}
                href={item.href}
                onClick={(e) => choose(v, e)}
                aria-current={!copy && item.href === pathname ? "page" : undefined}
                className={className}
                {...hidden}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
