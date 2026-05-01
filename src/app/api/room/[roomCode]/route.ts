import { NextResponse } from "next/server";
import { sanitizeRoomCode } from "@/lib/poker-engine";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";
import { TableState } from "@/lib/poker-types";

interface Params {
  params: Promise<{ roomCode: string }>;
}

function isPokerState(state: unknown): state is TableState {
  if (typeof state !== "object" || state === null) {
    return false;
  }
  // Blackjack states have gameType property set to "blackjack"
  const stateObj = state as Record<string, unknown>;
  if ("gameType" in stateObj && stateObj.gameType === "blackjack") {
    return false;
  }
  return true;
}

export async function GET(_request: Request, context: Params) {
  try {
    const { roomCode: roomCodeParam } = await context.params;
    const roomCode = sanitizeRoomCode(roomCodeParam);

    if (!hasSupabaseServerConfig()) {
      const state = getMemoryRoomStore().get(roomCode);
      if (!state || !isPokerState(state)) {
        return NextResponse.json({ error: "Room not found." }, { status: 404 });
      }
      return NextResponse.json({ state });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("poker_tables")
      .select("state")
      .eq("room_code", roomCode)
      .maybeSingle<{ state: TableState }>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.state) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ state: data.state });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load room.",
      },
      { status: 500 },
    );
  }
}
