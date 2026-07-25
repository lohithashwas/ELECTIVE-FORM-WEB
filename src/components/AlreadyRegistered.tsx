"use client";

import { CheckCircle2, Download, GraduationCap, User, Hash, Phone, Layers, Mail, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegistrationDetails {
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  subjects: {
    subject_code: string;
    subject_name: string;
  };
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
          You have successfully registered for your VAC elective.
        </p>
      </div>

      {/* Details Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 print:border-gray-300 print:bg-white print:text-black shadow-lg">
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

        <div className="mt-6 pt-5 border-t border-white/10 print:border-gray-200">
          <h3 className="font-semibold text-sm text-slate-300 mb-3 print:text-gray-600 uppercase tracking-wider">
            Allotted Subject
          </h3>
          <div className="flex gap-3 items-start bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 print:bg-gray-50 print:border-gray-300">
            <BookOpen className="w-5 h-5 text-blue-400 mt-0.5 shrink-0 print:text-black" />
            <div>
              <p className="font-mono text-blue-300 text-sm font-semibold mb-1 print:text-black">
                {data.subjects.subject_code}
              </p>
              <p className="text-white print:text-black leading-snug">
                {data.subjects.subject_name}
              </p>
            </div>
          </div>
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
