import type { Metadata, Viewport } from "next";
import { Klee_One, M_PLUS_Rounded_1c, Noto_Sans_JP, Roboto_Mono, Zen_Maru_Gothic } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_IDS, THEME_STORAGE_KEY } from "@/lib/themes";
import "./globals.css";

// テーマごとのフォント（使う変数は globals.css の --font-body など）。
// 日本語のフォントは大きいので、標準テーマ（ことり）の Zen Maru Gothic 以外は先読みしない
const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});
const mplusRounded = M_PLUS_Rounded_1c({
  variable: "--font-mplus-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const klee = Klee_One({
  variable: "--font-klee",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const fontVariables = [zenMaru, mplusRounded, klee, notoSans, robotoMono]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Re:Note",
  description: "気持ちを書くと、今日の「はかどり」が分かる日記",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // テーマを変えると ThemeProvider が書き換える
  themeColor: "#fffaf0",
};

/**
 * 画面を描く前に、ブラウザに置いたテーマの控えを <html data-theme> に付ける。
 * これがないと、開いた瞬間に標準テーマの色が一瞬見えてしまう（ちらつき）
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEME_IDS)}.indexOf(t)>=0){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme は描画前のスクリプトが付けるので、サーバーの HTML と食い違ってよい
    <html lang="ja" data-theme="kotori" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>
          <ThemeProvider>
            <div className="app-shell mx-auto flex min-h-dvh w-full max-w-[448px] flex-col overflow-x-hidden text-foreground">
              {children}
            </div>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
