import { NextResponse } from "next/server";
import { LobbySummary, TablePlayer, TableState } from "@/lib/poker-types";
import { getMemoryRoomStore } from "@/lib/server/in-memory-room-store";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";

function hostNameFromState(state: TableState) {
  const host = state.players.find((player) => player.sessionId === state.hostSessionId);
  if (host) {
    return host.name;
  }

  return state.players[0]?.name ?? "—";
}

function toLobbySummary(state: TableState): LobbySummary {
  return {
    roomCode: state.roomCode,
    hostName: hostNameFromState(state),
    playerCount: state.players.length,
    handNumber: state.handNumber,
    phase: state.phase,
    updatedAt: state.updatedAt,
  };
}

function sanitizeLegacyState(state: TableState) {
  if (state.hostSessionId === undefined) {
    const firstPlayerSessionId = (state.players[0] as TablePlayer | undefined)?.sessionId ?? null;
    return {
      ...state,
      hostSessionId: firstPlayerSessionId,
    } as TableState;
  }

  return state;
}

/**
 * Filter out non-poker states from the store
 */
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

export async function GET() {
  try {
    if (!hasSupabaseServerConfig()) {
      const store = getMemoryRoomStore();
      const pokerStates = [...store.values()].filter(isPokerState);

      const lobbies = pokerStates
        .map((state) => sanitizeLegacyState(state))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 25)
        .map(toLobbySummary);

      return NextResponse.json({ lobbies });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("poker_tables")
      .select("state, updated_at")
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) {
      throw new Error(error.message);
    }

    const lobbies = (data ?? [])
      .map((row) => row.state as TableState)
      .filter(Boolean)
      .map((state) => sanitizeLegacyState(state))
      .map(toLobbySummary);

    return NextResponse.json({ lobbies });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list lobbies.",
      },
      { status: 500 },
    );
  }
}
