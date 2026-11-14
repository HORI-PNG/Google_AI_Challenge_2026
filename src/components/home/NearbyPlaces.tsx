"use client";

import { useState } from "react";
import { toMessage, useAuth } from "@/components/AuthProvider";
import { ApiRequestError, requestNearbyPlaces } from "@/lib/diaries";
import { dateKey, type Place } from "@/lib/forecast";
import {
  formatDistance,
  isSearchablePlace,
  mapsSearchUrl,
  nearbyCacheKey,
  nearbyPlaceSchema,
  searchWord,
  type NearbyPlace,
  type SearchablePlace,
} from "@/lib/places";

// 予報の「おすすめ場所」の近くにある実際の場所（段階9）。
// ボタンを押したときだけ位置情報を使う。位置情報の設定は初期でオフで、初めて押したときに聞く

type SearchState =
  | { status: "idle" }
  | { status: "asking" }
  | { status: "loading" }
  | { status: "done"; places: NearbyPlace[] }
  | { status: "failed"; message: string };

function readCache(key: string): NearbyPlace[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = nearbyPlaceSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, places: NearbyPlace[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(places));
  } catch {
    // 覚えておけなくても、表示はできる
  }
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("この端末では位置情報を使えません"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

function positionMessage(e: unknown): string {
  if (typeof GeolocationPositionError !== "undefined" && e instanceof GeolocationPositionError) {
    return e.code === e.PERMISSION_DENIED
      ? "位置情報が許可されていません。ブラウザの設定で許可するか、Google マップで探してね。"
      : "今いる場所が分かりませんでした。";
  }
  return toMessage(e, "今いる場所が分かりませんでした。");
}

/**
 * Places API を使うか。費用がかかりうるため、初期はオフ（ユーザーと決めたこと：無料でできる範囲で進める）。
 * オフのときは位置情報を使わず、Google マップの検索を開くリンクだけを出す
 */
export const PLACES_API_ENABLED = process.env.NEXT_PUBLIC_PLACES_API_ENABLED === "true";

/** おすすめ場所ごとの「近くの〇〇を探す」 */
export function NearbyPlaces({ places }: { places: Place[] }) {
  const searchable = places.filter(isSearchablePlace);
  if (searchable.length === 0) return null;
  if (!PLACES_API_ENABLED) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {searchable.map((type) => (
          <a
            key={type}
            href={mapsSearchUrl(type)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] border border-border bg-subtle px-4 text-sm font-bold transition active:scale-[.98]"
          >
            <span>
              <span aria-hidden="true">📍 </span>近くの{searchWord(type)}を Google マップで探す
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-3">
      {searchable.map((type) => (
        <NearbySearch key={type} type={type} />
      ))}
    </div>
  );
}

function NearbySearch({ type }: { type: SearchablePlace }) {
  const { state: auth, settings, setLocationEnabled } = useAuth();
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const word = searchWord(type);

  async function search() {
    if (auth.status !== "signedIn") return;
    setState({ status: "loading" });
    try {
      const pos = await currentPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      const key = nearbyCacheKey(dateKey(new Date()), type, lat, lng);
      const cached = readCache(key);
      if (cached) {
        setState({ status: "done", places: cached });
        return;
      }
      const found = await requestNearbyPlaces(auth.user, { type, lat, lng });
      writeCache(key, found);
      setState({ status: "done", places: found });
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setState({
          status: "failed",
          message: e.code === "no_key" ? "近くの場所を探す準備ができていません。" : e.message,
        });
        return;
      }
      setState({ status: "failed", message: positionMessage(e) });
    }
  }

  async function allow() {
    try {
      await setLocationEnabled(true);
    } catch {
      // 設定を保存できなくても、今回は探す
    }
    await search();
  }

  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={() => (settings?.locationEnabled ? search() : setState({ status: "asking" }))}
        className="flex min-h-11 w-full items-center justify-between rounded-[var(--radius-control)] border border-border bg-subtle px-4 text-sm font-bold transition active:scale-[.98]"
      >
        <span>
          <span aria-hidden="true">📍 </span>近くの{word}を探す
        </span>
        <span aria-hidden="true">→</span>
      </button>
    );
  }

  return (
    <section className="rounded-[var(--radius-control)] border border-border bg-subtle p-4 text-sm" aria-live="polite">
      <p className="font-bold">
        <span aria-hidden="true">📍 </span>近くの{word}
      </p>

      {state.status === "asking" && (
        <>
          <p className="mt-2 leading-relaxed">
            今いる場所を使って、近くの{word}を探します。位置情報は検索にだけ使い、保存しません。
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={allow}
              className="min-h-11 flex-1 rounded-[var(--radius-control)] bg-accent px-4 font-bold text-accent-foreground"
            >
              位置情報を使う
            </button>
            <button
              type="button"
              onClick={() => setState({ status: "idle" })}
              className="min-h-11 rounded-[var(--radius-control)] border border-border px-4 font-bold"
            >
              やめる
            </button>
          </div>
          <FallbackLink type={type} />
        </>
      )}

      {state.status === "loading" && <p className="mt-2 text-muted">近くの{word}を探しています…</p>}

      {state.status === "done" &&
        (state.places.length > 0 ? (
          <>
            <ul className="mt-2 flex flex-col gap-2">
              {state.places.map((p) => (
                <li key={p.id}>
                  <a
                    href={p.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-small)] bg-card px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{p.name}</span>
                      <span className="text-xs text-muted">
                        {formatDistance(p.distance)}
                        {p.openNow !== null && (
                          <span className={p.openNow ? "ml-2 font-bold text-accent-strong" : "ml-2"}>
                            {p.openNow ? "営業中" : "営業時間外"}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-accent-strong">地図 ↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">場所の情報：Google マップ</p>
          </>
        ) : (
          <>
            <p className="mt-2 leading-relaxed">歩いて行ける範囲（約 2km）に{word}が見つかりませんでした。</p>
            <FallbackLink type={type} />
          </>
        ))}

      {state.status === "failed" && (
        <>
          <p className="mt-2 leading-relaxed text-accent-strong">{state.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4">
            <button type="button" onClick={search} className="min-h-11 font-bold underline">
              もう一度探す
            </button>
            <FallbackLink type={type} inline />
          </div>
        </>
      )}
    </section>
  );
}

/** API を使わずに Google マップで探すリンク */
function FallbackLink({ type, inline = false }: { type: SearchablePlace; inline?: boolean }) {
  return (
    <a
      href={mapsSearchUrl(type)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${inline ? "" : "mt-2 "}inline-flex min-h-11 items-center font-bold text-accent-strong underline`}
    >
      Google マップで「{searchWord(type)}」を探す ↗
    </a>
  );
}
