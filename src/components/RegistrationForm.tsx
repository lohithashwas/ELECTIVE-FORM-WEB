"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  User,
  Hash,
  Layers,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  BookMarked,
  Award,
} from "lucide-react";
import AlreadyRegistered from "./AlreadyRegistered";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SECTIONS, COLLEGE_EMAIL_DOMAIN } from "@/lib/constants";
import type { Subject } from "@/lib/validations";
import { useRouter } from "next/navigation";

interface FormState {
  student_name: string;
  registration_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  pe2_p1_id: string;
  pe2_p2_id: string;
  pe2_p3_id: string;
  pe3_p1_id: string;
  pe3_p2_id: string;
  pe3_p3_id: string;
}

interface FieldError {
  student_name?: string;
  registration_number?: string;
  phone_number?: string;
  section?: string;
  college_email?: string;
  pe2_p1_id?: string;
  pe2_p2_id?: string;
  pe2_p3_id?: string;
  pe3_p1_id?: string;
  pe3_p2_id?: string;
  pe3_p3_id?: string;
}

export default function RegistrationForm() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectError, setSubjectError] = useState(false);

  const [form, setForm] = useState<FormState>({
    student_name: "",
    registration_number: "",
    phone_number: "",
    section: "",
    college_email: "",
    pe2_p1_id: "",
    pe2_p2_id: "",
    pe2_p3_id: "",
    pe3_p1_id: "",
    pe3_p2_id: "",
    pe3_p3_id: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localSuccessData, setLocalSuccessData] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Fetch subjects (excluding replacement options)
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/subjects", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const { subjects: data } = await res.json();
      const filtered = (data || []).filter(
        (s: Subject) => !s.subject_code.includes("REPLACE")
      );
      setSubjects(filtered);
      setSubjectError(false);
    } catch {
      setSubjectError(true);
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
    const interval = setInterval(fetchSubjects, 10000);
    return () => clearInterval(interval);
  }, [fetchSubjects]);

  // Split subjects by group
  const pe2Subjects = subjects.filter((s) => s.elective_group === "PE2");
  const pe3Subjects = subjects.filter((s) => s.elective_group === "PE3");

  const validate = (): boolean => {
    const errors: FieldError = {};
    let valid = true;

    if (!form.student_name.trim() || form.student_name.trim().length < 2) {
      errors.student_name = "Enter your full name (at least 2 characters)";
      valid = false;
    }

    const suffix = form.registration_number.trim();
    if (!suffix) {
      errors.registration_number = "Registration number is required";
      valid = false;
    } else if (!/^\d{3}$/.test(suffix)) {
      errors.registration_number = "Enter the last 3 digits of your registration number";
      valid = false;
    }

    const phone = form.phone_number.trim();
    if (!phone) {
      errors.phone_number = "Phone number is required";
      valid = false;
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phone_number = "Enter a valid 10-digit Indian mobile number";
      valid = false;
    }

    if (!form.section) {
      errors.section = "Please select your section";
      valid = false;
    }

    if (!form.college_email.trim()) {
      errors.college_email = "College email is required";
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.college_email)) {
      errors.college_email = "Enter a valid email address";
      valid = false;
    } else if (!form.college_email.toLowerCase().endsWith(COLLEGE_EMAIL_DOMAIN)) {
      errors.college_email = `Email must end with ${COLLEGE_EMAIL_DOMAIN}`;
      valid = false;
    }

    // PE-II Priorities Validation
    if (!form.pe2_p1_id) {
      errors.pe2_p1_id = "Please select Priority 1 for PE-II";
      valid = false;
    }
    if (!form.pe2_p2_id) {
      errors.pe2_p2_id = "Please select Priority 2 for PE-II";
      valid = false;
    }
    if (!form.pe2_p3_id) {
      errors.pe2_p3_id = "Please select Priority 3 for PE-II";
      valid = false;
    }

    if (form.pe2_p1_id && form.pe2_p2_id && form.pe2_p1_id === form.pe2_p2_id) {
      errors.pe2_p2_id = "Priority 2 must be different from Priority 1";
      valid = false;
    }
    if (
      form.pe2_p3_id &&
      (form.pe2_p3_id === form.pe2_p1_id || form.pe2_p3_id === form.pe2_p2_id)
    ) {
      errors.pe2_p3_id = "Priority 3 must be different from Priority 1 & 2";
      valid = false;
    }

    // PE-III Priorities Validation
    if (!form.pe3_p1_id) {
      errors.pe3_p1_id = "Please select Priority 1 for PE-III";
      valid = false;
    }
    if (!form.pe3_p2_id) {
      errors.pe3_p2_id = "Please select Priority 2 for PE-III";
      valid = false;
    }
    if (!form.pe3_p3_id) {
      errors.pe3_p3_id = "Please select Priority 3 for PE-III";
      valid = false;
    }

    if (form.pe3_p1_id && form.pe3_p2_id && form.pe3_p1_id === form.pe3_p2_id) {
      errors.pe3_p2_id = "Priority 2 must be different from Priority 1";
      valid = false;
    }
    if (
      form.pe3_p3_id &&
      (form.pe3_p3_id === form.pe3_p1_id || form.pe3_p3_id === form.pe3_p2_id)
    ) {
      errors.pe3_p3_id = "Priority 3 must be different from Priority 1 & 2";
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const rollNumber = `2127240701${form.registration_number.trim()}`;

    setSubmitting(true);
    setFieldErrors({});
    setCheckingExisting(true);

    try {
      const existingRes = await fetch(`/api/registrations?roll_number=${encodeURIComponent(rollNumber)}`);
      const existingData = await existingRes.json();

      if (existingData?.success && existingData?.registration) {
        setLocalSuccessData(existingData.registration);
        setSubmitting(false);
        setCheckingExisting(false);
        return;
      }
    } catch {
      // Continue with registration flow
    }

    const payload = {
      ...form,
      roll_number: rollNumber,
      phone_number: form.phone_number.trim(),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Registration Submitted!", {
          description: "Your subject priorities have been submitted successfully.",
        });

        const findSubj = (id: string) => subjects.find((s) => s.id === id);

        const pe2P1 = findSubj(payload.pe2_p1_id);
        const pe2P2 = findSubj(payload.pe2_p2_id);
        const pe2P3 = findSubj(payload.pe2_p3_id);

        const pe3P1 = findSubj(payload.pe3_p1_id);
        const pe3P2 = findSubj(payload.pe3_p2_id);
        const pe3P3 = findSubj(payload.pe3_p3_id);

        setLocalSuccessData({
          student_name: payload.student_name,
          roll_number: payload.roll_number,
          phone_number: payload.phone_number,
          section: payload.section,
          college_email: payload.college_email,
          created_at: new Date().toISOString(),
          results_published: false,
          pe2_p1: pe2P1 ? { subject_code: pe2P1.subject_code, subject_name: pe2P1.subject_name } : null,
          pe2_p2: pe2P2 ? { subject_code: pe2P2.subject_code, subject_name: pe2P2.subject_name } : null,
          pe2_p3: pe2P3 ? { subject_code: pe2P3.subject_code, subject_name: pe2P3.subject_name } : null,
          pe3_p1: pe3P1 ? { subject_code: pe3P1.subject_code, subject_name: pe3P1.subject_name } : null,
          pe3_p2: pe3P2 ? { subject_code: pe3P2.subject_code, subject_name: pe3P2.subject_name } : null,
          pe3_p3: pe3P3 ? { subject_code: pe3P3.subject_code, subject_name: pe3P3.subject_name } : null,
          pe2_allotted: null,
          pe3_allotted: null,
          pe2_subject: pe2P1 ? { subject_code: pe2P1.subject_code, subject_name: pe2P1.subject_name } : null,
          pe3_subject: pe3P1 ? { subject_code: pe3P1.subject_code, subject_name: pe3P1.subject_name } : null,
        });

        setSubmitting(false);
      } else {
        toast.error(data.error || "Registration failed. Please try again.", {
          duration: 5000,
        });

        if (data.error && data.error.includes("already registered")) {
          try {
            const existingRes = await fetch(`/api/registrations?roll_number=${encodeURIComponent(rollNumber)}`);
            const existingData = await existingRes.json();
            if (existingData?.success && existingData?.registration) {
              setLocalSuccessData(existingData.registration);
            } else {
              router.refresh();
            }
          } catch {
            router.refresh();
          }
        }

        fetchSubjects();
        setSubmitting(false);
        setCheckingExisting(false);
      }
    } catch {
      toast.error("Network error. Please check your connection and try again.");
      setSubmitting(false);
      setCheckingExisting(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as keyof FieldError]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (localSuccessData) {
    return <AlreadyRegistered data={localSuccessData} />;
  }

  const allSubjectsLoaded = !loadingSubjects && !subjectError;
  const canSubmit = allSubjectsLoaded && !submitting && !checkingExisting;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 tracking-wide">
            Dept. of ECE
          </span>
          <span className="text-[11px] text-slate-500">·</span>
          <span className="text-[11px] text-slate-500">AY 2026–2027</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
          Professional Elective Registration
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Fill your top <span className="text-blue-400 font-medium">3 Priorities for PE-II</span> and <span className="text-purple-400 font-medium">3 Priorities for PE-III</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Full Name */}
        <FormField
          id="student_name"
          label="Full Name (as in college records)"
          icon={<User className="w-4 h-4" />}
          error={fieldErrors.student_name}
        >
          <Input
            id="student_name"
            placeholder="e.g. AADHITHYA NARAYANAN"
            value={form.student_name}
            onChange={(e) => handleChange("student_name", e.target.value)}
            className="uppercase"
            disabled={submitting}
          />
        </FormField>

        {/* Reg Number & Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="registration_number"
            label="Registration No."
            icon={<Hash className="w-4 h-4" />}
            error={fieldErrors.registration_number}
            hint="Last 3 digits (e.g. 001 for 2127240701001)"
          >
            <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500 transition-colors">
              <span className="bg-slate-800/80 px-3 py-2.5 text-slate-400 text-xs sm:text-sm font-mono flex items-center border-r border-white/10 shrink-0 select-none">
                2127240701
              </span>
              <Input
                id="registration_number"
                placeholder="001"
                maxLength={3}
                value={form.registration_number}
                onChange={(e) =>
                  handleChange("registration_number", e.target.value.replace(/\D/g, ""))
                }
                className="border-0 rounded-none focus-visible:ring-0 font-mono tracking-wider"
                disabled={submitting}
              />
            </div>
          </FormField>

          <FormField
            id="section"
            label="Section"
            icon={<Layers className="w-4 h-4" />}
            error={fieldErrors.section}
          >
            <Select
              value={form.section}
              onValueChange={(v) => handleChange("section", v)}
              disabled={submitting}
            >
              <SelectTrigger id="section" aria-invalid={!!fieldErrors.section}>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    Section {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="phone_number"
            label="Mobile Number"
            icon={<Phone className="w-4 h-4" />}
            error={fieldErrors.phone_number}
          >
            <Input
              id="phone_number"
              type="tel"
              placeholder="10-digit mobile number"
              maxLength={10}
              value={form.phone_number}
              onChange={(e) =>
                handleChange("phone_number", e.target.value.replace(/\D/g, ""))
              }
              disabled={submitting}
            />
          </FormField>

          <FormField
            id="college_email"
            label="College Email"
            icon={<Mail className="w-4 h-4" />}
            error={fieldErrors.college_email}
            hint={`Must end with ${COLLEGE_EMAIL_DOMAIN}`}
          >
            <Input
              id="college_email"
              type="email"
              placeholder={`username${COLLEGE_EMAIL_DOMAIN}`}
              value={form.college_email}
              onChange={(e) => handleChange("college_email", e.target.value)}
              disabled={submitting}
            />
          </FormField>
        </div>

        {/* ── PE-II Priorities ── */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-blue-500/20 pb-3">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-semibold text-blue-300">Professional Elective II Choices</h3>
              <p className="text-xs text-slate-400">Select 3 courses in order of preference</p>
            </div>
          </div>

          <PrioritySelector
            id="pe2_p1_id"
            label="Priority 1 (PE-II)"
            icon={<Award className="w-4 h-4 text-blue-400" />}
            value={form.pe2_p1_id}
            onChange={(v) => handleChange("pe2_p1_id", v)}
            subjects={pe2Subjects}
            error={fieldErrors.pe2_p1_id}
            disabled={submitting}
            loading={loadingSubjects}
            errorState={subjectError}
          />

          <PrioritySelector
            id="pe2_p2_id"
            label="Priority 2 (PE-II)"
            icon={<Award className="w-4 h-4 text-blue-400/80" />}
            value={form.pe2_p2_id}
            onChange={(v) => handleChange("pe2_p2_id", v)}
            subjects={pe2Subjects}
            error={fieldErrors.pe2_p2_id}
            disabled={submitting}
            loading={loadingSubjects}
            errorState={subjectError}
          />

          <PrioritySelector
            id="pe2_p3_id"
            label="Priority 3 (PE-II)"
            icon={<Award className="w-4 h-4 text-blue-400/60" />}
            value={form.pe2_p3_id}
            onChange={(v) => handleChange("pe2_p3_id", v)}
            subjects={pe2Subjects}
            error={fieldErrors.pe2_p3_id}
            disabled={submitting}
            loading={loadingSubjects}
            errorState={subjectError}
          />
        </div>

        {/* ── PE-III Priorities ── */}
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3">
            <BookMarked className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-base font-semibold text-purple-300">Professional Elective III Choices</h3>
              <p className="text-xs text-slate-400">Select 3 courses in order of preference</p>
            </div>
          </div>

          <PrioritySelector
            id="pe3_p1_id"
            label="Priority 1 (PE-III)"
            icon={<Award className="w-4 h-4 text-purple-400" />}
            value={form.pe3_p1_id}
            onChange={(v) => handleChange("pe3_p1_id", v)}
            subjects={pe3Subjects}
            error={fieldErrors.pe3_p1_id}
            disabled={submitting}
            loading={loadingSubjects}
            errorState={subjectError}
          />

          <PrioritySelector
            id="pe3_p2_id"
            label="Priority 2 (PE-III)"
            icon={<Award className="w-4 h-4 text-purple-400/80" />}
            value={form.pe3_p2_id}
            onChange={(v) => handleChange("pe3_p2_id", v)}
            subjects={pe3Subjects}
            error={fieldErrors.pe3_p2_id}
            disabled={submitting}
            loading={loadingSubjects}
            errorState={subjectError}
          />

          <PrioritySelector
            id="pe3_p3_id"
            label="Priority 3 (PE-III)"
            icon={<Award className="w-4 h-4 text-purple-400/60" />}
            value={form.pe3_p3_id}
            onChange={(v) => handleChange("pe3_p3_id", v)}
            subjects={pe3Subjects}
            error={fieldErrors.pe3_p3_id}
            disabled={submitting}
            loading={loadingSubjects}
            errorState={subjectError}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
            disabled={!canSubmit}
            id="submit-registration"
          >
            {submitting || checkingExisting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting Options...
              </>
            ) : (
              <>
                <GraduationCap className="w-5 h-5 mr-2" />
                Submit Priorities
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Priority Selector Subcomponent ──────────────────────────────────────────

function PrioritySelector({
  id,
  label,
  icon,
  value,
  onChange,
  subjects,
  error,
  disabled,
  loading,
  errorState,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  subjects: Subject[];
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  errorState?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={`flex items-center gap-1.5 text-xs font-medium ${error ? "text-red-400" : "text-slate-300"}`}>
        {icon}
        {label}
        <span className="text-red-400 ml-0.5">*</span>
      </Label>
      {loading ? (
        <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-slate-400 gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading courses...
        </div>
      ) : errorState ? (
        <div className="flex h-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Failed to load courses
        </div>
      ) : (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} aria-invalid={!!error}>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subj) => (
              <SelectItem key={subj.id} value={subj.id}>
                {subj.subject_code} — {subj.subject_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function FormField({
  id,
  label,
  icon,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={`flex items-center gap-1.5 text-sm font-medium ${
          error ? "text-red-400" : "text-slate-300"
        }`}
      >
        <span className={error ? "text-red-400" : "text-blue-400"}>{icon}</span>
        {label}
        <span className="text-red-400 ml-0.5">*</span>
      </Label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
