"use client";

import { useState, useEffect, useCallback } from "react";


interface SubjectInfo {
  subject_code: string;
  subject_name: string;
  filled_seats: number;
  max_seats: number;
}

interface Registration {
  id: string;
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  registered_at: string;
  subjects: SubjectInfo | null;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [credentials, setCredentials] = useState("");

  const fetchData = useCallback(async (creds: string) => {
    setDataLoading(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        headers: { Authorization: `Basic ${creds}` },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setRegistrations(json.registrations || []);
    } catch {
      setRegistrations([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    const creds = btoa(`${username}:${password}`);
    const res = await fetch("/api/admin/registrations", {
      headers: { Authorization: `Basic ${creds}` },
    });
    setLoading(false);
    if (res.ok) {
      setCredentials(creds);
      setAuthed(true);
      const json = await res.json();
      setRegistrations(json.registrations || []);
    } else {
      setLoginError("Invalid username or password.");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export", {
        headers: { Authorization: `Basic ${credentials}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VAC_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (authed && credentials) {
      const interval = setInterval(() => fetchData(credentials), 30000);
      return () => clearInterval(interval);
    }
  }, [authed, credentials, fetchData]);

  // Unique subjects for filter
  const subjects = Array.from(
    new Map(
      registrations
        .filter((r) => r.subjects)
        .map((r) => [r.subjects!.subject_code, r.subjects!.subject_name])
    ).entries()
  );

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.student_name.toLowerCase().includes(q) ||
      r.roll_number.toLowerCase().includes(q) ||
      (r.phone_number ?? "").toLowerCase().includes(q) ||
      r.section.toLowerCase().includes(q) ||
      r.college_email.toLowerCase().includes(q);
    const matchSubject =
      filterSubject === "all" || r.subjects?.subject_code === filterSubject;
    return matchSearch && matchSubject;
  });

  // Stats
  const totalSeats = registrations.reduce(
    (acc, r) => (r.subjects ? Math.max(acc, r.subjects.max_seats) : acc),
    48
  );
  const subjectStats = subjects.map(([code, name]) => {
    const count = registrations.filter(
      (r) => r.subjects?.subject_code === code
    ).length;
    return { code, name, count };
  });

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#070d1a] relative overflow-hidden">
        {/* Background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 60%), #070d1a",
          }}
        />

        <div className="relative z-10 w-full max-w-md px-4">
          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-[#0f1729]/90 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            <div className="p-8">
              {/* Header */}
              <div className="flex flex-col items-center mb-8">
                <div className="mb-4">
                  <img
                    src="/svce-logo.png"
                    alt="SVCE Logo"
                    width={120}
                    height={48}
                    className="h-12 w-auto object-contain"
                    
                  />
                </div>
                <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
                <p className="text-sm text-slate-400 mt-1">VAC Registration · ECE</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="admin-username">
                    Username
                  </label>
                  <input
                    id="admin-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition"
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="admin-password">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition"
                    placeholder="Enter password"
                    required
                  />
                </div>

                {loginError && (
                  <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                    {loginError}
                  </p>
                )}

                <button
                  id="admin-login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-2.5 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#070d1a] text-white">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -5%, rgba(59,130,246,0.10) 0%, transparent 60%), #070d1a",
        }}
      />

      {/* Navbar */}
      <header className="relative z-10 border-b border-white/5 bg-[#070d1a]/90 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/svce-logo.png"
              alt="SVCE Logo"
              width={70}
              height={28}
              className="h-7 w-auto object-contain"
              
            />
            <span className="font-bold text-sm text-white">Admin Portal</span>
            <span className="hidden sm:inline text-xs text-slate-500 border border-white/10 rounded-full px-2 py-0.5 bg-white/5">
              VAC Registration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="admin-refresh-btn"
              onClick={() => fetchData(credentials)}
              disabled={dataLoading}
              className="text-xs text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" className={`w-3.5 h-3.5 ${dataLoading ? "animate-spin" : ""}`}>
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
            <button
              id="admin-export-btn"
              onClick={handleExport}
              disabled={exporting}
              className="text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/30 rounded-lg px-4 py-1.5 transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {exporting ? "Exporting…" : "Download Excel"}
            </button>
            <button
              id="admin-logout-btn"
              onClick={() => { setAuthed(false); setCredentials(""); setRegistrations([]); }}
              className="text-xs text-slate-500 hover:text-red-400 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Registered"
            value={registrations.length}
            icon="👥"
            color="blue"
          />
          {subjectStats.map((s) => (
            <StatCard
              key={s.code}
              label={s.code}
              value={s.count}
              sub={`/ ${totalSeats} seats`}
              icon="📚"
              color={s.count >= totalSeats ? "red" : s.count >= totalSeats * 0.8 ? "amber" : "emerald"}
            />
          ))}
        </div>

        {/* Subject seat bars */}
        <div className="rounded-2xl border border-white/8 bg-[#0f1729]/90 p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Seat Occupancy</h2>
          <div className="space-y-4">
            {subjectStats.map((s) => {
              const pct = Math.min(100, Math.round((s.count / totalSeats) * 100));
              return (
                <div key={s.code}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span className="font-medium text-white truncate max-w-xs">{s.name}</span>
                    <span>{s.count}/{totalSeats} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 100
                          ? "bg-gradient-to-r from-red-500 to-red-600"
                          : pct >= 80
                          ? "bg-gradient-to-r from-amber-500 to-amber-600"
                          : "bg-gradient-to-r from-blue-500 to-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/8 bg-[#0f1729]/90 overflow-hidden">
          {/* Table Header / Filters */}
          <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Registration Records</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filtered.length} of {registrations.length} entries
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search name, reg. no, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 transition w-full sm:w-56"
              />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 text-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500/60 transition"
              >
                <option value="all">All Subjects</option>
                {subjects.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} – {name.length > 30 ? name.slice(0, 30) + "…" : name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {dataLoading ? (
              <div className="py-20 text-center text-slate-500 text-sm">Loading data…</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">No registrations found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["#", "Student Name", "Registration No.", "Phone No.", "Section", "College Email", "Subject", "Registered At"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg, idx) => (
                    <tr
                      key={reg.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-slate-600">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{reg.student_name}</td>
                      <td className="px-4 py-3 font-mono text-blue-400 text-xs whitespace-nowrap">{reg.roll_number}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{reg.phone_number ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{reg.section}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{reg.college_email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-2 py-0.5">
                          {reg.subjects?.subject_code ?? "—"}
                        </span>
                        <span className="ml-2 text-xs text-slate-500 hidden lg:inline">
                          {reg.subjects?.subject_name?.slice(0, 30)}
                          {(reg.subjects?.subject_name?.length ?? 0) > 30 ? "…" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {reg.registered_at
                          ? new Date(reg.registered_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: string;
  color: "blue" | "emerald" | "amber" | "red";
}) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
    red: "from-red-500/20 to-red-600/10 border-red-500/20 text-red-400",
  };

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 ${colors[color]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{value}</span>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}
