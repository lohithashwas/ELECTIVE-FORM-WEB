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

  // Fetch all registrations with priority and allotment data
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
      { error: "Failed to fetch data." },
      { status: 500 }
    );
  }

  const pickObj = (val: unknown) => (Array.isArray(val) ? val[0] : val);

  // Build flat rows for Excel
  const rows = data.map((reg, idx) => {
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
      "Phone No.": r.phone_number ?? "",
      Section: reg.section,
      "College Email": reg.college_email,

      "PE-II Priority 1": pe2P1 ? `${pe2P1.subject_code} - ${pe2P1.subject_name}` : "",
      "PE-II Priority 2": pe2P2 ? `${pe2P2.subject_code} - ${pe2P2.subject_name}` : "",
      "PE-II Priority 3": pe2P3 ? `${pe2P3.subject_code} - ${pe2P3.subject_name}` : "",

      "PE-III Priority 1": pe3P1 ? `${pe3P1.subject_code} - ${pe3P1.subject_name}` : "",
      "PE-III Priority 2": pe3P2 ? `${pe3P2.subject_code} - ${pe3P2.subject_name}` : "",
      "PE-III Priority 3": pe3P3 ? `${pe3P3.subject_code} - ${pe3P3.subject_name}` : "",

      "Allotted PE-II": pe2Allotted ? `${pe2Allotted.subject_code} - ${pe2Allotted.subject_name}` : "Pending",
      "Allotted PE-III": pe3Allotted ? `${pe3Allotted.subject_code} - ${pe3Allotted.subject_name}` : "Pending",

      "Registered At (IST)": registeredAt,
    };
  });

  // Build workbook
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: All Registrations ──
  const ws1 = XLSX.utils.json_to_sheet(rows);
  ws1["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 28 }, // Student Name
    { wch: 20 }, // Registration No.
    { wch: 14 }, // Phone No.
    { wch: 10 }, // Section
    { wch: 36 }, // College Email

    { wch: 35 }, // PE2 P1
    { wch: 35 }, // PE2 P2
    { wch: 35 }, // PE2 P3

    { wch: 35 }, // PE3 P1
    { wch: 35 }, // PE3 P2
    { wch: 35 }, // PE3 P3

    { wch: 40 }, // Allotted PE2
    { wch: 40 }, // Allotted PE3

    { wch: 22 }, // Registered At
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "All Registrations");

  // ── Sheet 2: Subject Summary ──
  const { data: subjectData } = await supabaseAdmin
    .from("subjects")
    .select("subject_code, subject_name, elective_group, filled_seats, max_seats, status")
    .order("elective_group")
    .order("subject_code");

  if (subjectData) {
    const summaryRows = subjectData
      .filter((s) => s.max_seats < 9999)
      .map((s) => ({
        "Elective Group": s.elective_group === "PE2" ? "PE-II" : "PE-III",
        "Subject Code": s.subject_code,
        "Subject Name": s.subject_name,
        "Allotted Students": s.filled_seats,
        "Total Capacity": s.max_seats,
        "Available Seats": s.max_seats - s.filled_seats,
        Status: s.status === "full" ? "FULL" : "OPEN",
      }));

    const replacementRows = subjectData
      .filter((s) => s.max_seats >= 9999)
      .map((s) => ({
        "Elective Group": s.elective_group === "PE2" ? "PE-II" : "PE-III",
        "Subject Code": s.subject_code,
        "Subject Name": s.subject_name,
        "Allotted Students": s.filled_seats,
        "Total Capacity": 999,
        "Available Seats": 999,
        Status: "OPEN (Replacement)",
      }));

    const ws2 = XLSX.utils.json_to_sheet([...summaryRows, ...replacementRows]);
    ws2["!cols"] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 52 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Subject Summary");
  }

  // Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="VAC_Registrations_Priorities_${dateStr}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
