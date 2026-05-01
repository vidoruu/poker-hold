/**
 * Blackjack game types and interfaces
 * 4-deck blackjack with up to 6 players
 */

import { Card } from "@/lib/poker-types";

export type BlackjackPhase =
  | "waiting"
  | "betting"
  | "dealing"
  | "playing"
  | "dealer_turn"
  | "payout"
  | "finished";

export type BlackjackAction =
  | "hit"
  | "stand"
  | "double_down"
  | "split"
  | "ready"
  | "place_bet"
  | "leave_table";

export type HandResult = "win" | "lose" | "push" | "blackjack" | "bust";

export interface BlackjackHand {
  playerId: string;
  cards: Card[];
  bet: number;
  status: "active" | "stand" | "bust" | "finished";
  result?: HandResult;
  payout: number;
  isSplit?: boolean; // true if this is one of two hands from a split
  parentHandId?: string; // reference to the original hand if split
}

export interface BlackjackPlayer {
  sessionId: string;
  name: string;
  seat: number;
  chipStack: number;
  currentBet: number;
  hands: BlackjackHand[]; // can have multiple hands from splits
  isReady: boolean;
  lastAction?: string;
}

export interface BlackjackTableState {
  roomCode: string;
  gameType: "blackjack";
  hostSessionId: string | null;
  phase: BlackjackPhase;
  handNumber: number;
  dealerCards: Card[]; // first card hidden until dealer plays
  dealerHoleCard?: Card; // the hidden card
  deck: Card[];
  players: BlackjackPlayer[];
  currentPlayerIndex: number | null; // which player is currently playing
  currentHandIndex: number; // which hand of that player (for splits)
  minBet: number;
  maxBet: number;
  currentPot: number;
  lastMessage: string;
  updatedAt: string;
}

export interface BlackjackLobbySummary {
  roomCode: string;
  hostName: string;
  playerCount: number;
  handNumber: number;
  phase: BlackjackPhase;
  minBet: number;
  maxBet: number;
  updatedAt: string;
}
