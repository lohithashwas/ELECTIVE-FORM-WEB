import { supabaseAdmin } from "@/lib/supabase-admin";

export interface SubjectDetail {
  subject_code: string;
  subject_name: string;
}

export interface RegistrationDetails {
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  created_at: string;
  results_published: boolean;
  pe2_p1: SubjectDetail | null;
  pe2_p2: SubjectDetail | null;
  pe2_p3: SubjectDetail | null;
  pe3_p1: SubjectDetail | null;
  pe3_p2: SubjectDetail | null;
  pe3_p3: SubjectDetail | null;
  pe2_allotted: SubjectDetail | null;
  pe3_allotted: SubjectDetail | null;
  pe2_subject: SubjectDetail | null; // fallback / allotted
  pe3_subject: SubjectDetail | null; // fallback / allotted
}

export async function getRegistrationByRoll(rollNumber: string): Promise<RegistrationDetails | null> {
  const normalized = rollNumber?.trim().toUpperCase();
  if (!normalized) return null;

  // 1. Fetch portal_settings to see if results are published
  let resultsPublished = false;
  try {
    const { data: settings } = await supabaseAdmin
      .from("portal_settings")
      .select("results_published")
      .eq("id", 1)
      .maybeSingle();
    if (settings?.results_published) {
      resultsPublished = true;
    }
  } catch (err) {
    console.warn("Could not fetch portal settings for results_published", err);
  }

  // 2. Query registration details with joins
  const selectQuery = `
    student_name, roll_number, phone_number, section, college_email, registered_at,
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
  `;

  let result = await supabaseAdmin
    .from("registrations")
    .select(selectQuery)
    .eq("roll_number", normalized)
    .maybeSingle();

  // Fallback: try lowercase version
  if (!result.data && normalized !== normalized.toLowerCase()) {
    result = await supabaseAdmin
      .from("registrations")
      .select(selectQuery)
      .eq("roll_number", normalized.toLowerCase())
      .maybeSingle();
  }

  const { data, error } = result;

  if (error) {
    console.error("Error fetching registration by roll number:", error);
    return null;
  }

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as Record<string, any>;

  const pickFirst = (val: unknown): SubjectDetail | null => {
    if (!val) return null;
    if (Array.isArray(val)) return val[0] ?? null;
    return val as SubjectDetail;
  };

  const pe2P1 = pickFirst(row.pe2_p1);
  const pe2P2 = pickFirst(row.pe2_p2);
  const pe2P3 = pickFirst(row.pe2_p3);
  const pe3P1 = pickFirst(row.pe3_p1);
  const pe3P2 = pickFirst(row.pe3_p2);
  const pe3P3 = pickFirst(row.pe3_p3);
  const pe2Allotted = pickFirst(row.pe2_allotted) || pickFirst(row.pe2_subject);
  const pe3Allotted = pickFirst(row.pe3_allotted) || pickFirst(row.pe3_subject);

  return {
    student_name: row.student_name,
    roll_number: row.roll_number,
    phone_number: row.phone_number,
    section: row.section,
    college_email: row.college_email,
    created_at: row.registered_at ?? row.created_at ?? new Date().toISOString(),
    results_published: resultsPublished,
    pe2_p1: pe2P1,
    pe2_p2: pe2P2,
    pe2_p3: pe2P3,
    pe3_p1: pe3P1,
    pe3_p2: pe3P2,
    pe3_p3: pe3P3,
    pe2_allotted: pe2Allotted,
    pe3_allotted: pe3Allotted,
    pe2_subject: pe2Allotted || pe2P1,
    pe3_subject: pe3Allotted || pe3P1,
  };
}
