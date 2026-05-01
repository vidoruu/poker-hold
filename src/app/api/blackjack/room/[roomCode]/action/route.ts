import { NextResponse } from "next/server";
import {
  playerHit,
  playerStand,
  removePlayerFromBlackjackTable,
  dealerPlay,
  calculatePayouts,
  placeBet,
} from "@/lib/blackjack-engine";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";
import { BlackjackTableState, BlackjackAction } from "@/lib/blackjack-types";

interface ActionBody {
  sessionId?: string;
  action?: BlackjackAction;
  betAmount?: number;
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
    const body = (await request.json()) as ActionBody;
    const sessionId = (body.sessionId ?? "").trim();
    const action = body.action;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "Missing sessionId or action." },
        { status: 400 },
      );
    }

    let state = await loadBlackjackRoom(roomCode);
    if (!state) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case "place_bet":
        if (!body.betAmount) {
          throw new Error("Missing betAmount");
        }
        state = placeBet(state, sessionId, body.betAmount);
        break;

      case "hit":
        state = playerHit(state);
        break;

      case "stand":
        state = playerStand(state);
        // Check if all players have finished, then dealer plays
        const allPlayersDone = state.players.every((p) =>
          p.hands.every((h) => h.status !== "active"),
        );
        if (allPlayersDone && state.phase === "dealer_turn") {
          state = dealerPlay(state);
          state = calculatePayouts(state);
        }
        break;

      case "leave_table":
        state = removePlayerFromBlackjackTable(state, sessionId);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await saveBlackjackRoom(roomCode, state);
    return NextResponse.json({ state });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to perform action.",
      },
      { status: 500 },
    );
  }
}
