"use client";

import { MapScreen } from "@/components/MapScreen";
import { RequireProfile } from "@/components/RequireProfile";
import { BackHeader } from "@/components/ui/Ui";

export default function MapPage() {
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="はかどり場所マップ" />
      <div className="p-4">
        <RequireProfile>{(user) => <MapScreen user={user} />}</RequireProfile>
      </div>
    </main>
  );
}
