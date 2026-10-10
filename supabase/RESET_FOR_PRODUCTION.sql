-- ============================================================
-- RESET TEST DATA & PREPARE PORTAL FOR PRODUCTION DEPLOYMENT
-- ECE Elective Registration Portal — SVCE
--
-- This script completely wipes all test registration data,
-- resets subject seat counters to 0, resets results publishing,
-- and clears all student active session tokens so the website
-- is clean and ready for real student submissions.
--
-- RUN THIS IN SUPABASE SQL EDITOR BEFORE GOING LIVE.
-- ============================================================

BEGIN;

-- 1. Remove all test registration log submissions
DELETE FROM public.registrations;

-- 2. Reset filled seat counts for all subjects back to 0
UPDATE public.subjects
SET filled_seats = 0,
    status = 'open';

-- 3. Clear all active student session tokens & timestamps
UPDATE public.students
SET active_session_token = NULL,
    session_started_at = NULL;

-- 4. Reset portal results_published status to false
UPDATE public.portal_settings
SET results_published = false,
    updated_at = NOW()
WHERE id = 1;

COMMIT;

-- ============================================================
-- VERIFICATION SELECTS
-- ============================================================

SELECT 'registrations' AS table_name, COUNT(*) AS total_rows FROM public.registrations
UNION ALL
SELECT 'active_sessions' AS table_name, COUNT(*) AS total_rows FROM public.students WHERE active_session_token IS NOT NULL;

SELECT elective_group, subject_code, subject_name, max_seats, filled_seats, status
FROM public.subjects
ORDER BY elective_group, subject_code;

SELECT portal_open_time AT TIME ZONE 'Asia/Kolkata' AS portal_open_ist,
       portal_enabled,
       results_published
FROM public.portal_settings;
