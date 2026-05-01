/**
 * Universal chip system for both poker and blackjack
 * Manages player chip balances and buy-in logic
 */

export const STARTING_CHIPS = 1000;
export const BUY_IN_AMOUNT = 1000;

export interface PlayerChips {
  playerId: string; // sessionId
  gameType: "poker" | "blackjack";
  roomCode: string;
  chipBalance: number;
  buyInAmount: number;
  totalBuyIns: number; // number of times bought in
  joinedAt: string;
  updatedAt: string;
}

export interface ChipsSnapshot {
  [playerId: string]: PlayerChips;
}

/**
 * Initialize chips for a new player joining a room
 */
export function initializePlayerChips(
  sessionId: string,
  gameType: "poker" | "blackjack",
  roomCode: string,
  chipBalance: number = STARTING_CHIPS,
): PlayerChips {
  return {
    playerId: sessionId,
    gameType,
    roomCode,
    chipBalance,
    buyInAmount: BUY_IN_AMOUNT,
    totalBuyIns: 1,
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add chips when player buys in
 */
export function buyInChips(
  playerChips: PlayerChips,
  amount: number = BUY_IN_AMOUNT,
): PlayerChips {
  return {
    ...playerChips,
    chipBalance: playerChips.chipBalance + amount,
    totalBuyIns: playerChips.totalBuyIns + 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deduct chips when player loses
 */
export function deductChips(
  playerChips: PlayerChips,
  amount: number,
): PlayerChips {
  return {
    ...playerChips,
    chipBalance: Math.max(0, playerChips.chipBalance - amount),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add chips when player wins
 */
export function addChips(
  playerChips: PlayerChips,
  amount: number,
): PlayerChips {
  return {
    ...playerChips,
    chipBalance: playerChips.chipBalance + amount,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get or create player chips
 */
export function getOrCreatePlayerChips(
  allChips: ChipsSnapshot,
  sessionId: string,
  gameType: "poker" | "blackjack",
  roomCode: string,
): PlayerChips {
  if (allChips[sessionId]) {
    return allChips[sessionId];
  }

  return initializePlayerChips(sessionId, gameType, roomCode);
}

/**
 * Check if player has enough chips to continue
 */
export function hasEnoughChips(
  playerChips: PlayerChips,
  amount: number,
): boolean {
  return playerChips.chipBalance >= amount;
}

/**
 * Reset chips for new session
 */
export function resetPlayerChips(
  playerChips: PlayerChips,
  newBalance: number = STARTING_CHIPS,
): PlayerChips {
  return {
    ...playerChips,
    chipBalance: newBalance,
    totalBuyIns: 1,
    updatedAt: new Date().toISOString(),
  };
}
