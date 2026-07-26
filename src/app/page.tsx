import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import RegistrationForm from "@/components/RegistrationForm";
import AlreadyRegistered from "@/components/AlreadyRegistered";
import LogoutButton from "@/components/LogoutButton";
import Header from "@/components/Header";
import SessionTimeoutBanner from "@/components/SessionTimeoutBanner";
import { getRegistrationByRoll } from "@/lib/registration-data";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function HomePage() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-8 max-w-2xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">CRITICAL ERROR: MISSING VERCEL KEY</h1>
          <p className="text-white text-lg mb-4">
            The <strong>SUPABASE_SERVICE_ROLE_KEY</strong> is missing from your Vercel Environment Variables.
          </p>
          <p className="text-slate-300 mb-6 text-left">
            Because this key is missing, the server is completely blocked from checking if a user is already registered, which is why it accidentally shows the form again instead of the receipt screen.
          </p>
          <div className="bg-slate-900 p-4 rounded text-left font-mono text-sm text-green-400">
            1. Go to Supabase Dashboard -&gt; Settings -&gt; API.<br/>
            2. Copy the "service_role (secret)" key.<br/>
            3. Go to Vercel Dashboard -&gt; Settings -&gt; Environment Variables.<br/>
            4. Add Key: SUPABASE_SERVICE_ROLE_KEY<br/>
            5. Add Value: (paste the secret key)<br/>
            6. Redeploy the project on Vercel.<br/>
          </div>
        </div>
      </div>
    );
  }

  // ── Validate session ───────────────────────────────────────
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("vac_session")?.value;

  if (!sessionCookie) redirect("/login");

  let studentName = "";
  let studentReg = "";
  let sessionExpiresAt: number | null = null;
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
    sessionExpiresAt = typeof session.expires_at === "number" ? session.expires_at : null;
  } catch {
    redirect("/login");
  }

  // ── Check if already registered ────────────────────────────
  let existingRegistration = null;
  if (studentReg) {
    existingRegistration = await getRegistrationByRoll(studentReg);
    if (!existingRegistration) {
      const fallbackReg = studentReg.replace(/^2127240701/, "");
      if (fallbackReg !== studentReg) {
        existingRegistration = await getRegistrationByRoll(fallbackReg);
      }
    }
  }

  return (
    <main className="relative min-h-dvh flex flex-col overflow-x-hidden print:bg-white print:text-black">
      <div className="print-hidden">
        <BackgroundEffects />
      </div>

      <Header studentName={studentName} showAdmin={true} />

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
              <SessionTimeoutBanner expiresAt={sessionExpiresAt} />
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
