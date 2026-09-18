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
    } = parseResult.data;

    // 3. Use PostgreSQL stored procedure for atomic dual registration with priorities
    const { data, error } = await supabaseAdmin.rpc("register_student", {
      p_student_name:  student_name,
      p_roll_number:   roll_number,
      p_phone_number:  phone_number,
      p_section:       section,
      p_college_email: college_email,
      p_pe2_p1_id:     pe2_p1_id,
      p_pe2_p2_id:     pe2_p2_id,
      p_pe2_p3_id:     pe2_p3_id,
      p_pe3_p1_id:     pe3_p1_id,
      p_pe3_p2_id:     pe3_p2_id,
      p_pe3_p3_id:     pe3_p3_id,
    });

    if (error) {
      const msg = error.message ?? "";

      if (msg.includes("duplicate_roll")) {
        return NextResponse.json(
          { error: "This roll number has already registered." },
          { status: 409 }
        );
      }
      if (msg.includes("duplicate_email")) {
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
          { error: "Selected subject does not exist." },
          { status: 404 }
        );
      }
      // Postgres unique constraint violations
      if (
        error.code === "23505" ||
        msg.includes("registrations_roll_number_key")
      ) {
        return NextResponse.json(
          { error: "This roll number has already registered." },
          { status: 409 }
        );
      }
      if (msg.includes("registrations_college_email_key")) {
        return NextResponse.json(
          { error: "This college email has already registered." },
          { status: 409 }
        );
      }

      console.error("Registration DB error:", error);
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    // 4. Interpret function result
    const result = data as {
      success: boolean;
      code: string;
      message: string;
    } | null;

    if (!result || !result.success) {
      const code = result?.code ?? "unknown";
      const msg = result?.message ?? "";

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

      return NextResponse.json(
        { error: msg || "Registration failed. Please try again." },
        { status: 409 }
      );
    }

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
