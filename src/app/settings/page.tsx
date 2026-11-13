"use client";

import { RequireProfile } from "@/components/RequireProfile";
import { SettingsScreen } from "@/components/SettingsScreen";
import { BackHeader } from "@/components/ui/Ui";

export default function SettingsPage() {
  return (
    <main className="relative min-h-dvh bg-background pb-10">
      <BackHeader title="テーマ・設定" />
      <RequireProfile>{(user) => <SettingsScreen user={user} />}</RequireProfile>
    </main>
  );
}
