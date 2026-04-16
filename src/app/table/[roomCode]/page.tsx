import { PokerTableClient } from "@/components/poker-table-client";

interface TablePageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function TablePage({ params }: TablePageProps) {
  const { roomCode } = await params;
  return <PokerTableClient roomCode={roomCode.toUpperCase()} />;
}
