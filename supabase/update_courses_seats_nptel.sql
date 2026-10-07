-- ============================================================
--  Staff Circular Update Migration
--  Changes:
--   1. Add EC22082 (Integrated Circuits Microfabrication) to PE-II
--   2. Replace EC22031 with EC22037 (Millimeter Wave Antenna Technology) in PE-III
--   3. Add EC22083 (Microelectronics) to PE-III
--   4. Update max_seats from 48 to 60 for all regular subjects
--   5. Add nptel_pe2_course and nptel_pe3_course columns to registrations
--   6. Update register_student() RPC to accept NPTEL params
--
--  Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================


-- STEP 1: ADD / UPDATE PE-II SUBJECTS

-- Add 7th PE-II subject: Integrated Circuits Microfabrication
INSERT INTO public.subjects (subject_code, subject_name, max_seats, filled_seats, status, elective_group)
VALUES ('EC22082', 'Integrated Circuits Microfabrication', 60, 0, 'open', 'PE2')
ON CONFLICT (subject_code) DO UPDATE
  SET subject_name   = EXCLUDED.subject_name,
      elective_group = EXCLUDED.elective_group,
      max_seats      = EXCLUDED.max_seats;

-- Update max_seats to 60 for all existing PE-II regular subjects
UPDATE public.subjects
SET max_seats = 60,
    status    = CASE WHEN filled_seats >= 60 THEN 'full' ELSE 'open' END
WHERE elective_group = 'PE2'
  AND subject_code  != 'PE2-REPLACE';


-- STEP 2: ADD / UPDATE PE-III SUBJECTS

-- Remove EC22031 (Antenna Theory and Design) only if no student has referenced it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE pe2_p1_id IN (SELECT id FROM public.subjects WHERE subject_code = 'EC22031')
       OR pe2_p2_id IN (SELECT id FROM public.subjects WHERE subject_code = 'EC22031')
       OR pe2_p3_id IN (SELECT id FROM public.subjects WHERE subject_code = 'EC22031')
       OR pe3_p1_id IN (SELECT id FROM public.subjects WHERE subject_code = 'EC22031')
       OR pe3_p2_id IN (SELECT id FROM public.subjects WHERE subject_code = 'EC22031')
       OR pe3_p3_id IN (SELECT id FROM public.subjects WHERE subject_code = 'EC22031')
  ) THEN
    DELETE FROM public.subjects WHERE subject_code = 'EC22031';
  END IF;
END $$;

-- Upsert EC22037 (Millimeter Wave Antenna Technology) for PE-III
INSERT INTO public.subjects (subject_code, subject_name, max_seats, filled_seats, status, elective_group)
VALUES ('EC22037', 'Millimeter Wave Antenna Technology', 60, 0, 'open', 'PE3')
ON CONFLICT (subject_code) DO UPDATE
  SET subject_name   = EXCLUDED.subject_name,
      elective_group = EXCLUDED.elective_group,
      max_seats      = EXCLUDED.max_seats;

-- Add 7th PE-III subject: Microelectronics
INSERT INTO public.subjects (subject_code, subject_name, max_seats, filled_seats, status, elective_group)
VALUES ('EC22083', 'Microelectronics', 60, 0, 'open', 'PE3')
ON CONFLICT (subject_code) DO UPDATE
  SET subject_name   = EXCLUDED.subject_name,
      elective_group = EXCLUDED.elective_group,
      max_seats      = EXCLUDED.max_seats;

-- Update max_seats to 60 for all existing PE-III regular subjects
UPDATE public.subjects
SET max_seats = 60,
    status    = CASE WHEN filled_seats >= 60 THEN 'full' ELSE 'open' END
WHERE elective_group = 'PE3'
  AND subject_code  != 'PE3-REPLACE';


-- STEP 3: ADD NPTEL COLUMNS TO REGISTRATIONS

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS nptel_pe2_course TEXT DEFAULT '';

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS nptel_pe3_course TEXT DEFAULT '';


-- STEP 4: UPDATE register_student() RPC WITH NPTEL PARAMS

CREATE OR REPLACE FUNCTION public.register_student(
  p_student_name      TEXT,
  p_roll_number       TEXT,
  p_phone_number      TEXT,
  p_section           TEXT,
  p_college_email     TEXT,
  p_pe2_p1_id         UUID,
  p_pe2_p2_id         UUID,
  p_pe2_p3_id         UUID,
  p_pe3_p1_id         UUID,
  p_pe3_p2_id         UUID,
  p_pe3_p3_id         UUID,
  p_nptel_pe2_course  TEXT DEFAULT '',
  p_nptel_pe3_course  TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_norm_roll  TEXT;
  v_norm_email TEXT;
BEGIN
  v_norm_roll  := UPPER(TRIM(p_roll_number));
  v_norm_email := LOWER(TRIM(p_college_email));

  IF EXISTS (SELECT 1 FROM public.registrations WHERE UPPER(roll_number) = v_norm_roll) THEN
    RETURN jsonb_build_object('success', false, 'code', 'duplicate_roll', 'message', 'This roll number has already registered.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.registrations WHERE LOWER(college_email) = v_norm_email) THEN
    RETURN jsonb_build_object('success', false, 'code', 'duplicate_email', 'message', 'This college email has already registered.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_pe2_p1_id AND elective_group = 'PE2') OR
     NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_pe2_p2_id AND elective_group = 'PE2') OR
     NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_pe2_p3_id AND elective_group = 'PE2') THEN
    RETURN jsonb_build_object('success', false, 'code', 'pe2_subject_not_found', 'message', 'Invalid PE-II subject choice.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_pe3_p1_id AND elective_group = 'PE3') OR
     NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_pe3_p2_id AND elective_group = 'PE3') OR
     NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_pe3_p3_id AND elective_group = 'PE3') THEN
    RETURN jsonb_build_object('success', false, 'code', 'pe3_subject_not_found', 'message', 'Invalid PE-III subject choice.');
  END IF;

  INSERT INTO public.registrations (
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
    pe2_subject_id,
    pe3_subject_id,
    nptel_pe2_course,
    nptel_pe3_course,
    registered_at
  ) VALUES (
    TRIM(p_student_name),
    v_norm_roll,
    TRIM(p_phone_number),
    TRIM(p_section),
    v_norm_email,
    p_pe2_p1_id,
    p_pe2_p2_id,
    p_pe2_p3_id,
    p_pe3_p1_id,
    p_pe3_p2_id,
    p_pe3_p3_id,
    p_pe2_p1_id,
    p_pe3_p1_id,
    TRIM(COALESCE(p_nptel_pe2_course, '')),
    TRIM(COALESCE(p_nptel_pe3_course, '')),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'code',    'registered_ok',
    'message', 'Registration options submitted successfully.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'error', 'message', SQLERRM);
END;
$$;

-- Re-grant execute permission for the new signature
GRANT EXECUTE ON FUNCTION public.register_student(
  TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID, UUID, UUID, UUID, UUID, UUID,
  TEXT, TEXT
) TO anon, authenticated;


-- STEP 5: VERIFY

-- Should show 7 for each group
SELECT elective_group, COUNT(*) AS subject_count
FROM public.subjects
WHERE subject_code NOT LIKE '%-REPLACE'
GROUP BY elective_group
ORDER BY elective_group;

-- Should show max_seats = 60 for all
SELECT subject_code, subject_name, max_seats, elective_group
FROM public.subjects
WHERE subject_code NOT LIKE '%-REPLACE'
ORDER BY elective_group, subject_code;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
