import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "はじめに | Re:Note",
};

export default function WelcomePage() {
  return (
    <main className="min-h-dvh px-5 pb-8 pt-8">
      <ProfileForm />
    </main>
  );
}
