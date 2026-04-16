import { TableState } from "@/lib/poker-types";

declare global {
  // eslint-disable-next-line no-var
  var __holdemRoomStore: Map<string, TableState> | undefined;
}

export function getMemoryRoomStore() {
  if (!globalThis.__holdemRoomStore) {
    globalThis.__holdemRoomStore = new Map<string, TableState>();
  }

  return globalThis.__holdemRoomStore;
}
