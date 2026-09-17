import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/portal-status — returns open time (used by login page countdown)
export async function GET() {
  try {
    const { data: settings } = await supabaseAdmin
      .from("portal_settings")
      .select("portal_open_time, portal_enabled")
      .eq("id", 1)
      .single();

    return NextResponse.json({
      portal_enabled: settings?.portal_enabled ?? false,
      open_time: settings?.portal_open_time ?? null,
    });
  } catch {
    return NextResponse.json({ portal_enabled: false, open_time: null });
  }
}

// POST /api/portal-status — verifies a session token is still valid
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ valid: false });

    const { data } = await supabaseAdmin.rpc("verify_session_token", { p_token: token });
    return NextResponse.json(data ?? { valid: false });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
