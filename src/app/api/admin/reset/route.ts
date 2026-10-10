import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, ADMIN_PASSWORD } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { confirm_password } = await request.json();

    if (confirm_password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: "Incorrect admin password confirmation." },
        { status: 400 }
      );
    }

    // 1. Delete all student registrations
    const { error: regErr } = await supabaseAdmin
      .from("registrations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all rows safely

    if (regErr) {
      console.error("Reset error - registrations delete failed:", regErr);
      return NextResponse.json(
        { success: false, message: `Failed to delete registrations: ${regErr.message}` },
        { status: 500 }
      );
    }

    // 2. Reset subjects filled seats and status
    const { error: subErr } = await supabaseAdmin
      .from("subjects")
      .update({ filled_seats: 0, status: "open" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (subErr) {
      console.error("Reset error - subjects update failed:", subErr);
      return NextResponse.json(
        { success: false, message: `Failed to reset subjects: ${subErr.message}` },
        { status: 500 }
      );
    }

    // 3. Clear student session tokens & timestamps
    const { error: studErr } = await supabaseAdmin
      .from("students")
      .update({ active_session_token: null, session_started_at: null })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (studErr) {
      console.error("Reset error - student session clear failed:", studErr);
    }

    // 4. Reset portal results_published status
    const { error: setErr } = await supabaseAdmin
      .from("portal_settings")
      .update({ results_published: false, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (setErr) {
      console.error("Reset error - portal settings reset failed:", setErr);
    }

    return NextResponse.json({
      success: true,
      message: "Portal test data reset successfully! Ready for production deployment.",
    });
  } catch (err) {
    console.error("Unexpected reset error:", err);
    return NextResponse.json(
      { success: false, message: "Unexpected server error during reset." },
      { status: 500 }
    );
  }
}
