import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";
import { BlackjackTableState } from "@/lib/blackjack-types";

async function loadBlackjackRoom(roomCode: string) {
  if (!hasSupabaseServerConfig()) {
    const store = getMemoryRoomStore();
    const key = `blackjack:${roomCode}`;
    const state = store.get(key);
    if (state && "gameType" in state && state.gameType === "blackjack") {
      return state as BlackjackTableState;
    }
    return undefined;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("blackjack_tables")
    .select("state")
    .eq("room_code", roomCode)
    .maybeSingle<{ state: BlackjackTableState }>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.state;
}

function sanitizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode: rawRoomCode } = await params;
    const roomCode = sanitizeRoomCode(rawRoomCode);

    const state = await loadBlackjackRoom(roomCode);
    if (!state) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch room.",
      },
      { status: 500 },
    );
  }
}
