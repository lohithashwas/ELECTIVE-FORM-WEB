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

  // Fetch all registrations with dual subject data
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

  // Build flat rows for Excel
  const rows = data.map((reg, idx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = reg as any;
    const pe2 = Array.isArray(r.pe2_subject) ? r.pe2_subject[0] : r.pe2_subject;
    const pe3 = Array.isArray(r.pe3_subject) ? r.pe3_subject[0] : r.pe3_subject;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "Phone No.": (reg as any).phone_number ?? "",
      Section: reg.section,
      "College Email": reg.college_email,
      "PE-II Code": pe2?.subject_code ?? "",
      "PE-II Subject": pe2?.subject_name ?? "",
      "PE-III Code": pe3?.subject_code ?? "",
      "PE-III Subject": pe3?.subject_name ?? "",
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
    { wch: 14 }, // PE-II Code
    { wch: 44 }, // PE-II Subject
    { wch: 14 }, // PE-III Code
    { wch: 44 }, // PE-III Subject
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
      .filter((s) => s.max_seats < 9999) // exclude Replacement from summary totals
      .map((s) => ({
        "Elective Group": s.elective_group === "PE2" ? "PE-II" : "PE-III",
        "Subject Code": s.subject_code,
        "Subject Name": s.subject_name,
        "Registered Students": s.filled_seats,
        "Total Seats": s.max_seats,
        "Available Seats": s.max_seats - s.filled_seats,
        Status: s.status === "full" ? "FULL" : "OPEN",
      }));

    // Add replacement rows
    const replacementRows = subjectData
      .filter((s) => s.max_seats >= 9999)
      .map((s) => ({
        "Elective Group": s.elective_group === "PE2" ? "PE-II" : "PE-III",
        "Subject Code": s.subject_code,
        "Subject Name": s.subject_name,
        "Registered Students": s.filled_seats,
        "Total Seats": 999,
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

  // ── Sheets 3+: Per PE-II subject breakdown ──
  if (subjectData) {
    const pe2Subjects = subjectData.filter((s) => s.elective_group === "PE2");
    for (const subject of pe2Subjects) {
      const subRows = rows.filter(
        (r) => r["PE-II Code"] === subject.subject_code
      );
      if (subRows.length === 0) continue;
      const ws = XLSX.utils.json_to_sheet(subRows);
      ws["!cols"] = [
        { wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 14 },
        { wch: 10 }, { wch: 36 }, { wch: 14 }, { wch: 44 },
        { wch: 14 }, { wch: 44 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, `PE2-${subject.subject_code}`.substring(0, 31));
    }

    // ── Sheets for PE-III subjects ──
    const pe3Subjects = subjectData.filter((s) => s.elective_group === "PE3");
    for (const subject of pe3Subjects) {
      const subRows = rows.filter(
        (r) => r["PE-III Code"] === subject.subject_code
      );
      if (subRows.length === 0) continue;
      const ws = XLSX.utils.json_to_sheet(subRows);
      ws["!cols"] = [
        { wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 14 },
        { wch: 10 }, { wch: 36 }, { wch: 14 }, { wch: 44 },
        { wch: 14 }, { wch: 44 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, `PE3-${subject.subject_code}`.substring(0, 31));
    }
  }

  // Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="VAC_Registrations_${dateStr}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
