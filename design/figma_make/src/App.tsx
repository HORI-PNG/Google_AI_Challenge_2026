import { useEffect, useState } from "react";
import { AnalyzingScreen } from "./screens/AnalyzingScreen";
import { ChartScreen } from "./screens/ChartScreen";
import { DiaryScreen } from "./screens/DiaryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import type { Screen, ThemeId } from "./types";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [theme, setTheme] = useState<ThemeId>("kotori");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("renote-theme") as ThemeId | null;
    if (
      savedTheme &&
      ["kotori", "yozora", "mori", "soda", "sakura", "clear", "office"].includes(savedTheme)
    ) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("renote-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (screen !== "analyzing") return;
    const timer = window.setTimeout(() => setScreen("result"), 2600);
    return () => window.clearTimeout(timer);
  }, [screen]);

  const renderScreen = () => {
    switch (screen) {
      case "login":
        return <LoginScreen onLogin={() => setScreen("onboarding")} />;
      case "onboarding":
        return <OnboardingScreen onStart={() => setScreen("home")} />;
      case "home":
        return (
          <HomeScreen
            theme={theme}
            onDiary={() => setScreen("diary")}
            onChart={() => setScreen("chart")}
            onSettings={() => setScreen("settings")}
          />
        );
      case "diary":
        return (
          <DiaryScreen onBack={() => setScreen("home")} onSave={() => setScreen("analyzing")} />
        );
      case "analyzing":
        return <AnalyzingScreen />;
      case "result":
        return (
          <ResultScreen onHome={() => setScreen("home")} onRetry={() => setScreen("analyzing")} />
        );
      case "chart":
        return <ChartScreen onBack={() => setScreen("home")} />;
      case "settings":
        return (
          <SettingsScreen
            theme={theme}
            onTheme={setTheme}
            onBack={() => setScreen("home")}
            onLogout={() => setScreen("login")}
          />
        );
    }
  };

  return (
    <div className="app-shell mx-auto min-h-dvh max-w-[448px] overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shell-shadow)]">
      {renderScreen()}
    </div>
  );
}
