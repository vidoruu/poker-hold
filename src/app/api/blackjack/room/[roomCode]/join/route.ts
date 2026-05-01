import { NextResponse } from "next/server";
import {
  createBlackjackTableState,
  joinBlackjackTable,
} from "@/lib/blackjack-engine";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";
import { BlackjackTableState } from "@/lib/blackjack-types";
import { STARTING_CHIPS } from "@/lib/chip-system";

interface JoinBody {
  sessionId?: string;
  name?: string;
  gameType?: string;
}

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

async function saveBlackjackRoom(roomCode: string, state: BlackjackTableState) {
  if (!hasSupabaseServerConfig()) {
    const store = getMemoryRoomStore();
    const key = `blackjack:${roomCode}`;
    store.set(key, state);
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("blackjack_tables").upsert(
    {
      room_code: roomCode,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_code" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

function sanitizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode: rawRoomCode } = await params;
    const roomCode = sanitizeRoomCode(rawRoomCode);
    const body = (await request.json()) as JoinBody;
    const sessionId = (body.sessionId ?? "").trim();
    const name = (body.name ?? "").trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    let roomState = await loadBlackjackRoom(roomCode);
    if (!roomState) {
      roomState = createBlackjackTableState(roomCode);
    }

    const updatedState = joinBlackjackTable(roomState, sessionId, name, STARTING_CHIPS);

    await saveBlackjackRoom(roomCode, updatedState);

    return NextResponse.json({ state: updatedState });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to join room.",
      },
      { status: 500 },
    );
  }
}
