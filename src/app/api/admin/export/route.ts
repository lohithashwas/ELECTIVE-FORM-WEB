import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkAdminAuth } from "@/lib/admin-auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch all registrations sorted by submission timestamp ASC (FCFS order)
  const { data: regData, error: regError } = await supabaseAdmin
    .from("registrations")
    .select(
      `
      student_name,
      roll_number,
      phone_number,
      section,
      college_email,
      registered_at,
      is_allotted,
      nptel_pe2_course,
      nptel_pe3_course,
      pe2_p1_id, pe2_p2_id, pe2_p3_id,
      pe3_p1_id, pe3_p2_id, pe3_p3_id,
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
    .order("registered_at", { ascending: true });

  if (regError || !regData) {
    return NextResponse.json(
      { error: "Failed to fetch registrations data for export." },
      { status: 500 }
    );
  }

  // 2. Fetch subject capacity and stats
  const { data: subjectData } = await supabaseAdmin
    .from("subjects")
    .select("id, subject_code, subject_name, elective_group, filled_seats, max_seats, status")
    .order("elective_group")
    .order("subject_code");

  const pickObj = (val: unknown) => (Array.isArray(val) ? val[0] : val);

  // Calculate priority counts per subject
  const priorityMap = new Map<string, { p1: number; p2: number; p3: number; allotted: number }>();
  (subjectData || []).forEach((s) => {
    priorityMap.set(s.id, { p1: 0, p2: 0, p3: 0, allotted: 0 });
  });

  regData.forEach((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reg = r as any;
    if (reg.pe2_p1_id && priorityMap.has(reg.pe2_p1_id)) priorityMap.get(reg.pe2_p1_id)!.p1++;
    if (reg.pe2_p2_id && priorityMap.has(reg.pe2_p2_id)) priorityMap.get(reg.pe2_p2_id)!.p2++;
    if (reg.pe2_p3_id && priorityMap.has(reg.pe2_p3_id)) priorityMap.get(reg.pe2_p3_id)!.p3++;

    if (reg.pe3_p1_id && priorityMap.has(reg.pe3_p1_id)) priorityMap.get(reg.pe3_p1_id)!.p1++;
    if (reg.pe3_p2_id && priorityMap.has(reg.pe3_p2_id)) priorityMap.get(reg.pe3_p2_id)!.p2++;
    if (reg.pe3_p3_id && priorityMap.has(reg.pe3_p3_id)) priorityMap.get(reg.pe3_p3_id)!.p3++;

    const pe2AllottedId = reg.pe2_allotted_id;
    if (pe2AllottedId && priorityMap.has(pe2AllottedId)) priorityMap.get(pe2AllottedId)!.allotted++;
    const pe3AllottedId = reg.pe3_allotted_id;
    if (pe3AllottedId && priorityMap.has(pe3AllottedId)) priorityMap.get(pe3AllottedId)!.allotted++;
  });

  // ── 1. SHEET 1: Master Registrations with Timestamps ──
  const masterRows = regData.map((reg, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reg as any;
    const pe2P1 = pickObj(r.pe2_p1);
    const pe2P2 = pickObj(r.pe2_p2);
    const pe2P3 = pickObj(r.pe2_p3);

    const pe3P1 = pickObj(r.pe3_p1);
    const pe3P2 = pickObj(r.pe3_p2);
    const pe3P3 = pickObj(r.pe3_p3);

    const pe2Allotted = pickObj(r.pe2_allotted) || pickObj(r.pe2_subject);
    const pe3Allotted = pickObj(r.pe3_allotted) || pickObj(r.pe3_subject);

    const pe2Nptel = (r.nptel_pe2_course || "").trim();
    const pe3Nptel = (r.nptel_pe3_course || "").trim();

    const registeredAtFormatted = reg.registered_at
      ? new Date(reg.registered_at).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      : "—";

    return {
      "S.No": idx + 1,
      "Student Name": reg.student_name,
      "Registration No.": reg.roll_number,
      Section: reg.section,
      "Phone No.": r.phone_number ?? "",
      "College Email": reg.college_email,

      "PE-II Mode": pe2Nptel ? "NPTEL Course Replacement" : "Standard Elective Choices",
      "PE-II Priority 1": pe2P1 ? `${pe2P1.subject_code} - ${pe2P1.subject_name}` : "—",
      "PE-II Priority 2": pe2P2 ? `${pe2P2.subject_code} - ${pe2P2.subject_name}` : "—",
      "PE-II Priority 3": pe2P3 ? `${pe2P3.subject_code} - ${pe2P3.subject_name}` : "—",
      "PE-II NPTEL Course": pe2Nptel || "N/A",

      "PE-III Mode": pe3Nptel ? "NPTEL Course Replacement" : "Standard Elective Choices",
      "PE-III Priority 1": pe3P1 ? `${pe3P1.subject_code} - ${pe3P1.subject_name}` : "—",
      "PE-III Priority 2": pe3P2 ? `${pe3P2.subject_code} - ${pe3P2.subject_name}` : "—",
      "PE-III Priority 3": pe3P3 ? `${pe3P3.subject_code} - ${pe3P3.subject_name}` : "—",
      "PE-III NPTEL Course": pe3Nptel || "N/A",

      "Allotted PE-II Subject": pe2Nptel
        ? `NPTEL: ${pe2Nptel}`
        : pe2Allotted
        ? `${pe2Allotted.subject_code} - ${pe2Allotted.subject_name}`
        : "Pending Allotment",

      "Allotted PE-III Subject": pe3Nptel
        ? `NPTEL: ${pe3Nptel}`
        : pe3Allotted
        ? `${pe3Allotted.subject_code} - ${pe3Allotted.subject_name}`
        : "Pending Allotment",

      "Submission Log Timestamp (IST)": registeredAtFormatted,
    };
  });

  // ── 2. SHEET 2: Subject Priority Analytics & Seat Capacity Summary ──
  const summaryRows = (subjectData || []).map((s) => {
    const stats = priorityMap.get(s.id) || { p1: 0, p2: 0, p3: 0, allotted: 0 };
    return {
      "Elective Group": s.elective_group === "PE2" ? "PE-II" : "PE-III",
      "Subject Code": s.subject_code,
      "Subject Name": s.subject_name,
      "Max Capacity": s.max_seats,
      "Filled / Allotted Seats": s.filled_seats || stats.allotted,
      "Available Seats": Math.max(0, s.max_seats - (s.filled_seats || stats.allotted)),
      "Priority 1 (P1) Demands": stats.p1,
      "Priority 2 (P2) Demands": stats.p2,
      "Priority 3 (P3) Demands": stats.p3,
      "Total Interested Students": stats.p1 + stats.p2 + stats.p3,
      Status: s.status === "full" ? "FULL" : "OPEN",
    };
  });

  // ── 3. SHEET 3: PE-II Allotment Details ──
  const pe2Rows = regData.map((reg, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reg as any;
    const pe2P1 = pickObj(r.pe2_p1);
    const pe2P2 = pickObj(r.pe2_p2);
    const pe2P3 = pickObj(r.pe2_p3);
    const pe2Allotted = pickObj(r.pe2_allotted) || pickObj(r.pe2_subject) || pe2P1;
    const pe2Nptel = (r.nptel_pe2_course || "").trim();

    return {
      "S.No": idx + 1,
      "Registration No.": reg.roll_number,
      "Student Name": reg.student_name,
      Section: reg.section,
      "Phone No.": r.phone_number ?? "",
      "College Email": reg.college_email,
      "Choice Mode": pe2Nptel ? "NPTEL Course" : "Standard Choices",
      "Priority 1": pe2P1 ? `${pe2P1.subject_code}` : "—",
      "Priority 2": pe2P2 ? `${pe2P2.subject_code}` : "—",
      "Priority 3": pe2P3 ? `${pe2P3.subject_code}` : "—",
      "Assigned PE-II Subject": pe2Nptel
        ? `NPTEL: ${pe2Nptel}`
        : pe2Allotted
        ? `${pe2Allotted.subject_code} - ${pe2Allotted.subject_name}`
        : "Not Allotted",
      "Submitted At (IST)": reg.registered_at
        ? new Date(reg.registered_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : "—",
    };
  });

  // ── 4. SHEET 4: PE-III Allotment Details ──
  const pe3Rows = regData.map((reg, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reg as any;
    const pe3P1 = pickObj(r.pe3_p1);
    const pe3P2 = pickObj(r.pe3_p2);
    const pe3P3 = pickObj(r.pe3_p3);
    const pe3Allotted = pickObj(r.pe3_allotted) || pickObj(r.pe3_subject) || pe3P1;
    const pe3Nptel = (r.nptel_pe3_course || "").trim();

    return {
      "S.No": idx + 1,
      "Registration No.": reg.roll_number,
      "Student Name": reg.student_name,
      Section: reg.section,
      "Phone No.": r.phone_number ?? "",
      "College Email": reg.college_email,
      "Choice Mode": pe3Nptel ? "NPTEL Course" : "Standard Choices",
      "Priority 1": pe3P1 ? `${pe3P1.subject_code}` : "—",
      "Priority 2": pe3P2 ? `${pe3P2.subject_code}` : "—",
      "Priority 3": pe3P3 ? `${pe3P3.subject_code}` : "—",
      "Assigned PE-III Subject": pe3Nptel
        ? `NPTEL: ${pe3Nptel}`
        : pe3Allotted
        ? `${pe3Allotted.subject_code} - ${pe3Allotted.subject_name}`
        : "Not Allotted",
      "Submitted At (IST)": reg.registered_at
        ? new Date(reg.registered_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : "—",
    };
  });

  // Build Workbook
  const wb = XLSX.utils.book_new();

  // 1. Add Master Sheet
  const ws1 = XLSX.utils.json_to_sheet(masterRows);
  ws1["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 28 }, // Student Name
    { wch: 20 }, // Registration No.
    { wch: 10 }, // Section
    { wch: 15 }, // Phone No.
    { wch: 34 }, // Email
    { wch: 26 }, // PE-II Mode
    { wch: 38 }, // PE2 P1
    { wch: 38 }, // PE2 P2
    { wch: 38 }, // PE2 P3
    { wch: 32 }, // PE2 NPTEL
    { wch: 26 }, // PE-III Mode
    { wch: 38 }, // PE3 P1
    { wch: 38 }, // PE3 P2
    { wch: 38 }, // PE3 P3
    { wch: 32 }, // PE3 NPTEL
    { wch: 42 }, // Allotted PE2
    { wch: 42 }, // Allotted PE3
    { wch: 30 }, // Log Timestamp (IST)
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Master Registrations");

  // 2. Add Priority Analytics Sheet
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2["!cols"] = [
    { wch: 15 }, // Elective Group
    { wch: 15 }, // Code
    { wch: 45 }, // Name
    { wch: 15 }, // Max Seats
    { wch: 22 }, // Filled
    { wch: 16 }, // Available
    { wch: 22 }, // P1
    { wch: 22 }, // P2
    { wch: 22 }, // P3
    { wch: 24 }, // Total Demands
    { wch: 12 }, // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Subject Priorities Summary");

  // 3. Add PE-II Sheet
  const ws3 = XLSX.utils.json_to_sheet(pe2Rows);
  ws3["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 20 }, // Reg No
    { wch: 28 }, // Name
    { wch: 10 }, // Section
    { wch: 15 }, // Phone
    { wch: 34 }, // Email
    { wch: 20 }, // Choice Mode
    { wch: 14 }, // P1
    { wch: 14 }, // P2
    { wch: 14 }, // P3
    { wch: 45 }, // Assigned Course
    { wch: 25 }, // Submitted At
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "PE-II Allotments");

  // 4. Add PE-III Sheet
  const ws4 = XLSX.utils.json_to_sheet(pe3Rows);
  ws4["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 20 }, // Reg No
    { wch: 28 }, // Name
    { wch: 10 }, // Section
    { wch: 15 }, // Phone
    { wch: 34 }, // Email
    { wch: 20 }, // Choice Mode
    { wch: 14 }, // P1
    { wch: 14 }, // P2
    { wch: 14 }, // P3
    { wch: 45 }, // Assigned Course
    { wch: 25 }, // Submitted At
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "PE-III Allotments");

  // Write Excel file buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ECE_Elective_Master_Registrations_${dateStr}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
