import { BackHeader, ButtonLink, Card, SpeechBubble } from "@/components/ui/Ui";
import { Mascot } from "@/components/ui/Mascot";

// 瞑想機能は、キャラクターを作り直すまで「準備中」にする（段階20）。
// 前の画面（MindfulnessScreen）はコードに残してあり、このページから呼べば戻せる
export default function MindfulnessPage() {
  return (
    <main className="min-h-dvh pb-10">
      <BackHeader title="マインドフルネス" />
      <div className="p-4">
        <Card className="flex flex-col items-center gap-4 py-8 text-center">
          <Mascot mood="sleepy" size={96} />
          <SpeechBubble>いま、静かな1分の準備をしているよ。</SpeechBubble>
          <h1 className="font-display text-2xl">現在準備中です</h1>
          <p className="text-sm leading-7 text-muted">
            1分間のマインドフルネスは、ただいま準備中です。
            <br />
            できあがるまで、もう少し待っていてね。
          </p>
          <ButtonLink href="/" className="mt-2 w-full">
            ホームに戻る
          </ButtonLink>
        </Card>
      </div>
    </main>
  );
}
