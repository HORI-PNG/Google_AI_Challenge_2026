import { MindfulnessScreen } from "@/components/MindfulnessScreen";
import { BackHeader } from "@/components/ui/Ui";

export default function MindfulnessPage() {
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="マインドフルネス" />
      <MindfulnessScreen />
    </main>
  );
}
