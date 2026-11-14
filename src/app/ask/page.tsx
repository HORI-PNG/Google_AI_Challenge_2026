"use client";

import { AskScreen } from "@/components/AskScreen";
import { RequireProfile } from "@/components/RequireProfile";
import { BackHeader } from "@/components/ui/Ui";

export default function AskPage() {
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="ハカドリに聞く" />
      <div className="p-4">
        <RequireProfile>{(user, profile) => <AskScreen user={user} profile={profile} />}</RequireProfile>
      </div>
    </main>
  );
}
