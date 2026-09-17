"use client";

import { CheckCircle2, Download, GraduationCap, User, Hash, Phone, Layers, Mail, BookOpen, BookMarked, Repeat2 } from "lucide-react";
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
  pe2_subject: SubjectDetail | null;
  pe3_subject: SubjectDetail | null;
  created_at: string;
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

  const isReplacement = (code: string | undefined) =>
    code?.includes("REPLACE") ?? false;

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500 print:text-black">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-4 print-hidden">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 print:text-black">
          Registration Confirmed
        </h2>
        <p className="text-slate-400 text-sm sm:text-base print:text-gray-600">
          You have successfully registered for both Professional Electives.
        </p>
      </div>

      {/* Details Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 print:border-gray-300 print:bg-white print:text-black shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 print:border-gray-200">
          <h3 className="font-semibold text-lg text-white print:text-black">
            Student Details
          </h3>
          <span className="text-xs text-slate-500 print:text-gray-500">
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

      {/* Allotted Subjects */}
      <div className="space-y-4 mb-8">
        {/* PE-II */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 print:border-gray-300 print:bg-white">
          <h3 className="font-semibold text-xs text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2 print:text-gray-600">
            <BookOpen className="w-3.5 h-3.5" />
            Professional Elective II — Allotted Subject
          </h3>
          {data.pe2_subject ? (
            <div className="flex gap-3 items-start">
              {isReplacement(data.pe2_subject.subject_code) ? (
                <Repeat2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0 print:text-black" />
              ) : (
                <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 shrink-0 print:text-black" />
              )}
              <div>
                <p className={`font-mono text-sm font-semibold mb-1 print:text-black ${isReplacement(data.pe2_subject.subject_code) ? "text-amber-300" : "text-blue-300"}`}>
                  {isReplacement(data.pe2_subject.subject_code) ? "REPLACEMENT" : data.pe2_subject.subject_code}
                </p>
                <p className="text-white print:text-black leading-snug">
                  {data.pe2_subject.subject_name}
                </p>
                {isReplacement(data.pe2_subject.subject_code) && (
                  <p className="text-xs text-amber-400/70 mt-1 print:text-gray-500">
                    Course completed via NPTEL / IIT / SE / GIP or equivalent
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">PE-II subject details not available.</p>
          )}
        </div>

        {/* PE-III */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 print:border-gray-300 print:bg-white">
          <h3 className="font-semibold text-xs text-purple-400 mb-3 uppercase tracking-wider flex items-center gap-2 print:text-gray-600">
            <BookMarked className="w-3.5 h-3.5" />
            Professional Elective III — Allotted Subject
          </h3>
          {data.pe3_subject ? (
            <div className="flex gap-3 items-start">
              {isReplacement(data.pe3_subject.subject_code) ? (
                <Repeat2 className="w-5 h-5 text-amber-400 mt-0.5 shrink-0 print:text-black" />
              ) : (
                <BookMarked className="w-5 h-5 text-purple-400 mt-0.5 shrink-0 print:text-black" />
              )}
              <div>
                <p className={`font-mono text-sm font-semibold mb-1 print:text-black ${isReplacement(data.pe3_subject.subject_code) ? "text-amber-300" : "text-purple-300"}`}>
                  {isReplacement(data.pe3_subject.subject_code) ? "REPLACEMENT" : data.pe3_subject.subject_code}
                </p>
                <p className="text-white print:text-black leading-snug">
                  {data.pe3_subject.subject_name}
                </p>
                {isReplacement(data.pe3_subject.subject_code) && (
                  <p className="text-xs text-amber-400/70 mt-1 print:text-gray-500">
                    Course completed via NPTEL / IIT / SE / GIP or equivalent
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">PE-III subject details not available.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center print-hidden">
        <Button
          onClick={handlePrint}
          className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-200 font-semibold"
        >
          <Download className="w-4 h-4 mr-2" />
          Download as PDF
        </Button>
      </div>

      <div className="mt-8 text-center print-hidden">
        <p className="text-amber-400/90 text-xs sm:text-sm bg-amber-500/10 border border-amber-500/20 py-3 rounded-xl max-w-md mx-auto">
          ⚠️ Note: You cannot register again. If you need changes, please contact the department.
        </p>
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
