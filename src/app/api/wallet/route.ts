import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { UserWallet } from "@/lib/wallet-system";

/**
 * GET /api/wallet
 * Get user's wallet by session ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 },
      );
    }

    if (!hasSupabaseServerConfig()) {
      // For development without Supabase
      return NextResponse.json({
        wallet: {
          sessionId,
          walletBalance: 10000,
          totalDeposited: 10000,
          totalWithdrawn: 0,
        },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("user_wallets")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle<UserWallet>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ wallet: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch wallet",
      },
      { status: 500 },
    );
  }
}
