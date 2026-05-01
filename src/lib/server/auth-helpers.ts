import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);
    const supabaseAdmin = getSupabaseAdmin();

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
