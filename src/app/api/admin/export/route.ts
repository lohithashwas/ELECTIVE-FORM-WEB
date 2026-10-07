import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as XLSX from "xlsx";

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

  // Fetch all registrations with full priority, NPTEL, and allotment details
  const { data, error } = await supabaseAdmin
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

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to fetch registrations data." },
      { status: 500 }
    );
  }

  const pickObj = (val: unknown) => (Array.isArray(val) ? val[0] : val);

  // ── 1. SHEET 1: Master Registrations ──
  const masterRows = data.map((reg, idx) => {
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

    const registeredAt = reg.registered_at
      ? new Date(reg.registered_at).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "";

    return {
      "S.No": idx + 1,
      "Student Name": reg.student_name,
      "Registration No.": reg.roll_number,
      Section: reg.section,
      "Phone No.": r.phone_number ?? "",
      "College Email": reg.college_email,

      "PE-II Mode": pe2Nptel ? "NPTEL Course Replacement" : "Standard Choices",
      "PE-II Priority 1": pe2P1 ? `${pe2P1.subject_code} - ${pe2P1.subject_name}` : "",
      "PE-II Priority 2": pe2P2 ? `${pe2P2.subject_code} - ${pe2P2.subject_name}` : "",
      "PE-II Priority 3": pe2P3 ? `${pe2P3.subject_code} - ${pe2P3.subject_name}` : "",
      "PE-II NPTEL Course": pe2Nptel || "-",

      "PE-III Mode": pe3Nptel ? "NPTEL Course Replacement" : "Standard Choices",
      "PE-III Priority 1": pe3P1 ? `${pe3P1.subject_code} - ${pe3P1.subject_name}` : "",
      "PE-III Priority 2": pe3P2 ? `${pe3P2.subject_code} - ${pe3P2.subject_name}` : "",
      "PE-III Priority 3": pe3P3 ? `${pe3P3.subject_code} - ${pe3P3.subject_name}` : "",
      "PE-III NPTEL Course": pe3Nptel || "-",

      "Allotted PE-II": pe2Nptel
        ? `NPTEL: ${pe2Nptel}`
        : pe2Allotted
        ? `${pe2Allotted.subject_code} - ${pe2Allotted.subject_name}`
        : "Pending Allotment",

      "Allotted PE-III": pe3Nptel
        ? `NPTEL: ${pe3Nptel}`
        : pe3Allotted
        ? `${pe3Allotted.subject_code} - ${pe3Allotted.subject_name}`
        : "Pending Allotment",

      "Registration Date & Time (IST)": registeredAt,
    };
  });

  // ── 2. SHEET 2: PE-II Allotment Details ──
  const pe2Rows = data.map((reg, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reg as any;
    const pe2Allotted = pickObj(r.pe2_allotted) || pickObj(r.pe2_subject) || pickObj(r.pe2_p1);
    const pe2Nptel = (r.nptel_pe2_course || "").trim();

    return {
      "S.No": idx + 1,
      "Registration No.": reg.roll_number,
      "Student Name": reg.student_name,
      Section: reg.section,
      "Phone No.": r.phone_number ?? "",
      "College Email": reg.college_email,
      "PE-II Status / Assigned Course": pe2Nptel
        ? `NPTEL: ${pe2Nptel}`
        : pe2Allotted
        ? `${pe2Allotted.subject_code} - ${pe2Allotted.subject_name}`
        : "Not Allotted",
      "Choice Type": pe2Nptel ? "NPTEL Replacement" : "Standard Elective",
    };
  });

  // ── 3. SHEET 3: PE-III Allotment Details ──
  const pe3Rows = data.map((reg, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reg as any;
    const pe3Allotted = pickObj(r.pe3_allotted) || pickObj(r.pe3_subject) || pickObj(r.pe3_p1);
    const pe3Nptel = (r.nptel_pe3_course || "").trim();

    return {
      "S.No": idx + 1,
      "Registration No.": reg.roll_number,
      "Student Name": reg.student_name,
      Section: reg.section,
      "Phone No.": r.phone_number ?? "",
      "College Email": reg.college_email,
      "PE-III Status / Assigned Course": pe3Nptel
        ? `NPTEL: ${pe3Nptel}`
        : pe3Allotted
        ? `${pe3Allotted.subject_code} - ${pe3Allotted.subject_name}`
        : "Not Allotted",
      "Choice Type": pe3Nptel ? "NPTEL Replacement" : "Standard Elective",
    };
  });

  // ── 4. SHEET 4: Course Capacity & Summary ──
  const { data: subjectData } = await supabaseAdmin
    .from("subjects")
    .select("subject_code, subject_name, elective_group, filled_seats, max_seats, status")
    .order("elective_group")
    .order("subject_code");

  const summaryRows = (subjectData || []).map((s) => ({
    "Elective Group": s.elective_group === "PE2" ? "PE-II" : "PE-III",
    "Subject Code": s.subject_code,
    "Subject Name": s.subject_name,
    "Max Seat Capacity": s.max_seats,
    "Filled Seats": s.filled_seats,
    "Available Seats": Math.max(0, s.max_seats - s.filled_seats),
    Status: s.status === "full" ? "FULL" : "OPEN",
  }));

  // Build Workbook
  const wb = XLSX.utils.book_new();

  // Add Master Sheet
  const ws1 = XLSX.utils.json_to_sheet(masterRows);
  ws1["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 28 }, // Student Name
    { wch: 20 }, // Registration No.
    { wch: 10 }, // Section
    { wch: 14 }, // Phone No.
    { wch: 34 }, // Email
    { wch: 24 }, // PE-II Mode
    { wch: 36 }, // PE2 P1
    { wch: 36 }, // PE2 P2
    { wch: 36 }, // PE2 P3
    { wch: 32 }, // PE2 NPTEL
    { wch: 24 }, // PE-III Mode
    { wch: 36 }, // PE3 P1
    { wch: 36 }, // PE3 P2
    { wch: 36 }, // PE3 P3
    { wch: 32 }, // PE3 NPTEL
    { wch: 40 }, // Allotted PE2
    { wch: 40 }, // Allotted PE3
    { wch: 24 }, // Timestamp
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "All Registrations Master");

  // Add PE-II Sheet
  const ws2 = XLSX.utils.json_to_sheet(pe2Rows);
  ws2["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 20 }, // Reg No
    { wch: 28 }, // Name
    { wch: 10 }, // Section
    { wch: 14 }, // Phone
    { wch: 34 }, // Email
    { wch: 45 }, // Course/NPTEL
    { wch: 20 }, // Choice Type
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "PE-II Allotments");

  // Add PE-III Sheet
  const ws3 = XLSX.utils.json_to_sheet(pe3Rows);
  ws3["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 20 }, // Reg No
    { wch: 28 }, // Name
    { wch: 10 }, // Section
    { wch: 14 }, // Phone
    { wch: 34 }, // Email
    { wch: 45 }, // Course/NPTEL
    { wch: 20 }, // Choice Type
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "PE-III Allotments");

  // Add Capacity Sheet
  const ws4 = XLSX.utils.json_to_sheet(summaryRows);
  ws4["!cols"] = [
    { wch: 14 }, // Elective Group
    { wch: 14 }, // Code
    { wch: 45 }, // Name
    { wch: 18 }, // Capacity
    { wch: 14 }, // Filled
    { wch: 16 }, // Available
    { wch: 12 }, // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws4, "Seat Capacity Summary");

  // Write file buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ECE_Elective_Registrations_${dateStr}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
