import { TableState } from "@/lib/poker-types";
import { BlackjackTableState } from "@/lib/blackjack-types";

type RoomState = TableState | BlackjackTableState;

declare global {
  // eslint-disable-next-line no-var
  var __holdemRoomStore: Map<string, RoomState> | undefined;
}

export function getMemoryRoomStore() {
  if (!globalThis.__holdemRoomStore) {
    globalThis.__holdemRoomStore = new Map<string, RoomState>();
  }

  return globalThis.__holdemRoomStore;
}
