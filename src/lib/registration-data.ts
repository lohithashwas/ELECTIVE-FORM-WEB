import { supabaseAdmin } from "@/lib/supabase-admin";

export interface RegistrationDetails {
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  created_at: string;
  pe2_subject: {
    subject_code: string;
    subject_name: string;
  } | null;
  pe3_subject: {
    subject_code: string;
    subject_name: string;
  } | null;
}

export async function getRegistrationByRoll(rollNumber: string): Promise<RegistrationDetails | null> {
  const normalized = rollNumber?.trim().toUpperCase();
  if (!normalized) return null;

  // Query with two separate joins using aliased foreign key hints
  let result = await supabaseAdmin
    .from("registrations")
    .select(
      `student_name, roll_number, phone_number, section, college_email, registered_at,
       pe2_subject:pe2_subject_id ( subject_code, subject_name ),
       pe3_subject:pe3_subject_id ( subject_code, subject_name )`
    )
    .eq("roll_number", normalized)
    .maybeSingle();

  // Fallback: try lowercase version (legacy data)
  if (!result.data && normalized !== normalized.toLowerCase()) {
    result = await supabaseAdmin
      .from("registrations")
      .select(
        `student_name, roll_number, phone_number, section, college_email, registered_at,
         pe2_subject:pe2_subject_id ( subject_code, subject_name ),
         pe3_subject:pe3_subject_id ( subject_code, subject_name )`
      )
      .eq("roll_number", normalized.toLowerCase())
      .maybeSingle();
  }

  const { data, error } = result;

  if (error) {
    console.error("Error fetching registration by roll number:", error);
    return null;
  }

  if (!data) return null;

  const row = data as Record<string, any>;

  const pickFirst = (val: unknown) =>
    Array.isArray(val) ? (val[0] ?? null) : (val ?? null);

  return {
    student_name: row.student_name,
    roll_number: row.roll_number,
    phone_number: row.phone_number,
    section: row.section,
    college_email: row.college_email,
    created_at: row.registered_at ?? row.created_at ?? new Date().toISOString(),
    pe2_subject: pickFirst(row.pe2_subject),
    pe3_subject: pickFirst(row.pe3_subject),
  } as RegistrationDetails;
}
