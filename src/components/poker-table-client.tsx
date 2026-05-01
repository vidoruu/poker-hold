"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hasRealtimeConfig, supabaseBrowser } from "@/lib/client/supabase-browser";
import { Card, PlayerAction, TablePlayer, TableState } from "@/lib/poker-types";

const SESSION_KEY = "holdem_session_id";
const NAME_KEY = "holdem_player_name";

function cardColor(suit: string) {
  return suit === "♥" || suit === "♦" ? "text-rose-600" : "text-slate-900";
}

function getSessionId() {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

function ActionButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${className ?? "bg-slate-700 text-white hover:bg-slate-600"}`}
    >
      {label}
    </button>
  );
}

function PlayingCard({
  card,
  faceDown = false,
  small = false,
}: {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
}) {
  if (faceDown || !card) {
    return (
      <div
        className={`grid place-items-center rounded-lg border border-white/20 bg-linear-to-br from-indigo-700 to-slate-900 text-slate-100 ${small ? "h-12 w-9 text-xs" : "h-20 w-14 text-sm"}`}
      >
        🂠
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border border-slate-300 bg-linear-to-b from-white to-slate-100 font-bold shadow-[0_6px_18px_rgba(0,0,0,0.35)] ${small ? "h-12 w-9" : "h-20 w-14"}`}
    >
      <span className={`absolute left-1 top-1 leading-none ${small ? "text-[9px]" : "text-xs"} ${cardColor(card.suit)}`}>
        {card.rank}
      </span>
      <span className={`absolute right-1 top-1 leading-none ${small ? "text-[9px]" : "text-xs"} ${cardColor(card.suit)}`}>
        {card.suit}
      </span>
      <span className={`absolute inset-0 grid place-items-center ${small ? "text-sm" : "text-xl"} ${cardColor(card.suit)}`}>
        {card.suit}
      </span>
      <span className={`absolute bottom-1 right-1 rotate-180 leading-none ${small ? "text-[9px]" : "text-xs"} ${cardColor(card.suit)}`}>
        {card.rank}
      </span>
    </div>
  );
}

function SeatChip({ label, tone }: { label: string; tone: "emerald" | "rose" | "fuchsia" | "amber" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-900/50 text-emerald-300"
      : tone === "rose"
        ? "bg-rose-900/50 text-rose-300"
        : tone === "fuchsia"
          ? "bg-fuchsia-900/50 text-fuchsia-300"
          : "bg-amber-900/50 text-amber-300";

  return <span className={`rounded px-2 py-1 text-[11px] ${toneClass}`}>{label}</span>;
}

function PlayerSeat({
  player,
  isMe,
  isTurn,
  showCards,
  isDealer,
  compact = false,
}: {
  player: TablePlayer;
  isMe: boolean;
  isTurn: boolean;
  showCards: boolean;
  isDealer: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 shadow-xl transition ${
        isMe
          ? "border-emerald-300/80 bg-emerald-950/50"
          : "border-white/10 bg-black/50"
      } ${isTurn ? "ring-2 ring-yellow-400" : ""} ${compact ? "w-48" : "w-full"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate font-semibold text-white">{player.name}</p>
        <div className="flex items-center gap-1">
          {isDealer ? <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">D</span> : null}
          {isTurn ? <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-bold text-black">TURN</span> : null}
        </div>
      </div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-emerald-300">{player.stack} chips</span>
        <span className="rounded-full bg-black/40 px-2 py-1 text-slate-200">
          Seat {player.seat + 1}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>Bet: {player.currentBet}</span>
        {player.lastAction ? <span className="text-amber-300">{player.lastAction}</span> : <span className="text-slate-500">—</span>}
      </div>

      <div className="mt-2 flex gap-2">
        {showCards
          ? player.holeCards.map((card, index) => (
              <PlayingCard key={`${card.rank}${card.suit}${index}`} card={card} small />
            ))
          : [0, 1].map((idx) => (
              <PlayingCard key={idx} faceDown small />
            ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {player.hasFolded ? <SeatChip label="Folded" tone="rose" /> : null}
        {player.isAllIn ? <SeatChip label="All-in" tone="fuchsia" /> : null}
        {player.isReady ? <SeatChip label="Ready" tone="emerald" /> : null}
      </div>
    </div>
  );
}

const DESKTOP_SEAT_POSITIONS = [
  "left-1/2 bottom-5 -translate-x-1/2",
  "right-5 bottom-24",
  "right-5 top-24",
  "left-1/2 top-5 -translate-x-1/2",
  "left-5 top-24",
  "left-5 bottom-24",
];

export function PokerTableClient({ roomCode }: { roomCode: string }) {
  const [sessionId, setSessionId] = useState("");
  const [state, setState] = useState<TableState | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [raiseBy, setRaiseBy] = useState(20);

  const me = useMemo(
    () => state?.players.find((p) => p.sessionId === sessionId) ?? null,
    [state, sessionId],
  );

  const effectiveHostSessionId = useMemo(
    () => state?.hostSessionId ?? state?.players[0]?.sessionId ?? null,
    [state],
  );

  const isHost = Boolean(me && effectiveHostSessionId && me.sessionId === effectiveHostSessionId);

  const myTurn = Boolean(me && state && state.currentTurnSeat === me.seat && state.phase !== "waiting");
  const callAmount = me && state ? Math.max(0, state.currentBet - me.currentBet) : 0;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/room/${roomCode}`, { cache: "no-store" });
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { state: TableState };
    setState(data.state);
  }, [roomCode]);

  const sendAction = useCallback(
    async (action: PlayerAction, amount?: number) => {
      if (!sessionId) {
        return;
      }
      setPending(true);
      setError("");
      try {
        const res = await fetch(`/api/room/${roomCode}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action, amount }),
        });

        const data = (await res.json()) as { state?: TableState; error?: string };
        if (!res.ok || data.error) {
          throw new Error(data.error ?? "Action failed.");
        }
        if (data.state) {
          setState(data.state);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setPending(false);
      }
    },
    [roomCode, sessionId],
  );

  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);

    const name = localStorage.getItem(NAME_KEY) ?? "Player";

    async function join() {
      setError("");
      try {
        const res = await fetch("/api/room/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode, sessionId: sid, name }),
        });

        let data;
        try {
          data = (await res.json()) as { state?: TableState; error?: string };
        } catch {
          console.error("Failed to parse response:", res.status, res.statusText);
          setError(`Server error: ${res.status} ${res.statusText}`);
          return;
        }

        if (!res.ok || data.error || !data.state) {
          const errorMsg = data.error ?? "Could not join room.";
          console.error("Join failed:", errorMsg);
          setError(errorMsg);
          return;
        }

        setState(data.state);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not join room.";
        console.error("Join error:", msg);
        setError(msg);
      }
    }

    join();
  }, [roomCode]);

  useEffect(() => {
    const client = supabaseBrowser;

    if (!hasRealtimeConfig || !client) {
      const id = setInterval(() => {
        refresh().catch(() => undefined);
      }, 2000);
      return () => clearInterval(id);
    }

    const channel = client
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_tables",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const next = payload.new as { state?: TableState };
          if (next?.state) {
            setState(next.state);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel).catch(() => undefined);
    };
  }, [refresh, roomCode]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const minRaise = Math.max(state.minRaise, state.bigBlind);
    if (raiseBy < minRaise) {
      setRaiseBy(minRaise);
    }
  }, [raiseBy, state]);

  if (!state) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 text-slate-200">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
          <p>Joining room {roomCode}...</p>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-200 hover:bg-black/40"
          >
            Back to lobby
          </Link>
        </div>
      </main>
    );
  }

  const canStart =
    state.phase === "waiting" &&
    isHost &&
    state.players.filter((p) => p.stack > 0).length >= 2 &&
    state.players.filter((p) => p.stack > 0).every((p) => p.isReady);

  const hostName =
    state.players.find((p) => p.sessionId === effectiveHostSessionId)?.name ??
    state.players[0]?.name ??
    "—";

  const roundLabel =
    state.phase === "preflop"
      ? "Preflop"
      : state.phase === "flop"
        ? "Flop"
        : state.phase === "turn"
          ? "Turn"
          : state.phase === "river"
            ? "River"
            : state.phase === "showdown"
              ? "Showdown"
              : "Waiting";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Room</p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{state.roomCode}</h1>
          <p className="mt-1 text-xs text-slate-400">
            Host: <span className="font-semibold text-emerald-300">{hostName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-slate-200 hover:bg-black/40"
          >
            Back to lobby
          </Link>
          <button
            type="button"
            className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
            onClick={() => sendAction("leave_table")}
          >
            Leave
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-3 shadow-2xl sm:p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="rounded-xl bg-black/30 px-3 py-2 text-slate-200">
            Phase: <span className="font-semibold text-emerald-300">{roundLabel}</span>
          </div>
          <div className="rounded-xl bg-black/30 px-3 py-2 text-slate-200">
            Pot: <span className="font-semibold text-amber-300">{state.pot}</span>
          </div>
          <div className="rounded-xl bg-black/30 px-3 py-2 text-slate-200">
            Current Bet: <span className="font-semibold text-white">{state.currentBet}</span>
          </div>
          <div className="rounded-xl bg-black/30 px-3 py-2 text-slate-200">
            Hand #{state.handNumber}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-4xl border border-emerald-400/25 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.5),rgba(5,46,22,0.95)_60%)] shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]">
          <div className="relative hidden h-170 md:block">
            <div className="absolute inset-x-[8%] top-[18%] bottom-[18%] rounded-[999px] border border-white/10 bg-black/20" />

            <div className="absolute left-1/2 top-1/2 z-10 flex w-[320px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
              <div className="rounded-full border border-amber-300/50 bg-black/40 px-4 py-2 text-sm text-amber-200">
                Pot: <span className="font-bold">{state.pot}</span>
              </div>

              <div className="flex min-h-20 items-center justify-center gap-2">
                {state.communityCards.length === 0
                  ? [0, 1, 2, 3, 4].map((idx) => <PlayingCard key={idx} faceDown />)
                  : state.communityCards.map((card, idx) => (
                      <PlayingCard key={`${card.rank}${card.suit}${idx}`} card={card} />
                    ))}
              </div>

              <p className="rounded-full bg-black/40 px-3 py-1 text-xs text-slate-200">
                {state.lastMessage || "Waiting for action..."}
              </p>
            </div>

            {state.players.map((player) => (
              <div
                key={player.sessionId}
                className={`absolute ${DESKTOP_SEAT_POSITIONS[player.seat] ?? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"}`}
              >
                <PlayerSeat
                  player={player}
                  isMe={player.sessionId === sessionId}
                  isTurn={state.currentTurnSeat === player.seat && state.phase !== "waiting"}
                  showCards={
                    player.sessionId === sessionId ||
                    state.phase === "showdown" ||
                    state.phase === "waiting"
                  }
                  isDealer={state.dealerSeat === player.seat}
                  compact
                />
              </div>
            ))}
          </div>

          <div className="p-3 md:hidden">
            <div className="mb-4 flex flex-col items-center gap-2">
              <div className="rounded-full border border-amber-300/50 bg-black/40 px-4 py-2 text-sm text-amber-200">
                Pot: <span className="font-bold">{state.pot}</span>
              </div>
              <div className="flex min-h-16 items-center justify-center gap-2">
                {state.communityCards.length === 0
                  ? [0, 1, 2, 3, 4].map((idx) => <PlayingCard key={idx} faceDown small />)
                  : state.communityCards.map((card, idx) => (
                      <PlayingCard key={`${card.rank}${card.suit}${idx}`} card={card} small />
                    ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {state.players.map((player) => (
                <PlayerSeat
                  key={player.sessionId}
                  player={player}
                  isMe={player.sessionId === sessionId}
                  isTurn={state.currentTurnSeat === player.seat && state.phase !== "waiting"}
                  showCards={
                    player.sessionId === sessionId ||
                    state.phase === "showdown" ||
                    state.phase === "waiting"
                  }
                  isDealer={state.dealerSeat === player.seat}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-sm text-slate-200">{state.lastMessage || "Waiting for action..."}</p>
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Action Panel</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={me?.isReady ? "Unready" : "Ready"}
            onClick={() => sendAction("toggle_ready")}
            disabled={pending || !me || state.phase !== "waiting"}
            className="bg-emerald-500 text-black hover:bg-emerald-400"
          />
          <ActionButton
            label="Start Hand"
            onClick={() => sendAction("start_hand")}
            disabled={pending || !me || !canStart}
            className="bg-yellow-400 text-black hover:bg-yellow-300"
          />
        </div>

        {!isHost ? (
          <p className="mt-3 text-xs text-slate-400">
            Only the lobby host ({hostName}) can start a new hand.
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <ActionButton
            label="Fold"
            onClick={() => sendAction("fold")}
            disabled={pending || !myTurn}
            className="bg-rose-500 text-white hover:bg-rose-400"
          />
          <ActionButton
            label="Check"
            onClick={() => sendAction("check")}
            disabled={pending || !myTurn || callAmount !== 0}
            className="bg-slate-600 text-white hover:bg-slate-500"
          />
          <ActionButton
            label={`Call ${callAmount}`}
            onClick={() => sendAction("call")}
            disabled={pending || !myTurn || callAmount === 0}
            className="bg-blue-500 text-white hover:bg-blue-400"
          />
          <ActionButton
            label="All-in"
            onClick={() => sendAction("all_in")}
            disabled={pending || !myTurn}
            className="bg-fuchsia-600 text-white hover:bg-fuchsia-500"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-400">Raise</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Raise by</label>
            <input
              type="number"
              min={state.minRaise}
              value={raiseBy}
              onChange={(e) => setRaiseBy(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 rounded-md border border-white/20 bg-slate-900 px-2 py-1 text-sm text-white outline-none"
            />
            <ActionButton
              label="Raise"
              onClick={() => sendAction("raise", raiseBy)}
              disabled={pending || !myTurn || !me || raiseBy < state.minRaise}
              className="bg-orange-500 text-white hover:bg-orange-400"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Minimum raise: {state.minRaise}. Dealer button rotates each hand. Turn highlights in yellow.
        </p>
      </section>
    </main>
  );
}
