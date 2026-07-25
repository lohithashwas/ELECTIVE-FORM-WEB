-- ============================================================
-- Reset only registration data (safe for testing)
-- This does NOT touch login/student credentials.
-- Run this in Supabase SQL Editor.
-- ============================================================

BEGIN;

-- 1) Remove all student registration submissions
DELETE FROM public.registrations;

-- 2) Reset elective seat counters so subjects become available again
UPDATE public.subjects
SET filled_seats = 0,
    status = 'open';

COMMIT;

-- 3) Verification
SELECT 'registrations' AS table_name, COUNT(*) AS row_count FROM public.registrations
UNION ALL
SELECT 'subjects' AS table_name, COUNT(*) AS row_count FROM public.subjects;

SELECT subject_code, subject_name, max_seats, filled_seats, status
FROM public.subjects
ORDER BY subject_code;
