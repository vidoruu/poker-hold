/**
 * Blackjack game engine
 * 4-deck standard blackjack with split, double down, and basic strategy
 */

import { Card, Rank } from "@/lib/poker-types";
import {
  BlackjackTableState,
  BlackjackPlayer,
  BlackjackHand,
  HandResult,
} from "@/lib/blackjack-types";

const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const SUITS: Card["suit"][] = ["♠", "♥", "♦", "♣"];

const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
  A: 11, // will handle soft/hard ace in hand value calculation
};

const NUM_DECKS = 4;
const MAX_PLAYERS = 6;

function nowIso() {
  return new Date().toISOString();
}

/**
 * Create a standard 52-card deck (4 decks in a shoe)
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let deckNum = 0; deckNum < NUM_DECKS; deckNum++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
  }
  // Shuffle the deck
  return shuffleDeck(deck);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw a card from the deck
 */
export function drawCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  if (deck.length === 0) {
    return { card: { suit: "♠", rank: "A" }, remainingDeck: createDeck() };
  }

  const card = deck[0];
  const remainingDeck = deck.slice(1);
  return { card, remainingDeck };
}

/**
 * Calculate hand value for blackjack
 * Handles soft/hard aces properly
 */
export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    const cardValue = RANK_VALUE[card.rank];
    value += cardValue;
    if (card.rank === "A") {
      aces += 1;
    }
  }

  // Adjust for aces (convert 11 to 1 if needed to avoid bust)
  let isSoft = aces > 0;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
    isSoft = aces > 0;
  }

  return { value, isSoft };
}

/**
 * Check if a hand is a blackjack (21 with 2 cards)
 */
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && calculateHandValue(cards).value === 21;
}

/**
 * Check if a hand is bust
 */
export function isBust(cards: Card[]): boolean {
  return calculateHandValue(cards).value > 21;
}

/**
 * Create initial blackjack table state
 */
export function createBlackjackTableState(
  roomCode: string,
  minBet: number = 10,
  maxBet: number = 500,
): BlackjackTableState {
  return {
    roomCode,
    gameType: "blackjack",
    hostSessionId: null,
    phase: "waiting",
    handNumber: 1,
    dealerCards: [],
    dealerHoleCard: undefined,
    deck: createDeck(),
    players: [],
    currentPlayerIndex: null,
    currentHandIndex: 0,
    minBet,
    maxBet,
    currentPot: 0,
    lastMessage: "Waiting for players...",
    updatedAt: nowIso(),
  };
}

/**
 * Add player to table
 */
export function joinBlackjackTable(
  state: BlackjackTableState,
  sessionId: string,
  name: string,
  chipStack: number,
): BlackjackTableState {
  // Check if player already exists
  const existingPlayer = state.players.find((p) => p.sessionId === sessionId);
  if (existingPlayer) {
    return state;
  }

  // Check max players
  if (state.players.length >= MAX_PLAYERS) {
    throw new Error("Table is full");
  }

  // Set host if first player
  let hostSessionId = state.hostSessionId;
  if (!hostSessionId) {
    hostSessionId = sessionId;
  }

  const newPlayer: BlackjackPlayer = {
    sessionId,
    name,
    seat: state.players.length,
    chipStack,
    currentBet: 0,
    hands: [],
    isReady: false,
    lastAction: "joined",
  };

  return {
    ...state,
    players: [...state.players, newPlayer],
    hostSessionId,
    updatedAt: nowIso(),
  };
}

/**
 * Place a bet for the current hand
 */
export function placeBet(
  state: BlackjackTableState,
  sessionId: string,
  betAmount: number,
): BlackjackTableState {
  const playerIndex = state.players.findIndex((p) => p.sessionId === sessionId);
  if (playerIndex === -1) {
    throw new Error("Player not found");
  }

  const player = state.players[playerIndex];

  if (betAmount < state.minBet || betAmount > state.maxBet) {
    throw new Error(`Bet must be between ${state.minBet} and ${state.maxBet}`);
  }

  if (betAmount > player.chipStack) {
    throw new Error("Insufficient chips for this bet");
  }

  const updatedPlayer = {
    ...player,
    currentBet: betAmount,
    chipStack: player.chipStack - betAmount,
    isReady: true,
    lastAction: `placed ${betAmount} chip bet`,
  };

  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = updatedPlayer;

  // Check if all players have placed bets
  const allReady = updatedPlayers.every((p) => p.isReady || p.chipStack === 0);

  return {
    ...state,
    players: updatedPlayers,
    currentPot: state.currentPot + betAmount,
    phase: allReady ? "dealing" : "betting",
    updatedAt: nowIso(),
  };
}

/**
 * Deal initial cards
 */
export function dealCards(state: BlackjackTableState): BlackjackTableState {
  let deck = state.deck;

  // Deal to players
  const updatedPlayers = state.players.map((player) => {
    if (player.currentBet === 0) {
      return player;
    }

    const hand1Card = drawCard(deck);
    deck = hand1Card.remainingDeck;

    const hand2Card = drawCard(deck);
    deck = hand2Card.remainingDeck;

    const hand: BlackjackHand = {
      playerId: player.sessionId,
      cards: [hand1Card.card, hand2Card.card],
      bet: player.currentBet,
      status: "active",
      payout: 0,
    };

    return {
      ...player,
      hands: [hand],
    };
  });

  // Deal to dealer
  const dealerCard1 = drawCard(deck);
  deck = dealerCard1.remainingDeck;

  const dealerCard2 = drawCard(deck);
  deck = dealerCard2.remainingDeck;

  // Find first player to act
  const firstActivePlayerIndex = updatedPlayers.findIndex(
    (p) => p.hands.length > 0 && p.hands[0].status === "active",
  );

  return {
    ...state,
    players: updatedPlayers,
    dealerCards: [dealerCard1.card],
    dealerHoleCard: dealerCard2.card,
    deck,
    phase: "playing",
    currentPlayerIndex: firstActivePlayerIndex !== -1 ? firstActivePlayerIndex : null,
    currentHandIndex: 0,
    lastMessage: "Dealing cards...",
    updatedAt: nowIso(),
  };
}

/**
 * Player hits
 */
export function playerHit(state: BlackjackTableState): BlackjackTableState {
  if (
    state.currentPlayerIndex === null ||
    state.currentPlayerIndex >= state.players.length
  ) {
    return state;
  }

  const player = state.players[state.currentPlayerIndex];
  const hand = player.hands[state.currentHandIndex];

  if (!hand) {
    return state;
  }

  const drawnCard = drawCard(state.deck);
  const newCards = [...hand.cards, drawnCard.card];

  const newHand: BlackjackHand = {
    ...hand,
    cards: newCards,
    status: isBust(newCards) ? "bust" : "active",
  };

  const updatedPlayer = {
    ...player,
    hands: [...player.hands],
  };
  updatedPlayer.hands[state.currentHandIndex] = newHand;

  const updatedPlayers = [...state.players];
  updatedPlayers[state.currentPlayerIndex] = updatedPlayer;

  return {
    ...state,
    players: updatedPlayers,
    deck: drawnCard.remainingDeck,
    updatedAt: nowIso(),
  };
}

/**
 * Player stands
 */
export function playerStand(state: BlackjackTableState): BlackjackTableState {
  if (
    state.currentPlayerIndex === null ||
    state.currentPlayerIndex >= state.players.length
  ) {
    return state;
  }

  const player = state.players[state.currentPlayerIndex];
  const hand = player.hands[state.currentHandIndex];

  if (!hand) {
    return state;
  }

  // Mark hand as standing
  const updatedHand: BlackjackHand = {
    ...hand,
    status: "stand",
  };

  const updatedPlayer = {
    ...player,
    hands: [...player.hands],
  };
  updatedPlayer.hands[state.currentHandIndex] = updatedHand;

  const updatedPlayers = [...state.players];
  updatedPlayers[state.currentPlayerIndex] = updatedPlayer;

  // Move to next hand or next player
  let nextPlayerIndex = state.currentPlayerIndex;
  let nextHandIndex = state.currentHandIndex + 1;

  if (nextHandIndex >= updatedPlayers[nextPlayerIndex].hands.length) {
    nextHandIndex = 0;
    nextPlayerIndex += 1;

    while (nextPlayerIndex < updatedPlayers.length) {
      if (updatedPlayers[nextPlayerIndex].hands.length > 0) {
        break;
      }
      nextPlayerIndex += 1;
    }
  }

  const shouldDealerPlay = nextPlayerIndex >= updatedPlayers.length;

  return {
    ...state,
    players: updatedPlayers,
    currentPlayerIndex: shouldDealerPlay ? null : nextPlayerIndex,
    currentHandIndex: nextHandIndex,
    phase: shouldDealerPlay ? "dealer_turn" : "playing",
    updatedAt: nowIso(),
  };
}

/**
 * Process dealer's hand (dealer hits on 16 or less, stands on 17+)
 */
export function dealerPlay(state: BlackjackTableState): BlackjackTableState {
  let deck = state.deck;
  let dealerCards = [...state.dealerCards];

  if (state.dealerHoleCard) {
    dealerCards = [...dealerCards, state.dealerHoleCard];
  }

  // Dealer hits on soft 17 or less
  while (calculateHandValue(dealerCards).value < 17) {
    const drawnCard = drawCard(deck);
    dealerCards.push(drawnCard.card);
    deck = drawnCard.remainingDeck;
  }

  return {
    ...state,
    dealerCards,
    dealerHoleCard: undefined,
    deck,
    phase: "payout",
    updatedAt: nowIso(),
  };
}

/**
 * Calculate payouts based on dealer's hand
 */
export function calculatePayouts(state: BlackjackTableState): BlackjackTableState {
  const dealerValue = calculateHandValue(state.dealerCards).value;
  const dealerBust = isBust(state.dealerCards);

  const updatedPlayers = state.players.map((player) => {
    let totalPayout = 0;

    const updatedHands = player.hands.map((hand) => {
      let result: HandResult = "lose";
      let payout = 0;

      const playerValue = calculateHandValue(hand.cards).value;
      const playerBust = isBust(hand.cards);
      const playerBlackjack = isBlackjack(hand.cards);

      if (playerBust) {
        result = "bust";
        payout = 0;
      } else if (dealerBust) {
        result = "win";
        payout = hand.bet * 2;
      } else if (playerValue > dealerValue) {
        result = playerBlackjack ? "blackjack" : "win";
        payout = playerBlackjack ? hand.bet * 2.5 : hand.bet * 2;
      } else if (playerValue === dealerValue) {
        result = "push";
        payout = hand.bet;
      }

      totalPayout += payout;

      return {
        ...hand,
        result,
        payout,
        status: "finished" as const,
      };
    });

    return {
      ...player,
      hands: updatedHands,
      chipStack: player.chipStack + totalPayout,
    };
  });

  return {
    ...state,
    players: updatedPlayers,
    phase: "finished",
    lastMessage: "Hand complete. Payout calculated.",
    updatedAt: nowIso(),
  };
}

/**
 * Reset table for next hand
 */
export function resetForNextHand(state: BlackjackTableState): BlackjackTableState {
  const deck = state.deck.length < 80 ? createDeck() : state.deck;

  const updatedPlayers = state.players.map((player) => ({
    ...player,
    currentBet: 0,
    hands: [],
    isReady: false,
  }));

  return {
    ...state,
    players: updatedPlayers,
    dealerCards: [],
    dealerHoleCard: undefined,
    deck,
    phase: "betting",
    handNumber: state.handNumber + 1,
    currentPlayerIndex: null,
    currentHandIndex: 0,
    currentPot: 0,
    lastMessage: "Next hand starting...",
    updatedAt: nowIso(),
  };
}

/**
 * Remove player from table
 */
export function removePlayerFromBlackjackTable(
  state: BlackjackTableState,
  sessionId: string,
): BlackjackTableState {
  const updatedPlayers = state.players.filter((p) => p.sessionId !== sessionId);

  // Update host if needed
  let newHostSessionId = state.hostSessionId;
  if (state.hostSessionId === sessionId) {
    newHostSessionId = updatedPlayers[0]?.sessionId ?? null;
  }

  return {
    ...state,
    players: updatedPlayers,
    hostSessionId: newHostSessionId,
    lastMessage: `${state.players.find((p) => p.sessionId === sessionId)?.name} left the table`,
    updatedAt: nowIso(),
  };
}
