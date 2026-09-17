import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_USERNAME = "ramya";
const ADMIN_PASSWORD = "123svce";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return false;
  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  return user === ADMIN_USERNAME && pass === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("registrations")
    .select(
      `
      id,
      student_name,
      roll_number,
      phone_number,
      section,
      college_email,
      registered_at,
      pe2_subject:pe2_subject_id (
        subject_code,
        subject_name,
        filled_seats,
        max_seats
      ),
      pe3_subject:pe3_subject_id (
        subject_code,
        subject_name,
        filled_seats,
        max_seats
      )
    `
    )
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("Admin fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations." },
      { status: 500 }
    );
  }

  return NextResponse.json({ registrations: data });
}
