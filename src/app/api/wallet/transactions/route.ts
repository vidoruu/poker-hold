import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { WalletTransaction } from "@/lib/wallet-system";

/**
 * GET /api/wallet/transactions
 * Get transaction history for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 },
      );
    }

    if (!hasSupabaseServerConfig()) {
      // Development mode
      return NextResponse.json({ transactions: [] });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      transactions: (data || []) as WalletTransaction[],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch transactions",
      },
      { status: 500 },
    );
  }
}
