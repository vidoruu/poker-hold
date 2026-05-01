import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { createWallet, buyInFromWallet, UserWallet } from "@/lib/wallet-system";
import { WALLET_STARTING_BALANCE } from "@/lib/wallet-system";

interface BuyInBody {
  sessionId?: string;
  displayName?: string;
  amount?: number;
  gameType?: "poker" | "blackjack";
  roomCode?: string;
}

/**
 * POST /api/wallet/buy-in
 * Deduct chips from wallet and lock them in game
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BuyInBody;
    const { sessionId, displayName, amount, gameType, roomCode } = body;

    if (!sessionId || !displayName || !amount || !gameType || !roomCode) {
      return NextResponse.json(
        {
          error: "Missing required fields: sessionId, displayName, amount, gameType, roomCode",
        },
        { status: 400 },
      );
    }

    if (!hasSupabaseServerConfig()) {
      // Development mode: just validate amount
      if (amount > WALLET_STARTING_BALANCE) {
        return NextResponse.json(
          { error: "Insufficient wallet balance" },
          { status: 400 },
        );
      }
      return NextResponse.json({
        success: true,
        message: "Buy-in successful",
        amountDeducted: amount,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get or create wallet
    const walletResult = await supabaseAdmin
      .from("user_wallets")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle<UserWallet>();

    if (walletResult.error) {
      throw new Error(walletResult.error.message);
    }

    let wallet = walletResult.data;

    if (!wallet) {
      // Create new wallet
      const newWallet = createWallet(sessionId, displayName);
      const { data: createdWallet, error: createError } = await supabaseAdmin
        .from("user_wallets")
        .insert(newWallet)
        .select()
        .single<UserWallet>();

      if (createError) {
        throw new Error(createError.message);
      }

      wallet = createdWallet;
    }

    // Check balance and deduct
    const buyInResult = buyInFromWallet(wallet, amount);
    if (!buyInResult.success) {
      return NextResponse.json({ error: buyInResult.error }, { status: 400 });
    }

    // Update wallet balance
    const { error: updateError } = await supabaseAdmin
      .from("user_wallets")
      .update({
        wallet_balance: buyInResult.wallet.walletBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Log transaction
    await supabaseAdmin.from("wallet_transactions").insert({
      session_id: sessionId,
      transaction_type: "buy_in",
      game_type: gameType,
      room_code: roomCode,
      amount,
      balance_before: wallet.walletBalance,
      balance_after: buyInResult.wallet.walletBalance,
      description: `Buy-in for ${gameType} in room ${roomCode}`,
    });

    return NextResponse.json({
      success: true,
      message: "Buy-in successful",
      amountDeducted: amount,
      newBalance: buyInResult.wallet.walletBalance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process buy-in",
      },
      { status: 500 },
    );
  }
}
