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
  nptel_pe2_course?: string | null;
  nptel_pe3_course?: string | null;
}

const selectQuery = `
  student_name, roll_number, phone_number, section, college_email, registered_at,
  nptel_pe2_course, nptel_pe3_course,
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

function pickFirst(val: unknown): SubjectDetail | null {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val as SubjectDetail;
}

function buildResult(row: Record<string, unknown>, resultsPublished: boolean): RegistrationDetails {
  const pe2P1 = pickFirst(row.pe2_p1);
  const pe2P2 = pickFirst(row.pe2_p2);
  const pe2P3 = pickFirst(row.pe2_p3);
  const pe3P1 = pickFirst(row.pe3_p1);
  const pe3P2 = pickFirst(row.pe3_p2);
  const pe3P3 = pickFirst(row.pe3_p3);
  const pe2Allotted = pickFirst(row.pe2_allotted) || pickFirst(row.pe2_subject);
  const pe3Allotted = pickFirst(row.pe3_allotted) || pickFirst(row.pe3_subject);

  return {
    student_name: row.student_name as string,
    roll_number: row.roll_number as string,
    phone_number: row.phone_number as string,
    section: row.section as string,
    college_email: row.college_email as string,
    created_at: (row.registered_at ?? row.created_at ?? new Date().toISOString()) as string,
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
    nptel_pe2_course: (row.nptel_pe2_course as string) || null,
    nptel_pe3_course: (row.nptel_pe3_course as string) || null,
  };
}

export async function getRegistrationByRoll(rollNumber: string): Promise<RegistrationDetails | null> {
  const raw = rollNumber?.trim() || "";
  if (!raw) return null;

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

  // 2. Build all candidate roll number formats to try
  // The stored roll number is always the FULL number e.g. "2127240701001"
  const digitsOnly = raw.replace(/\D/g, "");
  const last3 = digitsOnly.length >= 3 ? digitsOnly.slice(-3) : digitsOnly.padStart(3, "0");
  const fullReg = `2127240701${last3}`;
  const normalized = raw.toUpperCase();

  // 3. Try exact full roll number first (most reliable, avoids OR ambiguity)
  const candidates = [fullReg, normalized];
  if (normalized !== fullReg) candidates.push(normalized);
  if (last3 !== fullReg && last3 !== normalized) candidates.push(last3);

  // Deduplicate
  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select(selectQuery)
      .eq("roll_number", candidate)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching registration for roll ${candidate}:`, error);
      continue;
    }

    if (data) {
      return buildResult(data as Record<string, unknown>, resultsPublished);
    }
  }

  return null;
}
