import { NextResponse } from "next/server";
import { createInitialState, joinTable, sanitizeRoomCode } from "@/lib/poker-engine";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";
import { TableState } from "@/lib/poker-types";

interface JoinBody {
  roomCode?: string;
  sessionId?: string;
  name?: string;
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

async function loadRoom(roomCode: string) {
  if (!hasSupabaseServerConfig()) {
    return getMemoryRoomStore().get(roomCode) ?? null;
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

  return data?.state ?? null;
}

async function saveRoom(roomCode: string, state: TableState) {
  if (!hasSupabaseServerConfig()) {
    getMemoryRoomStore().set(roomCode, state);
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("poker_tables").upsert(
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JoinBody;
    const roomCode = sanitizeRoomCode(body.roomCode ?? "POKER1");
    const sessionId = (body.sessionId ?? "").trim();
    const name = (body.name ?? "").trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    let roomState = await loadRoom(roomCode);
    if (!roomState) {
      roomState = createInitialState(roomCode);
    }

    // Ensure we only have poker states
    if (!isPokerState(roomState)) {
      return NextResponse.json(
        { error: "This room is not a poker room." },
        { status: 400 },
      );
    }

    const updated = joinTable(roomState, sessionId, name);
    await saveRoom(roomCode, updated);

    return NextResponse.json({ state: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to join room.",
      },
      { status: 500 },
    );
  }
}
