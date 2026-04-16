export type Suit = "♠" | "♥" | "♦" | "♣";

export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type TablePhase =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

export interface TablePlayer {
  sessionId: string;
  name: string;
  seat: number;
  stack: number;
  holeCards: Card[];
  currentBet: number;
  hasFolded: boolean;
  isAllIn: boolean;
  hasActed: boolean;
  isReady: boolean;
  lastAction?: string;
}

export interface TableState {
  roomCode: string;
  hostSessionId: string | null;
  phase: TablePhase;
  handNumber: number;
  dealerSeat: number;
  currentTurnSeat: number | null;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  currentBet: number;
  pot: number;
  communityCards: Card[];
  deck: Card[];
  players: TablePlayer[];
  winnerSessionIds: string[];
  lastMessage: string;
  updatedAt: string;
}

export interface LobbySummary {
  roomCode: string;
  hostName: string;
  playerCount: number;
  handNumber: number;
  phase: TablePhase;
  updatedAt: string;
}

export type PlayerAction =
  | "fold"
  | "check"
  | "call"
  | "raise"
  | "all_in"
  | "toggle_ready"
  | "start_hand"
  | "leave_table";
