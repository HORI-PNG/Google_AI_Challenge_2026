"use client";

import { DiaryForm } from "@/components/DiaryForm";
import { RequireProfile } from "@/components/RequireProfile";

export default function NewDiaryPage() {
  return (
    <RequireProfile>{(user, profile) => <DiaryForm user={user} profile={profile} />}</RequireProfile>
  );
}
