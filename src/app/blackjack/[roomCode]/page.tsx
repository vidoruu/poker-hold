import { BlackjackTableClient } from "@/components/blackjack-table-client";

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function BlackjackTablePage({ params }: PageProps) {
  const { roomCode } = await params;

  return <BlackjackTableClient roomCode={roomCode} />;
}
