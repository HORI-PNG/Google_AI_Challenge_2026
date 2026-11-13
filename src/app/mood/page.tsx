"use client";

import { MoodScreen } from "@/components/MoodScreen";
import { RequireProfile } from "@/components/RequireProfile";
import { BackHeader } from "@/components/ui/Ui";

export default function MoodPage() {
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="気分のグラフ" />
      <div className="p-4">
        <RequireProfile>{(user) => <MoodScreen user={user} />}</RequireProfile>
      </div>
    </main>
  );
}
