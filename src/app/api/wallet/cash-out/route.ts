import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { cashOutToWallet, UserWallet } from "@/lib/wallet-system";

interface CashOutBody {
  sessionId?: string;
  amount?: number;
  gameType?: "poker" | "blackjack";
  roomCode?: string;
}

/**
 * POST /api/wallet/cash-out
 * Add chips back to wallet from game winnings
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CashOutBody;
    const { sessionId, amount, gameType, roomCode } = body;

    if (!sessionId || !amount || !gameType || !roomCode) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, amount, gameType, roomCode" },
        { status: 400 },
      );
    }

    if (!hasSupabaseServerConfig()) {
      // Development mode: just accept the cash-out
      return NextResponse.json({
        success: true,
        message: "Cash-out successful",
        amountAdded: amount,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get wallet
    const { data: wallet, error: fetchError } = await supabaseAdmin
      .from("user_wallets")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle<UserWallet>();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 },
      );
    }

    // Add chips to wallet
    const updatedWallet = cashOutToWallet(wallet, amount);

    // Update wallet
    const { error: updateError } = await supabaseAdmin
      .from("user_wallets")
      .update({
        wallet_balance: updatedWallet.walletBalance,
        total_withdrawn: updatedWallet.totalWithdrawn,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Log transaction
    await supabaseAdmin.from("wallet_transactions").insert({
      session_id: sessionId,
      transaction_type: "cash_out",
      game_type: gameType,
      room_code: roomCode,
      amount,
      balance_before: wallet.walletBalance,
      balance_after: updatedWallet.walletBalance,
      description: `Cash-out from ${gameType} in room ${roomCode}`,
    });

    return NextResponse.json({
      success: true,
      message: "Cash-out successful",
      amountAdded: amount,
      newBalance: updatedWallet.walletBalance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process cash-out",
      },
      { status: 500 },
    );
  }
}
