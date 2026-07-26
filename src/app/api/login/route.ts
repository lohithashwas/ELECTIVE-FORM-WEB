import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { reg_number } = await request.json();

    if (!reg_number?.trim()) {
      return NextResponse.json(
        { success: false, message: "Registration number is required." },
        { status: 400 }
      );
    }

    // ── 1. Check portal time gate ──────────────────────────────
    const { data: settings } = await supabaseAdmin
      .from("portal_settings")
      .select("portal_open_time, portal_enabled")
      .eq("id", 1)
      .single();

    if (!settings?.portal_enabled) {
      return NextResponse.json(
        { success: false, code: "portal_disabled", message: "Portal is currently disabled." },
        { status: 403 }
      );
    }

    const openTime = new Date(settings.portal_open_time);
    const now = new Date();

    if (now < openTime) {
      return NextResponse.json(
        {
          success: false,
          code: "portal_not_open",
          message: "Portal not open yet.",
          open_time: settings.portal_open_time,
        },
        { status: 403 }
      );
    }

    // ── 2. Call login RPC ──────────────────────────────────────
    const { data, error } = await supabaseAdmin.rpc("student_login", {
      p_reg_number: reg_number.trim(),
    });

    if (error) {
      console.error("Login RPC error:", error);
      return NextResponse.json(
        { success: false, message: "Authentication error. Please try again." },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, code: data.code, message: data.message },
        { status: 401 }
      );
    }

    // ── 3. Set session cookie ──────────────────────────────────
    const sessionPayload = {
      token: data.session_token,
      reg_number: data.reg_number,
      student_name: data.student_name,
      college_email: data.college_email,
      expires_at: Date.now() + 90_000,
    };

    const response = NextResponse.json({
      success: true,
      student_name: data.student_name,
    });

    response.cookies.set("vac_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 6, // 6 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { success: false, message: "Unexpected server error." },
      { status: 500 }
    );
  }
}
