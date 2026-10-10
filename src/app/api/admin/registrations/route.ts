import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch portal settings for results_published status
  const { data: settings } = await supabaseAdmin
    .from("portal_settings")
    .select("results_published")
    .eq("id", 1)
    .maybeSingle();

  // 2. Fetch all subjects
  const { data: subjectsData } = await supabaseAdmin
    .from("subjects")
    .select("id, subject_code, subject_name, max_seats, filled_seats, status, elective_group")
    .order("elective_group")
    .order("subject_code");

  // 3. Fetch registrations
  const { data: registrationsData, error } = await supabaseAdmin
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
      nptel_pe2_course,
      nptel_pe3_course,
      pe2_p1_id,
      pe2_p2_id,
      pe2_p3_id,
      pe3_p1_id,
      pe3_p2_id,
      pe3_p3_id,
      pe2_allotted_id,
      pe3_allotted_id,
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

  // 4. Calculate Subject-Wise Priority Metrics
  const subjectStatsMap = new Map<
    string,
    {
      id: string;
      subject_code: string;
      subject_name: string;
      elective_group: string;
      max_seats: number;
      filled_seats: number;
      status: string;
      p1_count: number;
      p2_count: number;
      p3_count: number;
      allotted_count: number;
    }
  >();

  (subjectsData || []).forEach((s) => {
    subjectStatsMap.set(s.id, {
      id: s.id,
      subject_code: s.subject_code,
      subject_name: s.subject_name,
      elective_group: s.elective_group,
      max_seats: s.max_seats,
      filled_seats: s.filled_seats,
      status: s.status,
      p1_count: 0,
      p2_count: 0,
      p3_count: 0,
      allotted_count: 0,
    });
  });

  (registrationsData || []).forEach((reg) => {
    // PE2 Priorities
    if (reg.pe2_p1_id && subjectStatsMap.has(reg.pe2_p1_id)) {
      subjectStatsMap.get(reg.pe2_p1_id)!.p1_count++;
    }
    if (reg.pe2_p2_id && subjectStatsMap.has(reg.pe2_p2_id)) {
      subjectStatsMap.get(reg.pe2_p2_id)!.p2_count++;
    }
    if (reg.pe2_p3_id && subjectStatsMap.has(reg.pe2_p3_id)) {
      subjectStatsMap.get(reg.pe2_p3_id)!.p3_count++;
    }

    // PE3 Priorities
    if (reg.pe3_p1_id && subjectStatsMap.has(reg.pe3_p1_id)) {
      subjectStatsMap.get(reg.pe3_p1_id)!.p1_count++;
    }
    if (reg.pe3_p2_id && subjectStatsMap.has(reg.pe3_p2_id)) {
      subjectStatsMap.get(reg.pe3_p2_id)!.p2_count++;
    }
    if (reg.pe3_p3_id && subjectStatsMap.has(reg.pe3_p3_id)) {
      subjectStatsMap.get(reg.pe3_p3_id)!.p3_count++;
    }

    // Allotted counts
    const pe2Allotted = reg.pe2_allotted_id;
    if (pe2Allotted && subjectStatsMap.has(pe2Allotted)) {
      subjectStatsMap.get(pe2Allotted)!.allotted_count++;
    }
    const pe3Allotted = reg.pe3_allotted_id;
    if (pe3Allotted && subjectStatsMap.has(pe3Allotted)) {
      subjectStatsMap.get(pe3Allotted)!.allotted_count++;
    }
  });

  return NextResponse.json({
    results_published: settings?.results_published ?? false,
    registrations: registrationsData || [],
    subject_stats: Array.from(subjectStatsMap.values()),
  });
}
