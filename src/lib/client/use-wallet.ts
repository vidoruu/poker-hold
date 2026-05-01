/**
 * Hook for managing wallet display and interactions
 */
"use client";

import { useEffect, useState } from "react";

export interface WalletDisplay {
  walletBalance: number;
  loading: boolean;
  error: string | null;
}

export function useWallet(sessionId: string): WalletDisplay {
  const [wallet, setWallet] = useState<WalletDisplay>({
    walletBalance: 10000,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!sessionId) return;

    const fetchWallet = async () => {
      try {
        const response = await fetch(
          `/api/wallet?sessionId=${encodeURIComponent(sessionId)}`,
        );

        if (response.ok) {
          const data = await response.json();
          setWallet({
            walletBalance: data.wallet?.walletBalance || 10000,
            loading: false,
            error: null,
          });
        } else if (response.status === 404) {
          // Wallet doesn't exist yet, will be created on first buy-in
          setWallet({
            walletBalance: 10000,
            loading: false,
            error: null,
          });
        } else {
          throw new Error("Failed to fetch wallet");
        }
      } catch (err) {
        setWallet({
          walletBalance: 10000,
          loading: false,
          error: err instanceof Error ? err.message : "Error fetching wallet",
        });
      }
    };

    fetchWallet();
  }, [sessionId]);

  return wallet;
}
