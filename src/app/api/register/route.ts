import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { registrationSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 2. Validate with Zod
    const parseResult = registrationSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0];
      console.error("Validation failed:", fieldErrors);
      return NextResponse.json(
        {
          error: firstError || "Please fill all required fields correctly.",
          fieldErrors,
        },
        { status: 422 }
      );
    }

    const {
      student_name,
      roll_number,
      phone_number,
      section,
      college_email,
      pe2_p1_id,
      pe2_p2_id,
      pe2_p3_id,
      pe3_p1_id,
      pe3_p2_id,
      pe3_p3_id,
      nptel_pe2_course,
      nptel_pe3_course,
    } = parseResult.data;

    // 3. Convert empty string UUIDs to null (critical: empty string "" fails UUID type in Postgres)
    const toUUID = (v: string | null | undefined): string | null => {
      if (!v || v.trim() === "") return null;
      return v.trim();
    };

    const pe2P1 = toUUID(pe2_p1_id);
    const pe2P2 = toUUID(pe2_p2_id);
    const pe2P3 = toUUID(pe2_p3_id);
    const pe3P1 = toUUID(pe3_p1_id);
    const pe3P2 = toUUID(pe3_p2_id);
    const pe3P3 = toUUID(pe3_p3_id);
    const nptelPe2 = nptel_pe2_course?.trim() ?? "";
    const nptelPe3 = nptel_pe3_course?.trim() ?? "";

    // 4. Server-side sanity: must have either NPTEL or 3 priority choices per elective
    if (!nptelPe2 && (!pe2P1 || !pe2P2 || !pe2P3)) {
      return NextResponse.json(
        { error: "Please provide all 3 priority choices for PE-II, or enter an NPTEL course name." },
        { status: 422 }
      );
    }
    if (!nptelPe3 && (!pe3P1 || !pe3P2 || !pe3P3)) {
      return NextResponse.json(
        { error: "Please provide all 3 priority choices for PE-III, or enter an NPTEL course name." },
        { status: 422 }
      );
    }

    // 5. Log what we're about to save for debugging
    console.log("Registering student:", {
      roll_number,
      student_name,
      nptelPe2: nptelPe2 || "(none)",
      nptelPe3: nptelPe3 || "(none)",
      pe2P1, pe2P2, pe2P3,
      pe3P1, pe3P2, pe3P3,
    });

    // 6. Call PostgreSQL stored procedure for atomic registration
    const { data, error } = await supabaseAdmin.rpc("register_student", {
      p_student_name:     student_name,
      p_roll_number:      roll_number,
      p_phone_number:     phone_number,
      p_section:          section,
      p_college_email:    college_email,
      p_pe2_p1_id:        pe2P1,
      p_pe2_p2_id:        pe2P2,
      p_pe2_p3_id:        pe2P3,
      p_pe3_p1_id:        pe3P1,
      p_pe3_p2_id:        pe3P2,
      p_pe3_p3_id:        pe3P3,
      p_nptel_pe2_course: nptelPe2,
      p_nptel_pe3_course: nptelPe3,
    });

    if (error) {
      const msg = error.message ?? "";
      console.error("Registration RPC error:", error);

      if (msg.includes("duplicate_roll") || error.code === "23505" && msg.includes("roll_number")) {
        return NextResponse.json(
          { error: "This roll number has already registered." },
          { status: 409 }
        );
      }
      if (msg.includes("duplicate_email") || error.code === "23505" && msg.includes("college_email")) {
        return NextResponse.json(
          { error: "This college email has already registered." },
          { status: 409 }
        );
      }
      if (msg.includes("pe2_subject_full")) {
        return NextResponse.json(
          { error: "Selected PE-II subject is already full. Please choose another." },
          { status: 409 }
        );
      }
      if (msg.includes("pe3_subject_full")) {
        return NextResponse.json(
          { error: "Selected PE-III subject is already full. Please choose another." },
          { status: 409 }
        );
      }
      if (msg.includes("subject_not_found") || msg.includes("pe2_subject_not_found") || msg.includes("pe3_subject_not_found")) {
        return NextResponse.json(
          { error: "Selected subject does not exist. Please refresh the page and try again." },
          { status: 404 }
        );
      }
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This student has already registered." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Registration failed: ${msg || "Unknown server error. Please try again."}` },
        { status: 500 }
      );
    }

    // 7. Interpret stored procedure result
    const result = data as {
      success: boolean;
      code: string;
      message: string;
    } | null;

    if (!result) {
      console.error("Registration RPC returned null/undefined result");
      return NextResponse.json(
        { error: "Registration failed: No response from database. Please try again." },
        { status: 500 }
      );
    }

    if (!result.success) {
      const code = result.code ?? "unknown";
      const msg = result.message ?? "";
      console.error("Registration RPC returned failure:", result);

      if (code === "duplicate_roll") {
        return NextResponse.json(
          { error: "This roll number has already registered." },
          { status: 409 }
        );
      }
      if (code === "duplicate_email") {
        return NextResponse.json(
          { error: "This college email has already registered." },
          { status: 409 }
        );
      }
      if (code === "pe2_subject_full") {
        return NextResponse.json(
          { error: "Selected PE-II subject is already full. Please choose another." },
          { status: 409 }
        );
      }
      if (code === "pe3_subject_full") {
        return NextResponse.json(
          { error: "Selected PE-III subject is already full. Please choose another." },
          { status: 409 }
        );
      }
      if (code === "pe2_subject_not_found" || code === "pe3_subject_not_found") {
        return NextResponse.json(
          { error: "Selected subject not found. Please refresh and try again." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: msg || "Registration failed. Please try again." },
        { status: 409 }
      );
    }

    console.log("Registration SUCCESS for:", roll_number);
    return NextResponse.json(
      { message: "Registration Successful." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Unexpected registration error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
