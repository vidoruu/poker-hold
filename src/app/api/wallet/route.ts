import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  hasSupabaseServerConfig,
} from "@/lib/server/supabase-admin";
import { UserWallet } from "@/lib/wallet-system";

/**
 * GET /api/wallet
 * Get user's wallet by user ID (from auth token)
 */
export async function GET(request: Request) {
  try {
    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_wallets")
      .select("*")
      .eq("user_id", user.id)
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

/**
 * POST /api/wallet
 * Create wallet for new user
 */
export async function POST(request: Request) {
  try {
    const { userId, displayName } = await request.json();

    if (!userId || !displayName) {
      return NextResponse.json(
        { error: "Missing userId or displayName" },
        { status: 400 },
      );
    }

    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if wallet already exists
    const { data: existingWallet } = await supabaseAdmin
      .from("user_wallets")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingWallet) {
      return NextResponse.json({ wallet: existingWallet }, { status: 200 });
    }

    // Create new wallet
    const { data, error } = await supabaseAdmin
      .from("user_wallets")
      .insert({
        user_id: userId,
        display_name: displayName,
        wallet_balance: 10000,
        total_deposited: 10000,
        total_withdrawn: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ wallet: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create wallet",
      },
      { status: 500 },
    );
  }
}
