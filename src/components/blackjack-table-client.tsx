"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BlackjackTableState } from "@/lib/blackjack-types";

interface BlackjackTableClientProps {
  roomCode: string;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const key = "holdem_session_id";
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function getPlayerName(): string {
  if (typeof window === "undefined") {
    return "Player";
  }
  return localStorage.getItem("holdem_player_name") || "Player";
}

export function BlackjackTableClient({ roomCode }: BlackjackTableClientProps) {
  const [state, setState] = useState<BlackjackTableState | null>(null);
  const [error, setError] = useState("");
  const [betAmount, setBetAmount] = useState(50);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const router = useRouter();

  // Initialize session and player info
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setPlayerName(getPlayerName());
  }, []);

  // Fetch room state
  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`/api/blackjack/room/${roomCode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setState(data.state);
        setError("");
      } else {
        setError("Failed to fetch table state");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching state");
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Join table
  useEffect(() => {
    if (!sessionId || !playerName) return;

    const join = async () => {
      try {
        const response = await fetch(`/api/blackjack/room/${roomCode}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            name: playerName,
            gameType: "blackjack",
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to join table");
        }

        const data = await response.json();
        setState(data.state);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error joining table");
      } finally {
        setLoading(false);
      }
    };

    join();
  }, [roomCode, sessionId, playerName]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchState();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchState]);

  // Place bet
  const handlePlaceBet = async () => {
    try {
      const response = await fetch(`/api/blackjack/room/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "place_bet",
          betAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to place bet");
      }

      const data = await response.json();
      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error placing bet");
    }
  };

  // Hit
  const handleHit = async () => {
    try {
      const response = await fetch(`/api/blackjack/room/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "hit",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to hit");
      }

      const data = await response.json();
      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error hitting");
    }
  };

  // Stand
  const handleStand = async () => {
    try {
      const response = await fetch(`/api/blackjack/room/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "stand",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to stand");
      }

      const data = await response.json();
      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error standing");
    }
  };

  // Leave table
  const handleLeave = async () => {
    try {
      const response = await fetch(`/api/blackjack/room/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "leave_table",
        }),
      });

      if (response.ok) {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error leaving table");
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading blackjack table...</div>;
  }

  if (!state) {
    return <div className="p-8 text-center text-red-500">Failed to load table</div>;
  }

  const currentPlayer = state.players.find((p) => p.sessionId === sessionId);
  const isCurrentPlayerTurn =
    state.phase === "playing" && state.currentPlayerIndex !== null
      ? state.players[state.currentPlayerIndex]?.sessionId === sessionId
      : false;

  return (
    <div className="w-full h-screen bg-green-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Blackjack</h1>
          <div className="text-white">
            <p className="text-sm">Room: {roomCode}</p>
            <p className="text-sm">Hand #{state.handNumber}</p>
            <p className="text-lg font-bold">Phase: {state.phase}</p>
          </div>
        </div>

        {/* Dealer hand */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Dealer</h2>
          <div className="flex gap-4">
            {state.dealerCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-white rounded p-4 text-center font-bold w-20 h-28"
              >
                <div className="text-2xl">{card.rank}</div>
                <div className="text-2xl">{card.suit}</div>
              </div>
            ))}
            {state.dealerHoleCard && (
              <div className="bg-red-900 rounded p-4 w-20 h-28 flex items-center justify-center text-white font-bold">
                ?
              </div>
            )}
          </div>
        </div>

        {/* Players */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          {state.players.map((player, idx) => {
            const isMe = player.sessionId === sessionId;
            const isPlaying = state.currentPlayerIndex === idx;

            return (
              <div
                key={player.sessionId}
                className={`rounded p-4 ${isMe ? "bg-blue-600" : isPlaying ? "bg-yellow-500" : "bg-gray-700"}`}
              >
                <h3 className="text-lg font-bold text-white mb-2">
                  {player.name} {isMe && "(You)"}
                </h3>
                <p className="text-white text-sm">Chips: {player.chipStack}</p>
                <p className="text-white text-sm">Bet: {player.currentBet}</p>

                {/* Player hands */}
                <div className="mt-4 space-y-3">
                  {player.hands.map((hand, handIdx) => (
                    <div key={handIdx} className="bg-green-900 p-3 rounded">
                      <div className="flex gap-2 mb-2">
                        {hand.cards.map((card, cardIdx) => (
                          <div
                            key={cardIdx}
                            className="bg-white rounded p-2 text-center font-bold w-16"
                          >
                            <div className="text-lg">{card.rank}</div>
                            <div className="text-lg">{card.suit}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-white text-xs">
                        {hand.status === "finished" && (
                          <p>Result: {hand.result} (+{hand.payout})</p>
                        )}
                        {hand.status !== "finished" && (
                          <p>Status: {hand.status}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Betting section */}
        {state.phase === "betting" && currentPlayer?.currentBet === 0 && (
          <div className="bg-gray-800 rounded p-6 mb-6">
            <h3 className="text-white font-bold mb-4">Place Your Bet</h3>
            <div className="flex gap-4">
              <input
                type="range"
                min={state.minBet}
                max={Math.min(state.maxBet, currentPlayer?.chipStack || 0)}
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-white font-bold">${betAmount}</span>
              <button
                onClick={handlePlaceBet}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded"
              >
                Place Bet
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {isCurrentPlayerTurn && state.phase === "playing" && (
          <div className="bg-gray-800 rounded p-6 mb-6 flex gap-4">
            <button
              onClick={handleHit}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded"
            >
              Hit
            </button>
            <button
              onClick={handleStand}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded"
            >
              Stand
            </button>
          </div>
        )}

        {/* Leave button */}
        <div className="flex gap-4">
          <button
            onClick={handleLeave}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-2 rounded"
          >
            Leave Table
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-600 text-white p-4 rounded">{error}</div>
        )}

        {/* Messages */}
        {state.lastMessage && (
          <div className="mt-6 bg-blue-600 text-white p-4 rounded">
            {state.lastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
