import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("subjects")
      .select("id, subject_code, subject_name, max_seats, filled_seats, status, elective_group")
      .not("subject_code", "like", "%REPLACE%")
      .order("elective_group", { ascending: true })
      .order("subject_code", { ascending: true });

    if (error) {
      console.error("Error fetching subjects:", error);
      return NextResponse.json(
        { error: "Failed to fetch subjects" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subjects: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
