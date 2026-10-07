import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getRegistrationByRoll } from "@/lib/registration-data";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("vac_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    let session;
    try {
      session = JSON.parse(sessionCookie);
    } catch {
      return NextResponse.json({ authenticated: false });
    }

    if (!session?.token) {
      return NextResponse.json({ authenticated: false });
    }

    const { data } = await supabaseAdmin.rpc("verify_session_token", {
      p_token: session.token,
    });

    if (!data?.valid) {
      return NextResponse.json({ authenticated: false });
    }

    const studentReg = data.reg_number || session.reg_number || "";
    const studentName = data.student_name || session.student_name || "";

    let registration = null;
    if (studentReg) {
      registration = await getRegistrationByRoll(studentReg);
    }

    return NextResponse.json({
      authenticated: true,
      reg_number: studentReg,
      student_name: studentName,
      registered: Boolean(registration),
      registration,
    });
  } catch (error) {
    console.error("Session API route error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
