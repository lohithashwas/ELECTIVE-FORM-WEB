-- ============================================================
--  Complete Dual Elective Setup & Migration Script
--  Works on BOTH fresh Supabase projects & existing databases.
--
--  Includes:
--  1. Table Creation (subjects, registrations, students, portal_settings)
--  2. Dual Elective schema setup (PE-II and PE-III) + Replacement options
--  3. Student Seed Data (193 students from ECE nominal roll)
--  4. Portal Settings Seed Data
--  5. Atomic Dual Elective Registration RPC (register_student)
--  6. Login / Logout / Session Verification RPCs
--  7. Row Level Security (RLS) & Permissions
--
--  Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================

-- ─── STEP 1: CREATE OR UPDATE SUBJECTS TABLE ─────────────────

CREATE TABLE IF NOT EXISTS public.subjects (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code  TEXT          NOT NULL UNIQUE,
  subject_name  TEXT          NOT NULL,
  max_seats     INTEGER       NOT NULL DEFAULT 48 CHECK (max_seats > 0),
  filled_seats  INTEGER       NOT NULL DEFAULT 0 CHECK (filled_seats >= 0),
  status        TEXT          NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT filled_not_exceed_max CHECK (filled_seats <= max_seats)
);

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS elective_group TEXT
  CHECK (elective_group IN ('PE2', 'PE3'));

CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects(status);
CREATE INDEX IF NOT EXISTS idx_subjects_group  ON public.subjects(elective_group);

-- ─── STEP 2: CREATE OR UPDATE REGISTRATIONS TABLE ────────────

CREATE TABLE IF NOT EXISTS public.registrations (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name   TEXT          NOT NULL,
  roll_number    TEXT          NOT NULL UNIQUE,
  phone_number   TEXT          NOT NULL,
  section        TEXT          NOT NULL,
  college_email  TEXT          NOT NULL UNIQUE,
  registered_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Drop old single-subject column if migrating from previous schema
ALTER TABLE public.registrations DROP COLUMN IF EXISTS subject_id;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS pe2_subject_id UUID
  REFERENCES public.subjects(id) ON DELETE RESTRICT;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS pe3_subject_id UUID
  REFERENCES public.subjects(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_registrations_roll  ON public.registrations(roll_number);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(college_email);
CREATE INDEX IF NOT EXISTS idx_registrations_pe2   ON public.registrations(pe2_subject_id);
CREATE INDEX IF NOT EXISTS idx_registrations_pe3   ON public.registrations(pe3_subject_id);

-- ─── STEP 3: CREATE STUDENTS & PORTAL_SETTINGS TABLES ───────

CREATE TABLE IF NOT EXISTS public.students (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number            TEXT        NOT NULL UNIQUE,
  student_name          TEXT,
  active_session_token  TEXT,
  session_started_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_reg   ON public.students(reg_number);
CREATE INDEX IF NOT EXISTS idx_students_token ON public.students(active_session_token);

CREATE TABLE IF NOT EXISTS public.portal_settings (
  id               INTEGER     PRIMARY KEY DEFAULT 1,
  portal_open_time TIMESTAMPTZ NOT NULL,
  portal_enabled   BOOLEAN     NOT NULL DEFAULT true,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Default portal to be OPEN immediately
INSERT INTO public.portal_settings (id, portal_open_time, portal_enabled)
VALUES (1, NOW() - INTERVAL '1 hour', true)
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 4: SEED PE-II & PE-III SUBJECTS ────────────────────

-- Seed PE-II Subjects (6 Regular + 1 Replacement)
INSERT INTO public.subjects (subject_code, subject_name, max_seats, filled_seats, status, elective_group)
VALUES
  ('EC22022', 'Emerging Wireless Technologies',       48,   0, 'open', 'PE2'),
  ('EC22034', 'EMI/EMC Pre Compliance Testing',       48,   0, 'open', 'PE2'),
  ('EC22042', 'ASIC and FPGA Design',                 48,   0, 'open', 'PE2'),
  ('EC22054', 'Biometric Systems',                    48,   0, 'open', 'PE2'),
  ('EC22061', 'Industry 4.0 and IIoT',                48,   0, 'open', 'PE2'),
  ('EC22077', 'Wireless Networks',                    48,   0, 'open', 'PE2'),
  ('PE2-REPLACE', 'Replacement (NPTEL / IIT / SE / GIP / Other)', 9999, 0, 'open', 'PE2')
ON CONFLICT (subject_code) DO UPDATE
  SET elective_group = EXCLUDED.elective_group,
      subject_name   = EXCLUDED.subject_name;

-- Seed PE-III Subjects (6 Regular + 1 Replacement)
INSERT INTO public.subjects (subject_code, subject_name, max_seats, filled_seats, status, elective_group)
VALUES
  ('EC22031', 'Antenna Theory and Design',            48,   0, 'open', 'PE3'),
  ('EC22047', 'Testing of VLSI Circuits',             48,   0, 'open', 'PE3'),
  ('EC22056', 'Deep Learning for Computer Vision',    48,   0, 'open', 'PE3'),
  ('EC22063', 'IoT for Real Time Applications',       48,   0, 'open', 'PE3'),
  ('EC22072', 'Cryptography and Network Security',    48,   0, 'open', 'PE3'),
  ('EC22024', 'Intelligent Communication Networks',   48,   0, 'open', 'PE3'),
  ('PE3-REPLACE', 'Replacement (NPTEL / IIT / SE / GIP / Other)', 9999, 0, 'open', 'PE3')
ON CONFLICT (subject_code) DO UPDATE
  SET elective_group = EXCLUDED.elective_group,
      subject_name   = EXCLUDED.subject_name;

-- ─── STEP 5: SEED 193 STUDENTS ───────────────────────────────

INSERT INTO public.students (reg_number, student_name) VALUES
  ('2127240701001', 'A AADHITHYA NARAYANAN'),
  ('2127240701002', 'ABHIMANYU SINGH BHATI'),
  ('2127240701003', 'ABIJESH JP'),
  ('2127240701004', 'ABRAR'),
  ('2127240701005', 'ADITYA K'),
  ('2127240701006', 'AGILAPRIYAN D'),
  ('2127240701007', 'AKASH RAM CHITTIBABU SULEKHA'),
  ('2127240701008', 'AKSHAYAKIRUTHIGA S T'),
  ('2127240701009', 'AKSHAYATH   VIJAYAKUMAR'),
  ('2127240701010', 'AMIRTHAVARSHINI R M'),
  ('2127240701011', 'ARUN K S'),
  ('2127240701012', 'ARUNAGEETHAYAN A'),
  ('2127240701013', 'ARUNSANKAR S'),
  ('2127240701014', 'ASHWIN   V'),
  ('2127240701015', 'ASHWINKUMAR T'),
  ('2127240701016', 'ASHWINTH R'),
  ('2127240701017', 'ASMITHA S'),
  ('2127240701018', 'ATHMAJA G'),
  ('2127240701019', 'B S AARTI'),
  ('2127240701020', 'B S SHRENIK'),
  ('2127240701021', 'B THIRUMAGANSRIRAM'),
  ('2127240701022', 'BALAMURUGAN L'),
  ('2127240701023', 'BALAMURUGAN S'),
  ('2127240701024', 'BHAKYA LAKSHMI P'),
  ('2127240701025', 'BHARATH KALYAN B'),
  ('2127240701026', 'BHAVANA S'),
  ('2127240701027', 'BHOOMINATH S'),
  ('2127240701028', 'BHUWANESHWARAN D'),
  ('2127240701029', 'CINTHIYAN R D'),
  ('2127240701030', 'DARUN H'),
  ('2127240701031', 'DEEPAKBALAN C M'),
  ('2127240701032', 'DEVADHARSHINI S A'),
  ('2127240701033', 'DHANYA M'),
  ('2127240701034', 'DHARUN KUMAR K'),
  ('2127240701035', 'DHEVADHURSHANIE E'),
  ('2127240701036', 'DHIVYA S'),
  ('2127240701037', 'DINESH KUMAR M'),
  ('2127240701038', 'DINESH S'),
  ('2127240701039', 'ENTHEZHIL T'),
  ('2127240701040', 'G RUKMANI BALA'),
  ('2127240701041', 'GIRISHA GAYATHRI B'),
  ('2127240701042', 'GOKUL E'),
  ('2127240701043', 'GOKUL M'),
  ('2127240701044', 'GOROCHHANA VIGNESH'),
  ('2127240701045', 'GOWTHAM D'),
  ('2127240701046', 'GRISLER PAUL J'),
  ('2127240701047', 'GURU ANIRUD V'),
  ('2127240701048', 'GURU P'),
  ('2127240701049', 'HAREENA MAHESH M D'),
  ('2127240701050', 'HARI PRASATH S'),
  ('2127240701051', 'HARI S'),
  ('2127240701052', 'HARIHARA R J'),
  ('2127240701053', 'HARIHARAN S'),
  ('2127240701054', 'HARINI SRI M'),
  ('2127240701055', 'HARISH S'),
  ('2127240701056', 'HARSHA VARDHAN N'),
  ('2127240701057', 'HARSITH PRITHVI D S'),
  ('2127240701058', 'HASMATH FARHANA B'),
  ('2127240701059', 'HEMALATHA R'),
  ('2127240701060', 'HEMANTH D'),
  ('2127240701061', 'IRFANAA PARVEEN M'),
  ('2127240701062', 'JADILA SUBRAMANIYAN V S'),
  ('2127240701063', 'JANARTHAN S M'),
  ('2127240701064', 'JAYASRI J'),
  ('2127240701065', 'JOHN JOSHUA SOLOMON RAJESH'),
  ('2127240701066', 'K BUVANESWARAN'),
  ('2127240701067', 'K R KIRUTHICK KUMAR'),
  ('2127240701068', 'K STAVROSH'),
  ('2127240701069', 'K THARUN VEL'),
  ('2127240701070', 'KAAMESH S'),
  ('2127240701071', 'KALAISELVAN K'),
  ('2127240701072', 'KALANITHI A'),
  ('2127240701073', 'KAMALINA K'),
  ('2127240701074', 'KARTHIK M'),
  ('2127240701075', 'KARTHIKEYAN M'),
  ('2127240701076', 'KAVIRAJAN P'),
  ('2127240701077', 'KAVIYA S'),
  ('2127240701078', 'KAVIYA SRI S'),
  ('2127240701079', 'KEERTHANA R'),
  ('2127240701080', 'KEERTHIGA   S'),
  ('2127240701081', 'KEERTHIKA M'),
  ('2127240701082', 'KESHORE P'),
  ('2127240701083', 'KRITHIKA RAJAPANDIAN'),
  ('2127240701084', 'LAVANYA C'),
  ('2127240701085', 'LIKITHA E'),
  ('2127240701086', 'LOGESHWARAN M'),
  ('2127240701087', 'LOGESHWARAN R'),
  ('2127240701088', 'LOHITH G'),
  ('2127240701089', 'LOKESH M'),
  ('2127240701090', 'M DEEPAK'),
  ('2127240701091', 'M KESHAVARAM'),
  ('2127240701092', 'M NIRANJAN'),
  ('2127240701093', 'MADHU MITHA N'),
  ('2127240701094', 'MAHALAKSHMI L'),
  ('2127240701095', 'MAHESH K R V'),
  ('2127240701096', 'MANOJ R'),
  ('2127240701097', 'MANOOJ KUMAR N'),
  ('2127240701098', 'MEYYAPPAN MEENAKSHI'),
  ('2127240701099', 'MOHANAPRIYA P'),
  ('2127240701100', 'MONICA S'),
  ('2127240701101', 'N RAHUL'),
  ('2127240701102', 'N YAAZHINII'),
  ('2127240701103', 'NANDHAGOPAL B'),
  ('2127240701104', 'NANDHITHASRI K K'),
  ('2127240701105', 'NARENDRAPRASATH M L'),
  ('2127240701106', 'NEHAA SRI M S'),
  ('2127240701107', 'NISHA L'),
  ('2127240701108', 'NITHILAN CHELLATHURAI'),
  ('2127240701109', 'NITHIN JAASIEL B'),
  ('2127240701110', 'NITHISH KUMAR N'),
  ('2127240701111', 'PARTHIBHARAJAN R'),
  ('2127240701112', 'PAVITHRA   M'),
  ('2127240701113', 'PRATHIBA M S K'),
  ('2127240701114', 'PRAVEEN BABU G'),
  ('2127240701115', 'PRAVIN D A'),
  ('2127240701116', 'PREETHIKA R'),
  ('2127240701117', 'PREMNATH N'),
  ('2127240701118', 'PRINCY NIKITHA J'),
  ('2127240701119', 'PRIYADHARSHAN   A B'),
  ('2127240701120', 'R V SAI SIRISH'),
  ('2127240701121', 'RAGHAV G S'),
  ('2127240701122', 'RAHUL G'),
  ('2127240701123', 'RAHUL S'),
  ('2127240701124', 'RAHUL SURIYA V'),
  ('2127240701125', 'RAMASAMY SP'),
  ('2127240701126', 'RAMSUBEESHA R S'),
  ('2127240701127', 'RAVEENDRAN K'),
  ('2127240701128', 'RB YUVAN'),
  ('2127240701129', 'RENGAVADIVELAMMAAL C'),
  ('2127240701130', 'RUPASHVINAYAK DHANAPAL'),
  ('2127240701131', 'RUPESH J'),
  ('2127240701132', 'S B SNIGDHA'),
  ('2127240701133', 'S HARI PRASHAD'),
  ('2127240701134', 'S MEENA'),
  ('2127240701135', 'S NAGAMANI KANDAN'),
  ('2127240701136', 'S SANTHOSH'),
  ('2127240701137', 'SAI VIGNESH S'),
  ('2127240701138', 'SAISHA PRIYADARSHINI S'),
  ('2127240701139', 'SANCHITHA D'),
  ('2127240701140', 'SANJAI P'),
  ('2127240701141', 'SANJAY SRINIVASAN B'),
  ('2127240701142', 'SANTHOSH KARTHICK M'),
  ('2127240701143', 'SANYU J'),
  ('2127240701144', 'SARABESH ADITHYA D'),
  ('2127240701145', 'SARABHESWARAN E S'),
  ('2127240701146', 'SARATHI SELVAM D'),
  ('2127240701147', 'SARVESH M'),
  ('2127240701148', 'SEDHURAMAN S'),
  ('2127240701149', 'SETHURAJAN S'),
  ('2127240701150', 'SHAMITHA SARAVANAN'),
  ('2127240701151', 'SHANJAY C'),
  ('2127240701152', 'SHARVESH VARSHAN M K'),
  ('2127240701153', 'SHAWN ABRAHAM JOSEPH L'),
  ('2127240701154', 'SHIVARAMAN S'),
  ('2127240701155', 'SHREE RAGHAV KUMAR E'),
  ('2127240701156', 'SIVAPRIYA S'),
  ('2127240701157', 'SIVARAMAN A'),
  ('2127240701158', 'SN ARJUN'),
  ('2127240701159', 'SREEKHA P V'),
  ('2127240701161', 'SRI HARIHARAN V'),
  ('2127240701162', 'SRI RAM S'),
  ('2127240701163', 'SRI RAMANA KISHORE K'),
  ('2127240701164', 'SUBASAKTHI PALANIAPPAN A'),
  ('2127240701165', 'SUBHACHARAN M'),
  ('2127240701166', 'SURYANARAYANAN V'),
  ('2127240701167', 'TAMILARASAN K'),
  ('2127240701168', 'TAMILPRIYAN M'),
  ('2127240701169', 'TARUN ADITYA G G'),
  ('2127240701170', 'TEENA SHIRLEY SAVARIMUTHU'),
  ('2127240701171', 'TEJASH D'),
  ('2127240701172', 'THARRUN G M'),
  ('2127240701173', 'THIRULOGASUNDAR M'),
  ('2127240701174', 'THRISHNAA PRASANTH'),
  ('2127240701175', 'V N SANJAI'),
  ('2127240701176', 'V S SURYA'),
  ('2127240701177', 'VANISHREE G'),
  ('2127240701178', 'VARUN S N'),
  ('2127240701179', 'VARUNAN K'),
  ('2127240701181', 'VIGNESHWAR K'),
  ('2127240701183', 'VIJAYASARATHY B'),
  ('2127240701184', 'VISWANATHAN L'),
  ('2127240701185', 'YASHWANTH RAJ R'),
  ('2127240701186', 'YOKESH G'),
  ('2127240701187', 'YORICK BRADLEY P'),
  ('2127240701301', 'BALU G'),
  ('2127240701302', 'DILLIBABU M'),
  ('2127240701303', 'G SRI MEGHANAMALINI'),
  ('2127240701304', 'KESAVAN V'),
  ('2127240701305', 'MAGIDISWARAN D'),
  ('2127240701306', 'RAMYA D'),
  ('2127240701307', 'RAMYADEVI S'),
  ('2127240701308', 'VENKATADRI P'),
  ('2127240701501', 'MURALIKRISHNA R')
ON CONFLICT (reg_number) DO NOTHING;

-- ─── STEP 6: ATOMIC REGISTRATION FUNCTION ────────────────────

CREATE OR REPLACE FUNCTION public.register_student(
  p_student_name   TEXT,
  p_roll_number    TEXT,
  p_phone_number   TEXT,
  p_section        TEXT,
  p_college_email  TEXT,
  p_pe2_subject_id UUID,
  p_pe3_subject_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pe2           public.subjects%ROWTYPE;
  v_pe3           public.subjects%ROWTYPE;
  v_roll_exists   BOOLEAN;
  v_email_exists  BOOLEAN;
BEGIN

  -- 1. Duplicate roll check
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE roll_number = UPPER(TRIM(p_roll_number))
  ) INTO v_roll_exists;

  IF v_roll_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'duplicate_roll',
      'message', 'This roll number has already registered.'
    );
  END IF;

  -- 2. Duplicate email check
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE college_email = LOWER(TRIM(p_college_email))
  ) INTO v_email_exists;

  IF v_email_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'duplicate_email',
      'message', 'This college email has already registered.'
    );
  END IF;

  -- 3. Lock PE-II subject row
  SELECT * INTO v_pe2
  FROM public.subjects
  WHERE id = p_pe2_subject_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'pe2_subject_not_found',
      'message', 'Selected PE-II subject does not exist.'
    );
  END IF;

  IF v_pe2.elective_group IS DISTINCT FROM 'PE2' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'pe2_wrong_group',
      'message', 'Selected PE-II subject is not a PE-II elective.'
    );
  END IF;

  IF v_pe2.filled_seats >= v_pe2.max_seats THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'pe2_subject_full',
      'message', 'Selected PE-II subject is already full.'
    );
  END IF;

  -- 4. Lock PE-III subject row
  SELECT * INTO v_pe3
  FROM public.subjects
  WHERE id = p_pe3_subject_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'pe3_subject_not_found',
      'message', 'Selected PE-III subject does not exist.'
    );
  END IF;

  IF v_pe3.elective_group IS DISTINCT FROM 'PE3' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'pe3_wrong_group',
      'message', 'Selected PE-III subject is not a PE-III elective.'
    );
  END IF;

  IF v_pe3.filled_seats >= v_pe3.max_seats THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'pe3_subject_full',
      'message', 'Selected PE-III subject is already full.'
    );
  END IF;

  -- 5. Insert registration row
  INSERT INTO public.registrations (
    student_name,
    roll_number,
    phone_number,
    section,
    college_email,
    pe2_subject_id,
    pe3_subject_id
  ) VALUES (
    TRIM(p_student_name),
    UPPER(TRIM(p_roll_number)),
    TRIM(p_phone_number),
    TRIM(p_section),
    LOWER(TRIM(p_college_email)),
    p_pe2_subject_id,
    p_pe3_subject_id
  );

  -- 6. Increment filled_seats on PE-II subject
  UPDATE public.subjects
  SET
    filled_seats = filled_seats + 1,
    status = CASE WHEN filled_seats + 1 >= max_seats THEN 'full' ELSE 'open' END
  WHERE id = p_pe2_subject_id;

  -- 7. Increment filled_seats on PE-III subject
  UPDATE public.subjects
  SET
    filled_seats = filled_seats + 1,
    status = CASE WHEN filled_seats + 1 >= max_seats THEN 'full' ELSE 'open' END
  WHERE id = p_pe3_subject_id;

  RETURN jsonb_build_object(
    'success', true,
    'code',    'registered',
    'message', 'Registration Successful.'
  );

EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM LIKE '%roll_number%' THEN
      RETURN jsonb_build_object(
        'success', false, 'code', 'duplicate_roll',
        'message', 'This roll number has already registered.'
      );
    ELSIF SQLERRM LIKE '%college_email%' THEN
      RETURN jsonb_build_object(
        'success', false, 'code', 'duplicate_email',
        'message', 'This college email has already registered.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false, 'code', 'duplicate',
        'message', 'Duplicate registration detected.'
      );
    END IF;
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 'code', 'error', 'message', SQLERRM
    );
END;
$$;

-- ─── STEP 7: STUDENT LOGIN & SESSION RPCS ─────────────────────

CREATE OR REPLACE FUNCTION public.student_login(p_reg_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student  public.students%ROWTYPE;
  v_token    TEXT;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE reg_number = TRIM(p_reg_number);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code',    'invalid_reg',
      'message', 'Registration number not found. Please check and try again.'
    );
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.students
  SET active_session_token = v_token,
      session_started_at   = NOW()
  WHERE id = v_student.id;

  RETURN jsonb_build_object(
    'success',       true,
    'code',          'login_ok',
    'session_token', v_token,
    'student_name',  COALESCE(v_student.student_name, ''),
    'reg_number',    v_student.reg_number
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', 'error', 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_session_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student public.students%ROWTYPE;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE active_session_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid',        true,
    'student_name', COALESCE(v_student.student_name, ''),
    'reg_number',   v_student.reg_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_logout(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.students
  SET active_session_token = NULL,
      session_started_at   = NULL
  WHERE active_session_token = p_token;
END;
$$;

-- ─── STEP 8: RLS POLICIES AND GRANTS ──────────────────────────

ALTER TABLE public.subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read on subjects and portal_settings
DROP POLICY IF EXISTS "public_read_subjects" ON public.subjects;
CREATE POLICY "public_read_subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_portal_settings" ON public.portal_settings;
CREATE POLICY "public_read_portal_settings" ON public.portal_settings FOR SELECT TO anon, authenticated USING (true);

-- Registrations policies
DROP POLICY IF EXISTS "public_read_registrations" ON public.registrations;
CREATE POLICY "public_read_registrations" ON public.registrations FOR SELECT TO anon, authenticated USING (true);

-- Block direct write to students
DROP POLICY IF EXISTS "no_direct_student_read" ON public.students;
CREATE POLICY "no_direct_student_read" ON public.students FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "no_direct_student_write" ON public.students;
CREATE POLICY "no_direct_student_write" ON public.students FOR INSERT TO anon, authenticated WITH CHECK (false);

-- Grant function execute permissions
DROP FUNCTION IF EXISTS public.register_student(TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

GRANT EXECUTE ON FUNCTION public.register_student(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_login(TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_session_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_logout(TEXT)       TO anon, authenticated;

-- ============================================================
-- SETUP COMPLETE
-- ============================================================
