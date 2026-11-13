"use client";

import { useAuth } from "@/components/AuthProvider";

export function LoginButton() {
  const { signIn } = useAuth();

  return (
    <button
      type="button"
      onClick={signIn}
      className="h-14 w-full rounded-full bg-accent text-base font-bold text-accent-foreground shadow-sm"
    >
      Google でログイン
    </button>
  );
}
