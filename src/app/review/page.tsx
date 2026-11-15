"use client";

import { RequireProfile } from "@/components/RequireProfile";
import { ReviewScreen } from "@/components/ReviewScreen";
import { BackHeader } from "@/components/ui/Ui";

export default function ReviewPage() {
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="復習（忘却曲線）" />
      <div className="p-4">
        <RequireProfile>{(user, profile) => <ReviewScreen user={user} profile={profile} />}</RequireProfile>
      </div>
    </main>
  );
}
