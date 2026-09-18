"use client";

import {
  CheckCircle2,
  Download,
  User,
  Hash,
  Phone,
  Layers,
  Mail,
  BookOpen,
  BookMarked,
  Clock,
  Award,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubjectDetail {
  subject_code: string;
  subject_name: string;
}

interface RegistrationDetails {
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  created_at: string;
  results_published?: boolean;
  pe2_p1?: SubjectDetail | null;
  pe2_p2?: SubjectDetail | null;
  pe2_p3?: SubjectDetail | null;
  pe3_p1?: SubjectDetail | null;
  pe3_p2?: SubjectDetail | null;
  pe3_p3?: SubjectDetail | null;
  pe2_allotted?: SubjectDetail | null;
  pe3_allotted?: SubjectDetail | null;
  pe2_subject?: SubjectDetail | null;
  pe3_subject?: SubjectDetail | null;
}

export default function AlreadyRegistered({ data }: { data: RegistrationDetails }) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(data.created_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const isPublished = Boolean(data.results_published);
  const pe2Allotted = data.pe2_allotted || data.pe2_subject;
  const pe3Allotted = data.pe3_allotted || data.pe3_subject;

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500 print:text-black">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full shadow-lg mb-4 print-hidden ${
          isPublished
            ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
            : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30"
        }`}>
          {isPublished ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : (
            <Clock className="w-8 h-8 text-white animate-pulse" />
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 print:text-black">
          {isPublished ? "Course Allotment Confirmed" : "Registration Options Submitted"}
        </h2>
        <p className="text-slate-400 text-sm sm:text-base print:text-gray-600 max-w-lg mx-auto">
          {isPublished
            ? "Your final course allotment has been approved by the department."
            : "Your elective preferences have been successfully recorded."}
        </p>
      </div>

      {/* FCFS & Admin Approval Alert Banner */}
      {!isPublished && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 print-hidden">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="font-semibold block text-amber-200 mb-1">
                ⏳ Allotment Pending Admin Approval
              </strong>
              After all students enter their choices, courses will be allotted on a <strong>First-Come, First-Served (FCFS) basis</strong> (based on submission timestamp). Results will be visible in your login after Admin approval.
            </div>
          </div>
        </div>
      )}

      {/* Student Details Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 print:border-gray-300 print:bg-white print:text-black shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 print:border-gray-200">
          <h3 className="font-semibold text-lg text-white print:text-black">
            Student Details
          </h3>
          <span className="text-xs text-slate-400 print:text-gray-500">
            {formattedDate}
          </span>
        </div>

        <div className="space-y-4">
          <DetailRow icon={<User className="w-4 h-4" />} label="Name" value={data.student_name} />
          <DetailRow icon={<Hash className="w-4 h-4" />} label="Registration No." value={data.roll_number} />
          <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={data.phone_number} />
          <DetailRow icon={<Layers className="w-4 h-4" />} label="Section" value={data.section} />
          <DetailRow icon={<Mail className="w-4 h-4" />} label="College Email" value={data.college_email} />
        </div>
      </div>

      {/* RESULTS DISPLAY */}
      {isPublished ? (
        /* Final Allotted Courses (Approved State) */
        <div className="space-y-4 mb-8">
          {/* PE-II Allotted */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 print:border-gray-300 print:bg-white">
            <h3 className="font-semibold text-xs text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2 print:text-gray-600">
              <BookOpen className="w-4 h-4" />
              Professional Elective II — Allotted Subject
            </h3>
            {pe2Allotted ? (
              <div className="flex gap-3 items-start">
                <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 shrink-0 print:text-black" />
                <div>
                  <p className="font-mono text-sm font-semibold mb-1 text-blue-300 print:text-black">
                    {pe2Allotted.subject_code}
                  </p>
                  <p className="text-white print:text-black leading-snug font-medium text-base">
                    {pe2Allotted.subject_name}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">PE-II subject details pending.</p>
            )}
          </div>

          {/* PE-III Allotted */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 print:border-gray-300 print:bg-white">
            <h3 className="font-semibold text-xs text-purple-400 mb-3 uppercase tracking-wider flex items-center gap-2 print:text-gray-600">
              <BookMarked className="w-4 h-4" />
              Professional Elective III — Allotted Subject
            </h3>
            {pe3Allotted ? (
              <div className="flex gap-3 items-start">
                <BookMarked className="w-5 h-5 text-purple-400 mt-0.5 shrink-0 print:text-black" />
                <div>
                  <p className="font-mono text-sm font-semibold mb-1 text-purple-300 print:text-black">
                    {pe3Allotted.subject_code}
                  </p>
                  <p className="text-white print:text-black leading-snug font-medium text-base">
                    {pe3Allotted.subject_name}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">PE-III subject details pending.</p>
            )}
          </div>
        </div>
      ) : (
        /* Submitted Choices (Pending State) */
        <div className="space-y-6 mb-8 print-hidden">
          {/* PE-II Choices */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-xs text-blue-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Your Submitted Choices for PE-II
            </h3>
            <div className="space-y-3">
              <PriorityRow label="Priority 1" subject={data.pe2_p1 || data.pe2_subject} highlight />
              <PriorityRow label="Priority 2" subject={data.pe2_p2} />
              <PriorityRow label="Priority 3" subject={data.pe2_p3} />
            </div>
          </div>

          {/* PE-III Choices */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5">
            <h3 className="font-semibold text-xs text-purple-400 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BookMarked className="w-4 h-4" />
              Your Submitted Choices for PE-III
            </h3>
            <div className="space-y-3">
              <PriorityRow label="Priority 1" subject={data.pe3_p1 || data.pe3_subject} highlight accent="purple" />
              <PriorityRow label="Priority 2" subject={data.pe3_p2} accent="purple" />
              <PriorityRow label="Priority 3" subject={data.pe3_p3} accent="purple" />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center print-hidden">
        {isPublished ? (
          <Button
            onClick={handlePrint}
            className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-200 font-semibold shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Receipt PDF
          </Button>
        ) : (
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-11 px-6 border-white/20 text-slate-300 hover:bg-white/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Print Submitted Choices
          </Button>
        )}
      </div>
    </div>
  );
}

function PriorityRow({
  label,
  subject,
  highlight = false,
  accent = "blue",
}: {
  label: string;
  subject?: SubjectDetail | null;
  highlight?: boolean;
  accent?: "blue" | "purple";
}) {
  const badgeColor = accent === "purple" ? "text-purple-300 bg-purple-500/20" : "text-blue-300 bg-blue-500/20";
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${
      highlight ? "border-white/15 bg-white/5" : "border-white/5 bg-slate-950/40"
    }`}>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${badgeColor}`}>
          <Award className="w-3 h-3 inline mr-1" />
          {label}
        </span>
        {subject ? (
          <div>
            <span className="font-mono text-xs text-slate-300 mr-2">{subject.subject_code}</span>
            <span className="text-xs text-slate-200 font-medium">{subject.subject_name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Not selected</span>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-400 print:text-gray-600 w-5 flex justify-center shrink-0">
        {icon}
      </div>
      <span className="text-sm text-slate-400 print:text-gray-600 w-28 shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-white print:text-black truncate">
        {value}
      </span>
    </div>
  );
}
