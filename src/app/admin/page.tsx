"use client";

import { useState, useEffect, useCallback } from "react";

interface SubjectInfo {
  subject_code: string;
  subject_name: string;
  filled_seats?: number;
  max_seats?: number;
}

interface Registration {
  id: string;
  student_name: string;
  roll_number: string;
  phone_number: string;
  section: string;
  college_email: string;
  registered_at: string;
  is_allotted?: boolean;
  pe2_p1?: SubjectInfo | null;
  pe2_p2?: SubjectInfo | null;
  pe2_p3?: SubjectInfo | null;
  pe3_p1?: SubjectInfo | null;
  pe3_p2?: SubjectInfo | null;
  pe3_p3?: SubjectInfo | null;
  pe2_allotted?: SubjectInfo | null;
  pe3_allotted?: SubjectInfo | null;
  pe2_subject?: SubjectInfo | null;
  pe3_subject?: SubjectInfo | null;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [allotting, setAllotting] = useState(false);
  const [toggling, setToggling] = useState(false);
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
      setResultsPublished(Boolean(json.results_published));
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
      setResultsPublished(Boolean(json.results_published));
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
      a.download = `VAC_Registrations_Priorities_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleRunAllotment = async () => {
    if (!confirm("Run First-Come, First-Served (FCFS) Auto-Allotment algorithm for all registered students?")) {
      return;
    }

    setAllotting(true);
    try {
      const res = await fetch("/api/admin/allotment", {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success || (json.data && json.data.success === false)) {
        const err = json.error || json.data?.message || "Unknown error";
        alert(`Allotment Failed: ${err}`);
      } else {
        const count = json.data?.total_allotted ?? 0;
        alert(`FCFS Auto-Allotment Completed Successfully!\nTotal Students Allotted: ${count}`);
        fetchData(credentials);
      }
    } catch {
      alert("Error executing allotment algorithm.");
    } finally {
      setAllotting(false);
    }
  };

  const handleToggleResults = async (newStatus: boolean) => {
    const actionStr = newStatus ? "PUBLISH results to student login" : "HIDE results from student login";
    if (!confirm(`Are you sure you want to ${actionStr}?`)) {
      return;
    }

    setToggling(true);
    try {
      const res = await fetch("/api/admin/toggle-results", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert("Failed to update results status.");
      } else {
        setResultsPublished(Boolean(json.results_published));
        alert(newStatus ? "Results are now LIVE for all student logins!" : "Results are now HIDDEN from student logins.");
      }
    } catch {
      alert("Error toggling results status.");
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (authed && credentials) {
      const interval = setInterval(() => fetchData(credentials), 30000);
      return () => clearInterval(interval);
    }
  }, [authed, credentials, fetchData]);

  // Unique subject codes
  const subjectMap = new Map<string, string>();
  registrations.forEach((r) => {
    if (r.pe2_p1) subjectMap.set(r.pe2_p1.subject_code, r.pe2_p1.subject_name);
    if (r.pe3_p1) subjectMap.set(r.pe3_p1.subject_code, r.pe3_p1.subject_name);
  });
  const subjects = Array.from(subjectMap.entries());

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
      filterSubject === "all" ||
      r.pe2_p1?.subject_code === filterSubject ||
      r.pe3_p1?.subject_code === filterSubject ||
      r.pe2_allotted?.subject_code === filterSubject ||
      r.pe3_allotted?.subject_code === filterSubject;
    return matchSearch && matchSubject;
  });

  const totalSeats = 48;
  const allottedCount = registrations.filter((r) => r.is_allotted).length;

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#070d1a] relative overflow-hidden">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 60%), #070d1a",
          }}
        />
        <div className="w-full max-w-md p-8 relative z-10 bg-[#0f1729]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              Admin Portal
            </span>
            <h1 className="text-2xl font-bold text-white mt-3 mb-1">ECE Department</h1>
            <p className="text-xs text-slate-400">Sign in to manage registrations & FCFS allotment</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition text-sm shadow-lg shadow-blue-500/25"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#070d1a] text-slate-100 relative overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 60%), #070d1a",
        }}
      />

      {/* Admin Navbar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070d1a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-tight">ECE Elective Portal</h1>
            <span className="hidden sm:inline text-xs text-slate-500 border border-white/10 rounded-full px-2 py-0.5 bg-white/5">
              Admin Control Panel
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(credentials)}
              disabled={dataLoading}
              className="text-xs text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition flex items-center gap-1.5"
            >
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/30 rounded-lg px-4 py-1.5 transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-60"
            >
              {exporting ? "Exporting…" : "Download Excel"}
            </button>
            <button
              onClick={() => { setAuthed(false); setCredentials(""); setRegistrations([]); }}
              className="text-xs text-slate-500 hover:text-red-400 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Allotment & Results Toggle Control Bar */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-white">FCFS Allotment Engine & Results Release</span>
              {resultsPublished ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 animate-pulse">
                  ● RESULTS LIVE
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  ● RESULTS HIDDEN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Run the FCFS algorithm to determine student course allotment based on submission timestamps. Toggling results will publish or hide the final allotted subjects on student logins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleRunAllotment}
              disabled={allotting}
              className="h-11 px-5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/30 shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
            >
              {allotting ? "Processing Allotment…" : "⚡ Run FCFS Auto-Allotment"}
            </button>

            {resultsPublished ? (
              <button
                onClick={() => handleToggleResults(false)}
                disabled={toggling}
                className="h-11 px-5 rounded-xl font-semibold text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-2"
              >
                🔒 Hide Results from Students
              </button>
            ) : (
              <button
                onClick={() => handleToggleResults(true)}
                disabled={toggling}
                className="h-11 px-5 rounded-xl font-semibold text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center gap-2"
              >
                🚀 Approve & Publish Results
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Registered"
            value={registrations.length}
            icon="👥"
            color="blue"
          />
          <StatCard
            label="Allotted Students"
            value={allottedCount}
            sub={`/ ${registrations.length}`}
            icon="⚡"
            color={allottedCount === registrations.length && registrations.length > 0 ? "emerald" : "amber"}
          />
          <StatCard
            label="Results Status"
            value={resultsPublished ? 1 : 0}
            sub={resultsPublished ? "Live on Login" : "Hidden from Login"}
            icon="📢"
            color={resultsPublished ? "emerald" : "amber"}
          />
          <StatCard
            label="Subject Max Seats"
            value={totalSeats}
            sub="Per Subject"
            icon="📚"
            color="blue"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/8 bg-[#0f1729]/90 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Student Priority Registrations</h2>
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
            </div>
          </div>

          <div className="overflow-x-auto">
            {dataLoading ? (
              <div className="py-20 text-center text-slate-500 text-sm">Loading data…</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">No registrations found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["#", "Student Name", "Reg. No", "Sec", "PE-II Priorities (P1 / P2 / P3)", "PE-III Priorities (P1 / P2 / P3)", "Allotted PE-II", "Allotted PE-III", "Submitted At"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg, idx) => {
                    const pe2Allotted = reg.pe2_allotted || reg.pe2_subject;
                    const pe3Allotted = reg.pe3_allotted || reg.pe3_subject;

                    return (
                      <tr
                        key={reg.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{reg.student_name}</td>
                        <td className="px-4 py-3 font-mono text-blue-400 text-xs whitespace-nowrap">{reg.roll_number}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{reg.section}</td>

                        {/* PE2 Priorities */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <div className="flex gap-1.5">
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono" title={reg.pe2_p1?.subject_name}>
                              P1: {reg.pe2_p1?.subject_code ?? "—"}
                            </span>
                            <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded font-mono" title={reg.pe2_p2?.subject_name}>
                              P2: {reg.pe2_p2?.subject_code ?? "—"}
                            </span>
                            <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded font-mono" title={reg.pe2_p3?.subject_name}>
                              P3: {reg.pe2_p3?.subject_code ?? "—"}
                            </span>
                          </div>
                        </td>

                        {/* PE3 Priorities */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <div className="flex gap-1.5">
                            <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono" title={reg.pe3_p1?.subject_name}>
                              P1: {reg.pe3_p1?.subject_code ?? "—"}
                            </span>
                            <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded font-mono" title={reg.pe3_p2?.subject_name}>
                              P2: {reg.pe3_p2?.subject_code ?? "—"}
                            </span>
                            <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded font-mono" title={reg.pe3_p3?.subject_name}>
                              P3: {reg.pe3_p3?.subject_code ?? "—"}
                            </span>
                          </div>
                        </td>

                        {/* Allotted PE2 */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          {pe2Allotted ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono font-semibold">
                              {pe2Allotted.subject_code}
                            </span>
                          ) : (
                            <span className="text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">Pending</span>
                          )}
                        </td>

                        {/* Allotted PE3 */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          {pe3Allotted ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono font-semibold">
                              {pe3Allotted.subject_code}
                            </span>
                          ) : (
                            <span className="text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">Pending</span>
                          )}
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
                    );
                  })}
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
