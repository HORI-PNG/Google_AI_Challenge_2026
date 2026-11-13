import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "はじめに | Re:Note",
};

export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">はじめまして！</h1>
        <p className="text-sm leading-relaxed text-muted">
          日記を書く前に、あなたのことを少しだけ教えてください。
        </p>
      </header>
      <ProfileForm />
    </main>
  );
}
