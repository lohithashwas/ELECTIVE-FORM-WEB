import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("vac_session")?.value;

  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session.token) {
        // Invalidate the token in DB
        await supabaseAdmin.rpc("student_logout", { p_token: session.token });
      }
    } catch {
      // Ignore parse errors
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("vac_session", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
