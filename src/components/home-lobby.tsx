"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LobbySummary } from "@/lib/poker-types";

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function sanitizeRoomCode(value: string) {
  const code = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return code.length >= 3 ? code : randomRoomCode();
}

function ensureSessionId() {
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

export function HomeLobby() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [gameType, setGameType] = useState<"poker" | "blackjack">("poker");
  const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const router = useRouter();

  const buttonLabel = useMemo(() => (roomCode.trim() ? "Join Room" : "Create & Join"), [roomCode]);

  function formatAgo(isoDate: string) {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 1) {
      return "just now";
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function joinRoom(targetRoomCode: string, selectedGameType: "poker" | "blackjack" = gameType) {
    const safeName = name.trim().slice(0, 24) || "Player";
    const safeRoom = sanitizeRoomCode(targetRoomCode);

    ensureSessionId();
    localStorage.setItem("holdem_player_name", safeName);
    
    if (selectedGameType === "blackjack") {
      router.push(`/blackjack/${safeRoom}`);
    } else {
      router.push(`/table/${safeRoom}`);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    joinRoom(roomCode, gameType);
  }

  useEffect(() => {
    let mounted = true;

    async function fetchLobbies() {
      try {
        const response = await fetch("/api/lobbies", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { lobbies?: LobbySummary[] };
        if (mounted && data.lobbies) {
          setLobbies(data.lobbies);
        }
      } finally {
        if (mounted) {
          setLoadingLobbies(false);
        }
      }
    }

    fetchLobbies().catch(() => undefined);
    const interval = setInterval(() => {
      fetchLobbies().catch(() => undefined);
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-8">
      <section className="grid w-full gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white">Enter the table</h2>
          <p className="mt-2 text-sm text-slate-300">Room code can be reused by your group anytime.</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Display Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="e.g. Veer"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none ring-emerald-400/40 transition focus:ring"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Game Type</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGameType("poker")}
                  className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${
                    gameType === "poker"
                      ? "bg-emerald-500 text-black"
                      : "border border-white/15 bg-black/30 text-white hover:bg-black/50"
                  }`}
                >
                  Poker
                </button>
                <button
                  type="button"
                  onClick={() => setGameType("blackjack")}
                  className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${
                    gameType === "blackjack"
                      ? "bg-emerald-500 text-black"
                      : "border border-white/15 bg-black/30 text-white hover:bg-black/50"
                  }`}
                >
                  Blackjack
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Room Code (optional)</span>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength={12}
                placeholder="e.g. FRIDAY8"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 uppercase text-white outline-none ring-emerald-400/40 transition focus:ring"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400"
            >
              {buttonLabel}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-400">
            Your session stays on this browser so you can reconnect quickly.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-2xl sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">Existing lobbies</h2>
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-slate-300">
              {lobbies.length} active
            </span>
          </div>

          {loadingLobbies ? (
            <p className="text-sm text-slate-400">Loading lobbies...</p>
          ) : lobbies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
              <p className="text-sm text-slate-300">No lobbies yet. Create the first one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.roomCode}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-white">{lobby.roomCode}</p>
                    <p className="mt-1 text-xs text-slate-300">
                      Host: <span className="text-emerald-300">{lobby.hostName}</span> • {lobby.playerCount} players • {lobby.phase}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Updated {formatAgo(lobby.updatedAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => joinRoom(lobby.roomCode)}
                    className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    Join Lobby
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
