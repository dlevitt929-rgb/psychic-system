import { getActiveTeamId } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function AssistantPage() {
  const teamId = await getActiveTeamId();
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader title="AI FPL Assistant" subtitle="Grounded in your actual squad, bank, and mini-league — not generic advice" />
      </Card>
      <ChatWindow teamId={teamId} />
    </div>
  );
}
