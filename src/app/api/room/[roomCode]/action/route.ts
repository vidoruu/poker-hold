import { NextResponse } from "next/server";
import { applyAction, sanitizeRoomCode } from "@/lib/poker-engine";
import { PlayerAction, TableState } from "@/lib/poker-types";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";

interface ActionBody {
  sessionId?: string;
  action?: PlayerAction;
  amount?: number;
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

interface Params {
  params: Promise<{ roomCode: string }>;
}

export async function POST(request: Request, context: Params) {
  try {
    const { roomCode: roomCodeParam } = await context.params;
    const roomCode = sanitizeRoomCode(roomCodeParam);
    const body = (await request.json()) as ActionBody;

    const sessionId = (body.sessionId ?? "").trim();
    const action = body.action;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "Missing sessionId or action." },
        { status: 400 },
      );
    }

    if (!hasSupabaseServerConfig()) {
      const roomStore = getMemoryRoomStore();
      const existing = roomStore.get(roomCode);
      if (!existing) {
        return NextResponse.json({ error: "Room not found." }, { status: 404 });
      }

      if (!isPokerState(existing)) {
        return NextResponse.json(
          { error: "This room is not a poker room." },
          { status: 400 },
        );
      }

      const nextState = applyAction(existing, sessionId, action, body.amount ?? 0);
      roomStore.set(roomCode, nextState);
      return NextResponse.json({ state: nextState });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("poker_tables")
      .select("state")
      .eq("room_code", roomCode)
      .single<{ state: TableState }>();

    if (error) {
      throw new Error(error.message);
    }

    const nextState = applyAction(data.state, sessionId, action, body.amount ?? 0);

    const { error: saveError } = await supabaseAdmin
      .from("poker_tables")
      .update({ state: nextState, updated_at: new Date().toISOString() })
      .eq("room_code", roomCode);

    if (saveError) {
      throw new Error(saveError.message);
    }

    return NextResponse.json({ state: nextState });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Action failed.",
      },
      { status: 400 },
    );
  }
}
