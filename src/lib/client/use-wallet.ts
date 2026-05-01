/**
 * Hook for managing wallet display and interactions
 */
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase-browser";

export interface WalletDisplay {
  walletBalance: number;
  loading: boolean;
  error: string | null;
}

export function useWallet(userId: string): WalletDisplay {
  const [wallet, setWallet] = useState<WalletDisplay>({
    walletBalance: 10000,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId || !supabaseBrowser) {
      setWallet({
        walletBalance: 10000,
        loading: false,
        error: null,
      });
      return;
    }

    const fetchWallet = async () => {
      try {
        const {
          data: { session },
        } = await (supabaseBrowser!).auth.getSession();

        if (!session?.access_token) {
          throw new Error("No access token");
        }

        const response = await fetch("/api/wallet", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setWallet({
            walletBalance: data.wallet?.wallet_balance || 10000,
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

    // Refetch wallet every 10 seconds
    const interval = setInterval(fetchWallet, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  return wallet;
}

