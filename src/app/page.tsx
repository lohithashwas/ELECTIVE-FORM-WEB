import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import RegistrationForm from "@/components/RegistrationForm";
import AlreadyRegistered from "@/components/AlreadyRegistered";
import LogoutButton from "@/components/LogoutButton";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function HomePage() {
  // ── Validate session ───────────────────────────────────────
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("vac_session")?.value;

  if (!sessionCookie) redirect("/login");

  let studentName = "";
  let studentReg = "";
  try {
    const session = JSON.parse(sessionCookie);
    if (!session?.token) redirect("/login");

    // Verify the token is still the active one in DB (single-session check)
    const { data } = await supabaseAdmin.rpc("verify_session_token", {
      p_token: session.token,
    });

    if (!data?.valid) {
      // Another device has taken the session — boot this one
      redirect("/login?reason=session_replaced");
    }

    studentName = data.student_name || session.student_name || "";
    studentReg = data.reg_number || session.reg_number || "";
  } catch {
    redirect("/login");
  }

  // ── Check if already registered ────────────────────────────
  let existingRegistration = null;
  if (studentReg) {
    const { data } = await supabaseAdmin
      .from("registrations")
      .select("student_name, roll_number, phone_number, section, college_email, created_at, subjects(subject_code, subject_name)")
      .eq("roll_number", studentReg)
      .single();

    if (data) {
      existingRegistration = {
        ...data,
        subjects: Array.isArray(data.subjects) ? data.subjects[0] : data.subjects
      } as any;
    }
  }

  return (
    <main className="relative min-h-dvh flex flex-col overflow-x-hidden print:bg-white print:text-black">
      <div className="print-hidden">
        <BackgroundEffects />
      </div>

      {/* College Header Banner */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#070d1a]/80 backdrop-blur-xl print-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <Image
                  src="/svce-logo.png"
                  alt="SVCE Logo"
                  width={80}
                  height={32}
                  className="h-8 sm:h-10 w-auto object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  Sri Venkateswara College of Engineering
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">
                  VAC Registration Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {studentName && (
                <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">
                  👋 {studentName}
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-blue-400 border border-blue-500/20 rounded-full px-2 sm:px-3 py-1 bg-blue-500/10 font-semibold hidden sm:inline">
                ECE
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 border border-white/10 rounded-full px-2 sm:px-3 py-1 bg-white/5">
                AY 2026–2027
              </span>
              <a
                href="/admin"
                className="text-[10px] sm:text-xs text-slate-600 hover:text-blue-400 transition border border-white/8 rounded-full px-2 sm:px-3 py-1 bg-white/[0.03] hover:bg-blue-500/10"
              >
                Admin
              </a>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 print:p-0">
        <div className="w-full max-w-2xl print:max-w-none">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] print-hidden"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/8 bg-[#0f1729]/90 shadow-2xl shadow-black/50 glow-blue backdrop-blur-xl overflow-hidden print:border-none print:shadow-none print:bg-white print:overflow-visible">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent print-hidden" />
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none print-hidden" />
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl pointer-events-none print-hidden" />
            <div className="relative p-5 sm:p-8 lg:p-10 print:p-8">
              {existingRegistration ? (
                <AlreadyRegistered data={existingRegistration} />
              ) : (
                <RegistrationForm />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function BackgroundEffects() {
  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 60%), #070d1a",
        }}
      />
      <div className="bg-particles" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${(i * 8.33) % 100}%`,
              animationDuration: `${12 + (i * 3) % 15}s`,
              animationDelay: `${(i * 2.5) % 12}s`,
              width: i % 3 === 0 ? "3px" : "2px",
              height: i % 3 === 0 ? "3px" : "2px",
              opacity: 0.3 + (i % 4) * 0.1,
            }}
          />
        ))}
      </div>
    </>
  );
}
