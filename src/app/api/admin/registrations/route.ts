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

  // Fetch portal settings for results_published status
  const { data: settings } = await supabaseAdmin
    .from("portal_settings")
    .select("results_published")
    .eq("id", 1)
    .maybeSingle();

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
      is_allotted,
      pe2_p1:pe2_p1_id ( subject_code, subject_name ),
      pe2_p2:pe2_p2_id ( subject_code, subject_name ),
      pe2_p3:pe2_p3_id ( subject_code, subject_name ),
      pe3_p1:pe3_p1_id ( subject_code, subject_name ),
      pe3_p2:pe3_p2_id ( subject_code, subject_name ),
      pe3_p3:pe3_p3_id ( subject_code, subject_name ),
      pe2_allotted:pe2_allotted_id ( subject_code, subject_name ),
      pe3_allotted:pe3_allotted_id ( subject_code, subject_name ),
      pe2_subject:pe2_subject_id ( subject_code, subject_name ),
      pe3_subject:pe3_subject_id ( subject_code, subject_name )
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

  return NextResponse.json({
    results_published: settings?.results_published ?? false,
    registrations: data,
  });
}
