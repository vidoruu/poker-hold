import {
  Card,
  PlayerAction,
  Rank,
  TablePlayer,
  TableState,
  TablePhase,
} from "@/lib/poker-types";
import { APP_LIMITS } from "@/lib/constants";

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
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const SUITS: Card["suit"][] = ["♠", "♥", "♦", "♣"];

const MAX_PLAYERS = APP_LIMITS.MAX_PLAYERS;

function nowIso() {
  return new Date().toISOString();
}

function cloneState(state: TableState): TableState {
  return JSON.parse(JSON.stringify(state)) as TableState;
}

function sortPlayers(players: TablePlayer[]) {
  players.sort((a, b) => a.seat - b.seat);
}

function inHand(player: TablePlayer) {
  return player.holeCards.length === 2 && !player.hasFolded;
}

function canAct(player: TablePlayer) {
  return inHand(player) && !player.isAllIn;
}

function getActivePlayersForNewHand(players: TablePlayer[]) {
  return players.filter((p) => p.stack > 0);
}

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function smallestAvailableSeat(players: TablePlayer[]) {
  for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
    if (!players.some((p) => p.seat === seat)) {
      return seat;
    }
  }
  return -1;
}

function getSortedSeats(players: TablePlayer[]) {
  return [...players].sort((a, b) => a.seat - b.seat).map((p) => p.seat);
}

function nextSeatFrom(players: TablePlayer[], startSeat: number, predicate?: (p: TablePlayer) => boolean) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  if (ordered.length === 0) {
    return null;
  }

  const filtered = predicate ? ordered.filter(predicate) : ordered;
  if (filtered.length === 0) {
    return null;
  }

  for (const player of filtered) {
    if (player.seat > startSeat) {
      return player.seat;
    }
  }

  return filtered[0].seat;
}

function getPlayerBySeat(state: TableState, seat: number | null) {
  if (seat === null) {
    return null;
  }
  return state.players.find((p) => p.seat === seat) ?? null;
}

function resetForNextBettingRound(state: TableState, phase: TablePhase) {
  state.phase = phase;
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  for (const p of state.players) {
    p.currentBet = 0;
    p.hasActed = false;
  }

  state.currentTurnSeat = nextSeatFrom(state.players, state.dealerSeat, canAct);
}

function placeBet(player: TablePlayer, amount: number) {
  const committed = Math.min(player.stack, Math.max(0, amount));
  player.stack -= committed;
  player.currentBet += committed;
  if (player.stack === 0) {
    player.isAllIn = true;
  }
  return committed;
}

function dealCard(state: TableState) {
  const card = state.deck.shift();
  if (!card) {
    throw new Error("Deck is empty.");
  }
  return card;
}

function canStartHand(state: TableState) {
  const contenders = getActivePlayersForNewHand(state.players);
  if (contenders.length < 2) {
    return false;
  }
  return contenders.every((p) => p.isReady);
}

function markUpdated(state: TableState) {
  state.updatedAt = nowIso();
}

function isWaitingPhase(phase: TablePhase) {
  return phase === "waiting";
}

function finishHandNoShowdown(state: TableState, winner: TablePlayer) {
  winner.stack += state.pot;
  state.winnerSessionIds = [winner.sessionId];
  state.lastMessage = `${winner.name} wins ${state.pot} chips (others folded).`;
  state.pot = 0;
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.currentTurnSeat = null;
  state.phase = "waiting";

  for (const p of state.players) {
    p.currentBet = 0;
    p.hasActed = false;
    p.isReady = false;
    p.isAllIn = false;
    p.hasFolded = false;
    p.holeCards = [];
    p.lastAction = undefined;
  }
}

function straightHigh(values: number[]) {
  const uniq = [...new Set(values)].sort((a, b) => b - a);
  if (uniq.includes(14)) {
    uniq.push(1);
  }

  let run = 1;
  let best = 0;

  for (let i = 1; i < uniq.length; i += 1) {
    if (uniq[i - 1] - 1 === uniq[i]) {
      run += 1;
      if (run >= 5) {
        best = Math.max(best, uniq[i - 4]);
      }
    } else if (uniq[i - 1] !== uniq[i]) {
      run = 1;
    }
  }

  return best;
}

function evaluateFive(cards: Card[]) {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const straight = straightHigh(values);

  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] === a[1]) {
      return b[0] - a[0];
    }
    return b[1] - a[1];
  });

  // Higher first value wins. Category order:
  // 8 Straight Flush, 7 Four, 6 Full House, 5 Flush, 4 Straight,
  // 3 Trips, 2 Two Pair, 1 Pair, 0 High Card.
  if (isFlush && straight > 0) {
    return [8, straight, 0, 0, 0, 0];
  }

  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups[1][0];
    return [7, quad, kicker, 0, 0, 0];
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return [6, groups[0][0], groups[1][0], 0, 0, 0];
  }

  if (isFlush) {
    return [5, ...values, 0].slice(0, 6);
  }

  if (straight > 0) {
    return [4, straight, 0, 0, 0, 0];
  }

  if (groups[0][1] === 3) {
    const kickers = groups.slice(1).map((g) => g[0]).sort((a, b) => b - a);
    return [3, groups[0][0], kickers[0], kickers[1], 0, 0];
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const topPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    const kicker = groups.find((g) => g[1] === 1)?.[0] ?? 0;
    return [2, topPair, lowPair, kicker, 0, 0];
  }

  if (groups[0][1] === 2) {
    const pair = groups[0][0];
    const kickers = groups
      .slice(1)
      .map((g) => g[0])
      .sort((a, b) => b - a);
    return [1, pair, kickers[0], kickers[1], kickers[2], 0];
  }

  return [0, ...values].slice(0, 6);
}

function compareRanks(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) {
      return 1;
    }
    if (av < bv) {
      return -1;
    }
  }
  return 0;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i += 1) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

function bestRankFromSeven(cards: Card[]) {
  const combos = combinations(cards, 5);
  let best: number[] = [0, 0, 0, 0, 0, 0];
  for (const c of combos) {
    const rank = evaluateFive(c);
    if (compareRanks(rank, best) > 0) {
      best = rank;
    }
  }
  return best;
}

function showdownAndPayout(state: TableState) {
  const contenders = state.players.filter(inHand);
  if (contenders.length === 0) {
    state.lastMessage = "Hand ended with no eligible players.";
    return;
  }

  let best: number[] | null = null;
  const winners: TablePlayer[] = [];

  for (const player of contenders) {
    const rank = bestRankFromSeven([...player.holeCards, ...state.communityCards]);
    if (!best || compareRanks(rank, best) > 0) {
      best = rank;
      winners.length = 0;
      winners.push(player);
    } else if (compareRanks(rank, best) === 0) {
      winners.push(player);
    }
  }

  const each = Math.floor(state.pot / winners.length);
  let remainder = state.pot % winners.length;

  for (const winner of winners) {
    winner.stack += each;
  }

  // Remainder goes in table order from small blind side.
  const startSeat = nextSeatFrom(state.players, state.dealerSeat) ?? 0;
  const orderedWinners = [...winners].sort((a, b) => {
    const da = (a.seat - startSeat + MAX_PLAYERS) % MAX_PLAYERS;
    const db = (b.seat - startSeat + MAX_PLAYERS) % MAX_PLAYERS;
    return da - db;
  });

  let i = 0;
  while (remainder > 0 && orderedWinners.length > 0) {
    orderedWinners[i % orderedWinners.length].stack += 1;
    remainder -= 1;
    i += 1;
  }

  state.winnerSessionIds = winners.map((w) => w.sessionId);
  state.lastMessage =
    winners.length === 1
      ? `${winners[0].name} wins ${state.pot} chips at showdown.`
      : `${winners.map((w) => w.name).join(", ")} split ${state.pot} chips at showdown.`;

  state.pot = 0;
  state.phase = "waiting";
  state.currentBet = 0;
  state.currentTurnSeat = null;

  for (const p of state.players) {
    p.currentBet = 0;
    p.hasActed = false;
    p.isReady = false;
    p.lastAction = undefined;
    p.hasFolded = false;
    p.isAllIn = false;
  }
}

function advanceStreetOrShowdown(state: TableState) {
  if (state.phase === "preflop") {
    state.communityCards = [dealCard(state), dealCard(state), dealCard(state)];
    resetForNextBettingRound(state, "flop");
    return;
  }

  if (state.phase === "flop") {
    state.communityCards.push(dealCard(state));
    resetForNextBettingRound(state, "turn");
    return;
  }

  if (state.phase === "turn") {
    state.communityCards.push(dealCard(state));
    resetForNextBettingRound(state, "river");
    return;
  }

  if (state.phase === "river") {
    state.phase = "showdown";
    showdownAndPayout(state);
  }
}

function bettingRoundComplete(state: TableState) {
  const players = state.players.filter(inHand);
  const actionable = players.filter((p) => !p.isAllIn);
  if (actionable.length === 0) {
    return true;
  }

  return actionable.every((p) => p.hasActed && p.currentBet === state.currentBet);
}

function autoRunIfNoActionsPossible(state: TableState) {
  let guard = 0;
  while (guard < 10) {
    guard += 1;
    const actionable = state.players.filter(canAct);
    if (actionable.length > 1) {
      return;
    }

    const contenders = state.players.filter(inHand);
    if (contenders.length <= 1) {
      const winner = contenders[0];
      if (winner) {
        finishHandNoShowdown(state, winner);
      }
      return;
    }

    if (state.phase === "river" || state.phase === "showdown" || state.phase === "waiting") {
      showdownAndPayout(state);
      return;
    }

    advanceStreetOrShowdown(state);
    if (isWaitingPhase(state.phase)) {
      return;
    }
  }
}

function nextTurn(state: TableState, fromSeat: number) {
  const seat = nextSeatFrom(state.players, fromSeat, canAct);
  state.currentTurnSeat = seat;
}

function normalizedRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function createInitialState(roomCode: string): TableState {
  return {
    roomCode: normalizedRoomCode(roomCode),
    hostSessionId: null,
    phase: "waiting",
    handNumber: 0,
    dealerSeat: -1,
    currentTurnSeat: null,
    smallBlind: 10,
    bigBlind: 20,
    minRaise: 20,
    currentBet: 0,
    pot: 0,
    communityCards: [],
    deck: [],
    players: [],
    winnerSessionIds: [],
    lastMessage: "Waiting for players to join.",
    updatedAt: nowIso(),
  };
}

export function joinTable(state: TableState, sessionId: string, displayName: string) {
  const draft = cloneState(state);
  sortPlayers(draft.players);

  const existing = draft.players.find((p) => p.sessionId === sessionId);
  const safeName = displayName.trim().slice(0, 24) || `Player-${sessionId.slice(0, 4)}`;

  if (existing) {
    existing.name = safeName;
    markUpdated(draft);
    return draft;
  }

  if (draft.players.length >= MAX_PLAYERS) {
    throw new Error("Table is full (max 6 players).");
  }

  const seat = smallestAvailableSeat(draft.players);
  if (seat < 0) {
    throw new Error("No seat available.");
  }

  draft.players.push({
    sessionId,
    name: safeName,
    seat,
    stack: APP_LIMITS.STARTING_STACK,
    holeCards: [],
    currentBet: 0,
    hasFolded: false,
    isAllIn: false,
    hasActed: false,
    isReady: false,
  });

  if (!draft.hostSessionId) {
    draft.hostSessionId = sessionId;
  }

  sortPlayers(draft.players);
  draft.lastMessage = `${safeName} joined seat ${seat + 1}.`;
  markUpdated(draft);
  return draft;
}

export function leaveTable(state: TableState, sessionId: string) {
  const draft = cloneState(state);
  const exiting = draft.players.find((p) => p.sessionId === sessionId);
  draft.players = draft.players.filter((p) => p.sessionId !== sessionId);
  sortPlayers(draft.players);

  if (draft.hostSessionId === sessionId) {
    draft.hostSessionId = draft.players[0]?.sessionId ?? null;
  }

  if (draft.players.length === 0) {
    draft.hostSessionId = null;
    draft.phase = "waiting";
    draft.currentTurnSeat = null;
    draft.pot = 0;
    draft.currentBet = 0;
    draft.deck = [];
    draft.communityCards = [];
  }

  draft.lastMessage = exiting
    ? `${exiting.name} left the table.`
    : "A player left the table.";
  markUpdated(draft);
  return draft;
}

export function toggleReady(state: TableState, sessionId: string) {
  const draft = cloneState(state);
  const player = draft.players.find((p) => p.sessionId === sessionId);

  if (!player) {
    throw new Error("Player not found.");
  }

  if (player.stack <= 0) {
    throw new Error("You are out of chips.");
  }

  player.isReady = !player.isReady;
  draft.lastMessage = `${player.name} is ${player.isReady ? "ready" : "not ready"}.`;
  markUpdated(draft);
  return draft;
}

export function startHand(state: TableState, initiatedBySessionId: string) {
  const draft = cloneState(state);
  const initiator = draft.players.find((p) => p.sessionId === initiatedBySessionId);

  if (!initiator) {
    throw new Error("Player not found.");
  }

  const effectiveHostSessionId = draft.hostSessionId ?? draft.players[0]?.sessionId ?? null;
  draft.hostSessionId = effectiveHostSessionId;

  if (!effectiveHostSessionId || initiatedBySessionId !== effectiveHostSessionId) {
    throw new Error("Only the lobby host can start the hand.");
  }

  if (!canStartHand(draft)) {
    throw new Error("Need at least 2 ready players with chips.");
  }

  const activeSeats = getSortedSeats(getActivePlayersForNewHand(draft.players));
  if (activeSeats.length < 2) {
    throw new Error("Not enough players with chips.");
  }

  draft.handNumber += 1;
  draft.winnerSessionIds = [];
  draft.communityCards = [];
  draft.currentBet = 0;
  draft.pot = 0;
  draft.minRaise = draft.bigBlind;

  draft.deck = buildDeck();
  shuffleDeck(draft.deck);

  const dealerSeat =
    draft.dealerSeat < 0
      ? activeSeats[0]
      : nextSeatFrom(draft.players, draft.dealerSeat, (p) => p.stack > 0) ?? activeSeats[0];
  draft.dealerSeat = dealerSeat;

  for (const p of draft.players) {
    p.holeCards = [];
    p.currentBet = 0;
    p.hasFolded = false;
    p.isAllIn = false;
    p.hasActed = false;
    p.lastAction = undefined;
  }

  const inHandPlayers = [...draft.players]
    .filter((p) => p.stack > 0)
    .sort((a, b) => a.seat - b.seat);

  // Deal hole cards.
  for (let i = 0; i < 2; i += 1) {
    for (const p of inHandPlayers) {
      p.holeCards.push(dealCard(draft));
    }
  }

  const sbSeat = nextSeatFrom(draft.players, draft.dealerSeat, (p) => p.stack > 0);
  const bbSeat = sbSeat === null ? null : nextSeatFrom(draft.players, sbSeat, (p) => p.stack > 0);

  if (sbSeat === null || bbSeat === null) {
    throw new Error("Could not assign blinds.");
  }

  const smallBlindPlayer = getPlayerBySeat(draft, sbSeat);
  const bigBlindPlayer = getPlayerBySeat(draft, bbSeat);

  if (!smallBlindPlayer || !bigBlindPlayer) {
    throw new Error("Blind players missing.");
  }

  draft.pot += placeBet(smallBlindPlayer, draft.smallBlind);
  draft.pot += placeBet(bigBlindPlayer, draft.bigBlind);
  draft.currentBet = Math.max(smallBlindPlayer.currentBet, bigBlindPlayer.currentBet);
  draft.phase = "preflop";

  smallBlindPlayer.lastAction = `SB ${draft.smallBlind}`;
  bigBlindPlayer.lastAction = `BB ${draft.bigBlind}`;

  draft.currentTurnSeat = nextSeatFrom(draft.players, bbSeat, canAct);
  draft.lastMessage = `Hand #${draft.handNumber} started. ${initiator.name} dealt.`;

  markUpdated(draft);
  return draft;
}

export function applyAction(
  state: TableState,
  sessionId: string,
  action: PlayerAction,
  raiseAmount = 0,
) {
  const draft = cloneState(state);

  if (action === "toggle_ready") {
    return toggleReady(draft, sessionId);
  }

  if (action === "start_hand") {
    return startHand(draft, sessionId);
  }

  if (action === "leave_table") {
    return leaveTable(draft, sessionId);
  }

  if (draft.phase === "waiting") {
    throw new Error("No active hand. Start a new hand first.");
  }

  const acting = draft.players.find((p) => p.sessionId === sessionId);
  if (!acting) {
    throw new Error("Player not found.");
  }

  if (acting.seat !== draft.currentTurnSeat) {
    throw new Error("It is not your turn.");
  }

  if (!canAct(acting)) {
    throw new Error("Player cannot act.");
  }

  const callAmount = Math.max(0, draft.currentBet - acting.currentBet);

  if (action === "fold") {
    acting.hasFolded = true;
    acting.hasActed = true;
    acting.lastAction = "Fold";
    draft.lastMessage = `${acting.name} folded.`;
  } else if (action === "check") {
    if (callAmount !== 0) {
      throw new Error("Cannot check. You must call, raise, or fold.");
    }
    acting.hasActed = true;
    acting.lastAction = "Check";
    draft.lastMessage = `${acting.name} checked.`;
  } else if (action === "call") {
    if (callAmount === 0) {
      throw new Error("Nothing to call.");
    }
    const paid = placeBet(acting, callAmount);
    draft.pot += paid;
    acting.hasActed = true;
    acting.lastAction = paid < callAmount ? "Call (all-in)" : "Call";
    draft.lastMessage = `${acting.name} called ${paid}.`;
  } else if (action === "all_in") {
    if (acting.stack <= 0) {
      throw new Error("No chips left.");
    }

    const totalContribution = acting.currentBet + acting.stack;
    const raiseDelta = totalContribution - draft.currentBet;
    const paid = placeBet(acting, acting.stack);
    draft.pot += paid;
    acting.hasActed = true;
    acting.lastAction = "All-in";

    if (raiseDelta > 0 && raiseDelta >= draft.minRaise) {
      draft.currentBet = acting.currentBet;
      draft.minRaise = raiseDelta;
      for (const p of draft.players) {
        if (p.sessionId !== acting.sessionId && canAct(p)) {
          p.hasActed = false;
        }
      }
      acting.hasActed = true;
    }

    draft.lastMessage = `${acting.name} is all-in for ${paid}.`;
  } else if (action === "raise") {
    const desiredRaise = Math.floor(raiseAmount);
    if (desiredRaise < draft.minRaise) {
      throw new Error(`Minimum raise is ${draft.minRaise}.`);
    }

    const totalNeeded = callAmount + desiredRaise;
    if (acting.stack < totalNeeded) {
      throw new Error("Not enough chips for that raise.");
    }

    const paid = placeBet(acting, totalNeeded);
    draft.pot += paid;
    draft.currentBet = acting.currentBet;
    draft.minRaise = desiredRaise;
    acting.hasActed = true;
    acting.lastAction = `Raise +${desiredRaise}`;

    for (const p of draft.players) {
      if (p.sessionId !== acting.sessionId && canAct(p)) {
        p.hasActed = false;
      }
    }

    draft.lastMessage = `${acting.name} raised by ${desiredRaise}.`;
  } else {
    throw new Error("Unsupported action.");
  }

  const remaining = draft.players.filter(inHand);
  if (remaining.length === 1) {
    finishHandNoShowdown(draft, remaining[0]);
    markUpdated(draft);
    return draft;
  }

  if (bettingRoundComplete(draft)) {
    advanceStreetOrShowdown(draft);
    autoRunIfNoActionsPossible(draft);
    markUpdated(draft);
    return draft;
  }

  nextTurn(draft, acting.seat);
  autoRunIfNoActionsPossible(draft);

  markUpdated(draft);
  return draft;
}

export function sanitizeRoomCode(input: string) {
  const code = normalizedRoomCode(input);
  return code.length >= 3 ? code : "POKER1";
}
