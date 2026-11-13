"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  THEME_STORAGE_KEY,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/themes";
import { saveThemeId } from "@/lib/userProfile";

// テーマの状態。正は Firestore の users/{uid}.settings.themeId で、
// ブラウザ（localStorage）には、開いた瞬間に色を出すための控えを置く。
// 今のテーマは <html data-theme> から読む（layout.tsx のスクリプトが描画前に付けている）

const THEME_CHANGE_EVENT = "renote-theme-change";

function readTheme(): ThemeId {
  const value = document.documentElement.dataset.theme;
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/** 画面にテーマを反映し、ブラウザに控えを置く */
function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // プライベートブラウズなどで保存できなくても、表示は切り替える
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", getTheme(id).browserColor);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

type ThemeContextValue = {
  /** サーバーで描画している間は null（ブラウザのテーマがまだ分からない） */
  theme: ThemeDefinition | null;
  setTheme: (id: ThemeId) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state, settings } = useAuth();
  const themeId = useSyncExternalStore(subscribe, readTheme, () => null);
  const uid = state.status === "signedIn" ? state.user.uid : null;
  const savedThemeId = settings?.themeId;

  // ログインしたら、Firestore に保存してあるテーマに合わせる（別の端末で変えた場合など）
  useEffect(() => {
    if (isThemeId(savedThemeId) && savedThemeId !== readTheme()) {
      applyTheme(savedThemeId);
    }
  }, [savedThemeId]);

  const setTheme = useCallback(
    async (id: ThemeId) => {
      applyTheme(id);
      if (uid) {
        await saveThemeId(uid, id);
      }
    },
    [uid],
  );

  const value = useMemo(
    () => ({ theme: themeId ? getTheme(themeId) : null, setTheme }),
    [themeId, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme は ThemeProvider の中で使ってください");
  }
  return value;
}
