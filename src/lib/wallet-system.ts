/**
 * Universal Wallet System
 * Persistent chip storage for players across all games
 * Players maintain a wallet balance that they buy in from and cash out to
 */

export const WALLET_STARTING_BALANCE = 10000; // Players start with 10,000 chips in wallet

export interface UserWallet {
  id: string; // UUID
  sessionId: string; // Player's session ID
  displayName: string;
  walletBalance: number; // Total chips in wallet
  totalDeposited: number; // Lifetime deposits
  totalWithdrawn: number; // Lifetime withdrawals
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  sessionId: string;
  type: "buy_in" | "cash_out" | "deposit" | "refund";
  gameType: "poker" | "blackjack";
  roomCode: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

/**
 * Initialize a new wallet for a player
 */
export function createWallet(
  sessionId: string,
  displayName: string,
  startingBalance: number = WALLET_STARTING_BALANCE,
): UserWallet {
  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 15),
    sessionId,
    displayName,
    walletBalance: startingBalance,
    totalDeposited: startingBalance,
    totalWithdrawn: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deduct chips from wallet for buy-in
 */
export function buyInFromWallet(
  wallet: UserWallet,
  amount: number,
): { success: boolean; wallet: UserWallet; error?: string } {
  if (amount <= 0) {
    return {
      success: false,
      wallet,
      error: "Buy-in amount must be greater than 0",
    };
  }

  if (wallet.walletBalance < amount) {
    return {
      success: false,
      wallet,
      error: `Insufficient wallet balance. Available: ${wallet.walletBalance}, Required: ${amount}`,
    };
  }

  return {
    success: true,
    wallet: {
      ...wallet,
      walletBalance: wallet.walletBalance - amount,
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Add chips to wallet from game cash-out
 */
export function cashOutToWallet(
  wallet: UserWallet,
  amount: number,
): UserWallet {
  return {
    ...wallet,
    walletBalance: wallet.walletBalance + amount,
    totalWithdrawn: wallet.totalWithdrawn + amount,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add chips to wallet (manual deposit)
 */
export function depositToWallet(
  wallet: UserWallet,
  amount: number,
): UserWallet {
  if (amount <= 0) {
    return wallet;
  }

  return {
    ...wallet,
    walletBalance: wallet.walletBalance + amount,
    totalDeposited: wallet.totalDeposited + amount,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if wallet has sufficient balance
 */
export function hasEnoughInWallet(
  wallet: UserWallet,
  amount: number,
): boolean {
  return wallet.walletBalance >= amount;
}

/**
 * Get wallet statistics
 */
export function getWalletStats(wallet: UserWallet) {
  return {
    currentBalance: wallet.walletBalance,
    totalDeposited: wallet.totalDeposited,
    totalWithdrawn: wallet.totalWithdrawn,
    netProfit: wallet.totalWithdrawn - wallet.totalDeposited,
    accountCreatedAt: wallet.createdAt,
  };
}

/**
 * Create a wallet transaction record
 */
export function createTransaction(
  sessionId: string,
  type: "buy_in" | "cash_out" | "deposit" | "refund",
  gameType: "poker" | "blackjack",
  roomCode: string,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  description: string,
): WalletTransaction {
  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 15),
    sessionId,
    type,
    gameType,
    roomCode,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    createdAt: new Date().toISOString(),
  };
}
