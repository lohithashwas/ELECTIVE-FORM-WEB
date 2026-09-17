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
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Users,
  BookMarked,
  Repeat2,
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
  pe2_subject_id: string;
  pe3_subject_id: string;
}

interface FieldError {
  student_name?: string;
  registration_number?: string;
  phone_number?: string;
  section?: string;
  college_email?: string;
  pe2_subject_id?: string;
  pe3_subject_id?: string;
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
    pe2_subject_id: "",
    pe3_subject_id: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);
  const [localSuccessData, setLocalSuccessData] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Fetch subjects (poll every 10s for seat updates)
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch("/api/subjects", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const { subjects: data } = await res.json();
      setSubjects(data);
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

  // Available (non-full) subjects per group
  // Replacement option (PE2-REPLACE / PE3-REPLACE) is always available
  const availablePe2 = pe2Subjects.filter(
    (s) => s.filled_seats < s.max_seats || s.subject_code.includes("REPLACE")
  );
  const availablePe3 = pe3Subjects.filter(
    (s) => s.filled_seats < s.max_seats || s.subject_code.includes("REPLACE")
  );

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

    if (!form.pe2_subject_id) {
      errors.pe2_subject_id = "Please select a Professional Elective II subject";
      valid = false;
    }

    if (!form.pe3_subject_id) {
      errors.pe3_subject_id = "Please select a Professional Elective III subject";
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
      // Continue with normal registration flow; server will reject duplicates
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
        toast.success("Registration Successful!", {
          description: "You have been registered for both elective subjects.",
        });

        const selectedPe2 = subjects.find((s) => s.id === payload.pe2_subject_id);
        const selectedPe3 = subjects.find((s) => s.id === payload.pe3_subject_id);

        setLocalSuccessData({
          student_name: payload.student_name,
          roll_number: payload.roll_number,
          phone_number: payload.phone_number,
          section: payload.section,
          college_email: payload.college_email,
          created_at: new Date().toISOString(),
          pe2_subject: {
            subject_code: selectedPe2?.subject_code || "Unknown",
            subject_name: selectedPe2?.subject_name || "Unknown",
          },
          pe3_subject: {
            subject_code: selectedPe3?.subject_code || "Unknown",
            subject_name: selectedPe3?.subject_name || "Unknown",
          },
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

        // Refresh subjects on failure
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
        {/* ECE badge + AY */}
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
          Select one subject for <span className="text-blue-400 font-medium">PE-II</span> and one for <span className="text-purple-400 font-medium">PE-III</span> — one registration per student
        </p>
      </div>

      {/* Subject Availability Cards */}
      <SubjectAvailability
        pe2Subjects={pe2Subjects}
        pe3Subjects={pe3Subjects}
        loading={loadingSubjects}
        error={subjectError}
        onRefresh={fetchSubjects}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {/* Student Name */}
        <FormField
          id="student_name"
          label="Full Name"
          icon={<User className="w-4 h-4" />}
          error={fieldErrors.student_name}
        >
          <Input
            id="student_name"
            type="text"
            placeholder="Enter your full name"
            value={form.student_name}
            onChange={(e) => handleChange("student_name", e.target.value)}
            disabled={submitting}
            autoComplete="name"
            aria-invalid={!!fieldErrors.student_name}
          />
        </FormField>

        {/* Registration Number */}
        <FormField
          id="registration_number"
          label="Registration No."
          icon={<Hash className="w-4 h-4" />}
          error={fieldErrors.registration_number}
          hint="Enter only the last 3 digits — prefix 2127240701 is fixed"
        >
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 overflow-hidden focus-within:border-blue-500/60 focus-within:bg-blue-500/5 transition">
            <span className="px-3 py-2.5 text-sm font-mono text-slate-500 bg-white/5 border-r border-white/10 select-none whitespace-nowrap">
              2127240701
            </span>
            <input
              id="registration_number"
              type="text"
              maxLength={3}
              placeholder="XXX"
              value={form.registration_number}
              onChange={(e) =>
                handleChange("registration_number", e.target.value.replace(/\D/g, ""))
              }
              disabled={submitting}
              autoComplete="off"
              aria-invalid={!!fieldErrors.registration_number}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none min-w-0"
            />
          </div>
        </FormField>

        {/* Phone Number */}
        <FormField
          id="phone_number"
          label="Phone No."
          icon={<Phone className="w-4 h-4" />}
          error={fieldErrors.phone_number}
          hint="10-digit Indian mobile number (e.g. 9876543210)"
        >
          <Input
            id="phone_number"
            type="tel"
            placeholder="Enter your 10-digit mobile number"
            value={form.phone_number}
            onChange={(e) =>
              handleChange("phone_number", e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            disabled={submitting}
            autoComplete="tel"
            maxLength={10}
            aria-invalid={!!fieldErrors.phone_number}
          />
        </FormField>

        {/* Section & Email — side by side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Section */}
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
                <SelectValue placeholder="Select section" />
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

          {/* College Email */}
          <FormField
            id="college_email"
            label="College Email"
            icon={<Mail className="w-4 h-4" />}
            error={fieldErrors.college_email}
          >
            <Input
              id="college_email"
              type="email"
              placeholder={`name${COLLEGE_EMAIL_DOMAIN}`}
              value={form.college_email}
              onChange={(e) =>
                handleChange("college_email", e.target.value.toLowerCase())
              }
              disabled={submitting}
              autoComplete="email"
              aria-invalid={!!fieldErrors.college_email}
            />
          </FormField>
        </div>

        {/* ── PE-II Subject Selection ── */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">Professional Elective II</span>
            <span className="text-[10px] text-blue-400/60 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5 ml-auto">
              Select 1 from PE-II
            </span>
          </div>
          <FormField
            id="pe2_subject_id"
            label="PE-II Subject"
            icon={<BookOpen className="w-4 h-4" />}
            error={fieldErrors.pe2_subject_id}
            hint='Select "Replacement" if you completed this via NPTEL, IIT, SE, GIP, or other means'
          >
            {loadingSubjects ? (
              <div className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subjects...
              </div>
            ) : subjectError ? (
              <div className="flex h-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-400 gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed to load subjects
              </div>
            ) : (
              <Select
                value={form.pe2_subject_id}
                onValueChange={(v) => handleChange("pe2_subject_id", v)}
                disabled={submitting}
              >
                <SelectTrigger
                  id="pe2_subject_id"
                  aria-invalid={!!fieldErrors.pe2_subject_id}
                >
                  <SelectValue placeholder="Choose PE-II subject" />
                </SelectTrigger>
                <SelectContent>
                  {availablePe2.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-400">
                      All PE-II subjects are full
                    </div>
                  ) : (
                    availablePe2.map((subj) => {
                      const isReplacement = subj.subject_code.includes("REPLACE");
                      const remaining = subj.max_seats - subj.filled_seats;
                      return (
                        <SelectItem key={subj.id} value={subj.id}>
                          <span className="flex items-center gap-2">
                            {isReplacement && (
                              <Repeat2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className={isReplacement ? "text-amber-300 font-medium" : ""}>
                              {isReplacement ? subj.subject_name : subj.subject_code}
                            </span>
                            {!isReplacement && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="truncate">{subj.subject_name}</span>
                                <span className="ml-auto text-xs text-emerald-400 font-mono shrink-0">
                                  {remaining} left
                                </span>
                              </>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>

        {/* ── PE-III Subject Selection ── */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <BookMarked className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Professional Elective III</span>
            <span className="text-[10px] text-purple-400/60 bg-purple-500/10 border border-purple-500/20 rounded-full px-2 py-0.5 ml-auto">
              Select 1 from PE-III
            </span>
          </div>
          <FormField
            id="pe3_subject_id"
            label="PE-III Subject"
            icon={<BookMarked className="w-4 h-4" />}
            error={fieldErrors.pe3_subject_id}
            hint='Select "Replacement" if you completed this via NPTEL, IIT, SE, GIP, or other means'
            accentColor="purple"
          >
            {loadingSubjects ? (
              <div className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subjects...
              </div>
            ) : subjectError ? (
              <div className="flex h-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-400 gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed to load subjects
              </div>
            ) : (
              <Select
                value={form.pe3_subject_id}
                onValueChange={(v) => handleChange("pe3_subject_id", v)}
                disabled={submitting}
              >
                <SelectTrigger
                  id="pe3_subject_id"
                  aria-invalid={!!fieldErrors.pe3_subject_id}
                >
                  <SelectValue placeholder="Choose PE-III subject" />
                </SelectTrigger>
                <SelectContent>
                  {availablePe3.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-400">
                      All PE-III subjects are full
                    </div>
                  ) : (
                    availablePe3.map((subj) => {
                      const isReplacement = subj.subject_code.includes("REPLACE");
                      const remaining = subj.max_seats - subj.filled_seats;
                      return (
                        <SelectItem key={subj.id} value={subj.id}>
                          <span className="flex items-center gap-2">
                            {isReplacement && (
                              <Repeat2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className={isReplacement ? "text-amber-300 font-medium" : ""}>
                              {isReplacement ? subj.subject_name : subj.subject_code}
                            </span>
                            {!isReplacement && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="truncate">{subj.subject_name}</span>
                                <span className="ml-auto text-xs text-emerald-400 font-mono shrink-0">
                                  {remaining} left
                                </span>
                              </>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={!canSubmit}
            id="submit-registration"
          >
            {submitting || checkingExisting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <GraduationCap className="w-5 h-5 mr-2" />
                Register Now
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  id,
  label,
  icon,
  error,
  hint,
  accentColor = "blue",
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  accentColor?: "blue" | "purple";
  children: React.ReactNode;
}) {
  const iconColor = error
    ? "text-red-400"
    : accentColor === "purple"
    ? "text-purple-400"
    : "text-blue-400";

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={`flex items-center gap-1.5 text-sm font-medium ${
          error ? "text-red-400" : "text-slate-300"
        }`}
      >
        <span className={iconColor}>{icon}</span>
        {label}
        <span className="text-red-400 ml-0.5">*</span>
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400 animate-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function SubjectAvailability({
  pe2Subjects,
  pe3Subjects,
  loading,
  error,
  onRefresh,
}: {
  pe2Subjects: Subject[];
  pe3Subjects: Subject[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-white/5 border border-white/5 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-white/5 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mt-6">
        <span className="text-sm text-red-400">Failed to load seat data</span>
        <button
          onClick={onRefresh}
          className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  const displaySubjects = (subjects: Subject[], accent: "blue" | "purple") =>
    subjects
      .filter((s) => !s.subject_code.includes("REPLACE")) // hide replacement from seat cards
      .map((subj) => {
        const pct = (subj.filled_seats / subj.max_seats) * 100;
        const isFull = subj.filled_seats >= subj.max_seats;
        const remaining = subj.max_seats - subj.filled_seats;
        const borderOpen = accent === "purple"
          ? "border-purple-500/30 hover:bg-purple-500/5"
          : "border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5";
        const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : accent === "purple" ? "bg-purple-500" : "bg-emerald-500";

        return (
          <div
            key={subj.id}
            className={`rounded-xl border p-3 transition-all duration-300 ${
              isFull
                ? "border-red-500/20 bg-red-500/5 opacity-60"
                : `${borderOpen} bg-white/5`
            }`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <span className={`text-xs font-mono font-semibold ${accent === "purple" ? "text-purple-400" : "text-blue-400"}`}>
                {subj.subject_code}
              </span>
              {isFull ? (
                <span className="text-[10px] font-semibold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full">
                  FULL
                </span>
              ) : (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${accent === "purple" ? "text-purple-300 bg-purple-500/15" : "text-emerald-400 bg-emerald-500/15"}`}>
                  OPEN
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-tight mb-2 line-clamp-2">
              {subj.subject_name}
            </p>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {isFull ? "No seats left" : `${remaining} / ${subj.max_seats} seats`}
            </p>
          </div>
        );
      });

  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Seat Availability
        </span>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* PE-II cards */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
            Professional Elective II
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {displaySubjects(pe2Subjects, "blue")}
        </div>
      </div>

      {/* PE-III cards */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookMarked className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
            Professional Elective III
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {displaySubjects(pe3Subjects, "purple")}
        </div>
      </div>
    </div>
  );
}
