"use client";

import { useState, useEffect, useCallback } from "react";

interface SubjectInfo {
  subject_code: string;
  subject_name: string;
  filled_seats?: number;
  max_seats?: number;
}

interface SubjectStat {
  id: string;
  subject_code: string;
  subject_name: string;
  elective_group: "PE2" | "PE3";
  max_seats: number;
  filled_seats: number;
  status: string;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  allotted_count: number;
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
  nptel_pe2_course?: string;
  nptel_pe3_course?: string;
  pe2_p1_id?: string;
  pe2_p2_id?: string;
  pe2_p3_id?: string;
  pe3_p1_id?: string;
  pe3_p2_id?: string;
  pe3_p3_id?: string;
  pe2_allotted_id?: string;
  pe3_allotted_id?: string;
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
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking session
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard Data
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "users">("overview");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterChoiceType, setFilterChoiceType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Selected Student for Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<Registration | null>(null);

  // Action States
  const [exporting, setExporting] = useState(false);
  const [allotting, setAllotting] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Reset Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  // 1. Fetch Session on mount
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session");
      if (res.ok) {
        const json = await res.json();
        if (json.authed) {
          setAuthed(true);
          fetchData();
          return;
        }
      }
      setAuthed(false);
    } catch {
      setAuthed(false);
    }
  }, []);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const res = await fetch("/api/admin/registrations");
      if (res.ok) {
        const json = await res.json();
        setRegistrations(json.registrations || []);
        setSubjectStats(json.subject_stats || []);
        setResultsPublished(Boolean(json.results_published));
      } else if (res.status === 401) {
        setAuthed(false);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (authed) {
      const interval = setInterval(() => {
        fetchData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setAuthed(true);
        fetchData();
      } else {
        setLoginError(json.message || "Invalid credentials.");
      }
    } catch {
      setLoginError("Failed to connect to server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthed(false);
      setRegistrations([]);
      setSubjectStats([]);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ECE_Elective_Master_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleRunAllotment = async () => {
    if (
      !confirm(
        "Run First-Come, First-Served (FCFS) Auto-Allotment algorithm for all registered students?"
      )
    ) {
      return;
    }

    setAllotting(true);
    try {
      const res = await fetch("/api/admin/allotment", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success || (json.data && json.data.success === false)) {
        const err = json.error || json.data?.message || "Unknown error";
        alert(`Allotment Failed: ${err}`);
      } else {
        const count = json.data?.total_allotted ?? 0;
        alert(`FCFS Auto-Allotment Completed Successfully!\nTotal Students Allotted: ${count}`);
        fetchData();
      }
    } catch {
      alert("Error executing allotment algorithm.");
    } finally {
      setAllotting(false);
    }
  };

  const handleToggleResults = async (newStatus: boolean) => {
    const actionStr = newStatus
      ? "PUBLISH results to student login"
      : "HIDE results from student login";
    if (!confirm(`Are you sure you want to ${actionStr}?`)) {
      return;
    }

    setToggling(true);
    try {
      const res = await fetch("/api/admin/toggle-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert("Failed to update results status.");
      } else {
        setResultsPublished(Boolean(json.results_published));
        alert(
          newStatus
            ? "Results are now LIVE for all student logins!"
            : "Results are now HIDDEN from student logins."
        );
      }
    } catch {
      alert("Error toggling results status.");
    } finally {
      setToggling(false);
    }
  };

  const handleResetData = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setResetError("");

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_password: resetConfirmPassword }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        alert(
          "SUCCESS: Test log entries have been wiped clean!\nThe portal is now fresh and ready for production."
        );
        setShowResetModal(false);
        setResetConfirmPassword("");
        fetchData();
      } else {
        setResetError(json.message || "Reset failed. Please check password.");
      }
    } catch {
      setResetError("Unexpected error during reset.");
    } finally {
      setResetting(false);
    }
  };

  // Filtering registrations logic
  const filteredRegistrations = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.student_name.toLowerCase().includes(q) ||
      r.roll_number.toLowerCase().includes(q) ||
      (r.phone_number ?? "").toLowerCase().includes(q) ||
      r.section.toLowerCase().includes(q) ||
      r.college_email.toLowerCase().includes(q);

    const matchSection = filterSection === "all" || r.section.toUpperCase() === filterSection.toUpperCase();

    const pe2AllottedCode = r.pe2_allotted?.subject_code || r.pe2_subject?.subject_code;
    const pe3AllottedCode = r.pe3_allotted?.subject_code || r.pe3_subject?.subject_code;

    const matchSubject =
      filterSubject === "all" ||
      r.pe2_p1_id === filterSubject ||
      r.pe2_p2_id === filterSubject ||
      r.pe2_p3_id === filterSubject ||
      r.pe3_p1_id === filterSubject ||
      r.pe3_p2_id === filterSubject ||
      r.pe3_p3_id === filterSubject ||
      r.pe2_p1?.subject_code === filterSubject ||
      r.pe2_p2?.subject_code === filterSubject ||
      r.pe2_p3?.subject_code === filterSubject ||
      r.pe3_p1?.subject_code === filterSubject ||
      r.pe3_p2?.subject_code === filterSubject ||
      r.pe3_p3?.subject_code === filterSubject ||
      pe2AllottedCode === filterSubject ||
      pe3AllottedCode === filterSubject;

    const hasNptel = Boolean(r.nptel_pe2_course?.trim() || r.nptel_pe3_course?.trim());
    const matchChoiceType =
      filterChoiceType === "all" ||
      (filterChoiceType === "nptel" && hasNptel) ||
      (filterChoiceType === "standard" && !hasNptel);

    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "allotted" && r.is_allotted) ||
      (filterStatus === "pending" && !r.is_allotted);

    return matchSearch && matchSection && matchSubject && matchChoiceType && matchStatus;
  });

  // Calculate quick stats
  const totalRegistered = registrations.length;
  const totalAllotted = registrations.filter((r) => r.is_allotted).length;
  const nptelCount = registrations.filter(
    (r) => r.nptel_pe2_course?.trim() || r.nptel_pe3_course?.trim()
  ).length;

  const secA = registrations.filter((r) => r.section.toUpperCase() === "A").length;
  const secB = registrations.filter((r) => r.section.toUpperCase() === "B").length;
  const secC = registrations.filter((r) => r.section.toUpperCase() === "C").length;

  // Group subject stats into PE2 and PE3
  const pe2SubjectStats = subjectStats.filter((s) => s.elective_group === "PE2");
  const pe3SubjectStats = subjectStats.filter((s) => s.elective_group === "PE3");

  // Loading Session Screen
  if (authed === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#070d1a] text-slate-400 text-sm">
        Verifying admin session…
      </div>
    );
  }

  // Admin Login Screen
  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#070d1a] relative overflow-hidden px-4">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.15) 0%, transparent 60%), #070d1a",
          }}
        />
        <div className="w-full max-w-md p-8 relative z-10 bg-[#0f1729]/95 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              SVCE ECE Department
            </span>
            <h1 className="text-2xl font-bold text-white mt-3 mb-1 tracking-tight">
              Admin Portal Login
            </h1>
            <p className="text-xs text-slate-400">
              Sign in to manage registrations, view subject analytics & FCFS allotment
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter admin username"
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder-slate-600 transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter admin password"
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder-slate-600 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition text-sm shadow-lg shadow-blue-500/25 disabled:opacity-60"
            >
              {loginLoading ? "Authenticating…" : "Sign In to Control Panel"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[11px] text-slate-500">
              SVCE ECE Elective Portal &copy; AY 2026-2027
            </span>
          </div>
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
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070d1a]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
              ECE
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                ECE Elective Admin Portal
              </h1>
              <span className="text-[10px] text-slate-400">Sri Venkateswara College of Engineering</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={fetchData}
              disabled={dataLoading}
              className="text-xs text-slate-300 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition flex items-center gap-1.5"
            >
              {dataLoading ? "Refreshing…" : "🔄 Refresh"}
            </button>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/30 rounded-lg px-3.5 py-1.5 transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-60"
            >
              {exporting ? "Preparing Excel…" : "📊 Download Excel"}
            </button>

            <button
              onClick={() => setShowResetModal(true)}
              className="text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg px-3 py-1.5 transition"
              title="Clean test data for production"
            >
              ⚠️ Reset Test Log
            </button>

            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-lg px-3 py-1.5 bg-white/[0.02] hover:bg-red-500/10 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-white/5 space-x-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            📈 Overview & FCFS Controls
          </button>
          <button
            onClick={() => setActiveTab("subjects")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "subjects"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🎯 Subject Priorities Dashboard ({subjectStats.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "users"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            👥 Individual Student Records ({registrations.length})
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & FCFS CONTROL PANEL                          */}
        {/* ============================================================ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Registered Students"
                value={totalRegistered}
                sub={`Sec A: ${secA} | Sec B: ${secB} | Sec C: ${secC}`}
                icon="👥"
                color="blue"
              />
              <StatCard
                label="FCFS Allotted Students"
                value={totalAllotted}
                sub={`/ ${totalRegistered} Total`}
                icon="⚡"
                color={totalAllotted === totalRegistered && totalRegistered > 0 ? "emerald" : "amber"}
              />
              <StatCard
                label="NPTEL Course Replacements"
                value={nptelCount}
                sub="Exempted from standard PE choices"
                icon="🎓"
                color="purple"
              />
              <StatCard
                label="Results Release Status"
                value={resultsPublished ? 1 : 0}
                sub={resultsPublished ? "● LIVE ON STUDENT LOGIN" : "● HIDDEN FROM STUDENTS"}
                icon="📢"
                color={resultsPublished ? "emerald" : "amber"}
              />
            </div>

            {/* FCFS Engine & Results Release Banner */}
            <div className="rounded-3xl border border-blue-500/20 bg-[#0e172a]/90 p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-2xl backdrop-blur-xl">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">FCFS Allotment Engine & Student Results</h2>
                  {resultsPublished ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-pulse">
                      ● RESULTS LIVE ON LOGIN
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      ● RESULTS HIDDEN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The First-Come, First-Served (FCFS) algorithm evaluates student submission timestamps down to the second.
                  Running allotment assigns course seats based on Priority 1, Priority 2, and Priority 3 choices within the 60-seat cap per subject.
                  Toggling results will make the final allotted courses visible or hidden on the student login portal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={handleRunAllotment}
                  disabled={allotting}
                  className="h-12 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 border border-blue-400/40 shadow-xl shadow-blue-500/25 transition flex items-center gap-2 disabled:opacity-60"
                >
                  {allotting ? "Processing Allotment…" : "⚡ Run FCFS Auto-Allotment"}
                </button>

                {resultsPublished ? (
                  <button
                    onClick={() => handleToggleResults(false)}
                    disabled={toggling}
                    className="h-12 px-6 rounded-xl font-bold text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 transition flex items-center gap-2"
                  >
                    🔒 Hide Results from Students
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleResults(true)}
                    disabled={toggling}
                    className="h-12 px-6 rounded-xl font-bold text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 transition flex items-center gap-2"
                  >
                    🚀 Approve & Publish Results
                  </button>
                )}
              </div>
            </div>

            {/* Quick Summary of Priority Demand */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PE-II Summary */}
              <div className="rounded-2xl border border-white/10 bg-[#0f1729]/90 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    PE-II Elective Overview
                  </h3>
                  <button
                    onClick={() => setActiveTab("subjects")}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    View Details →
                  </button>
                </div>
                <div className="space-y-3">
                  {pe2SubjectStats.map((stat) => (
                    <div
                      key={stat.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            {stat.subject_code}
                          </span>
                          <span className="text-xs text-slate-200 font-medium truncate max-w-[200px]">
                            {stat.subject_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="text-blue-300 font-mono">P1: {stat.p1_count}</span>
                          <span>|</span>
                          <span className="text-slate-400 font-mono">P2: {stat.p2_count}</span>
                          <span>|</span>
                          <span className="text-slate-400 font-mono">P3: {stat.p3_count}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white block">
                          {stat.allotted_count} / {stat.max_seats}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            stat.status === "full"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {stat.status === "full" ? "FULL" : "OPEN"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PE-III Summary */}
              <div className="rounded-2xl border border-white/10 bg-[#0f1729]/90 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    PE-III Elective Overview
                  </h3>
                  <button
                    onClick={() => setActiveTab("subjects")}
                    className="text-xs text-purple-400 hover:underline"
                  >
                    View Details →
                  </button>
                </div>
                <div className="space-y-3">
                  {pe3SubjectStats.map((stat) => (
                    <div
                      key={stat.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-purple-400">
                            {stat.subject_code}
                          </span>
                          <span className="text-xs text-slate-200 font-medium truncate max-w-[200px]">
                            {stat.subject_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="text-purple-300 font-mono">P1: {stat.p1_count}</span>
                          <span>|</span>
                          <span className="text-slate-400 font-mono">P2: {stat.p2_count}</span>
                          <span>|</span>
                          <span className="text-slate-400 font-mono">P3: {stat.p3_count}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white block">
                          {stat.allotted_count} / {stat.max_seats}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            stat.status === "full"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {stat.status === "full" ? "FULL" : "OPEN"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SUBJECT PRIORITIES BREAKDOWN DASHBOARD                 */}
        {/* ============================================================ */}
        {activeTab === "subjects" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Subject Priority Analytics Dashboard
                </h2>
                <p className="text-xs text-slate-400">
                  Comprehensive breakdown of Priority 1 (P1), Priority 2 (P2), Priority 3 (P3) demands and allotted seats per course
                </p>
              </div>
            </div>

            {/* PE-II Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold text-xs">
                  PE-II
                </span>
                <h3 className="text-sm font-bold text-white">Professional Elective II Courses</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pe2SubjectStats.map((stat) => (
                  <SubjectPriorityCard
                    key={stat.id}
                    stat={stat}
                    onSelectSubject={(code) => {
                      setFilterSubject(code);
                      setActiveTab("users");
                    }}
                  />
                ))}
              </div>
            </div>

            {/* PE-III Section */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="px-2.5 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs">
                  PE-III
                </span>
                <h3 className="text-sm font-bold text-white">Professional Elective III Courses</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pe3SubjectStats.map((stat) => (
                  <SubjectPriorityCard
                    key={stat.id}
                    stat={stat}
                    onSelectSubject={(code) => {
                      setFilterSubject(code);
                      setActiveTab("users");
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INDIVIDUAL STUDENT RECORDS & TABLE                     */}
        {/* ============================================================ */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="rounded-2xl border border-white/10 bg-[#0f1729]/90 p-5 space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by student name, roll number, email, phone number…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500/60 transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Section Filter */}
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60 transition"
                  >
                    <option value="all" className="bg-[#0f1729]">All Sections</option>
                    <option value="A" className="bg-[#0f1729]">Section A</option>
                    <option value="B" className="bg-[#0f1729]">Section B</option>
                    <option value="C" className="bg-[#0f1729]">Section C</option>
                  </select>

                  {/* Subject Filter */}
                  <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60 transition max-w-[180px]"
                  >
                    <option value="all" className="bg-[#0f1729]">All Subjects</option>
                    {subjectStats.map((s) => (
                      <option key={s.id} value={s.subject_code} className="bg-[#0f1729]">
                        {s.subject_code} - {s.subject_name.slice(0, 24)}…
                      </option>
                    ))}
                  </select>

                  {/* Choice Type Filter */}
                  <select
                    value={filterChoiceType}
                    onChange={(e) => setFilterChoiceType(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60 transition"
                  >
                    <option value="all" className="bg-[#0f1729]">All Choice Modes</option>
                    <option value="standard" className="bg-[#0f1729]">Standard Elective</option>
                    <option value="nptel" className="bg-[#0f1729]">NPTEL Replacement</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60 transition"
                  >
                    <option value="all" className="bg-[#0f1729]">All Statuses</option>
                    <option value="allotted" className="bg-[#0f1729]">Allotted</option>
                    <option value="pending" className="bg-[#0f1729]">Pending Allotment</option>
                  </select>

                  {(filterSection !== "all" ||
                    filterSubject !== "all" ||
                    filterChoiceType !== "all" ||
                    filterStatus !== "all" ||
                    search !== "") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilterSection("all");
                        setFilterSubject("all");
                        setFilterChoiceType("all");
                        setFilterStatus("all");
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 underline"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>
                  Showing <strong className="text-white">{filteredRegistrations.length}</strong> of{" "}
                  <strong className="text-white">{registrations.length}</strong> registered students
                </span>
                {filterSubject !== "all" && (
                  <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Filtered for Subject: <strong>{filterSubject}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Individual Records Table */}
            <div className="rounded-2xl border border-white/10 bg-[#0f1729]/90 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                {dataLoading ? (
                  <div className="py-24 text-center text-slate-400 text-sm">
                    Loading student records…
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div className="py-24 text-center text-slate-400 text-sm space-y-2">
                    <p className="text-base font-semibold text-white">No student records found.</p>
                    <p className="text-xs text-slate-500">
                      Try adjusting your search query or reset filter options.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        {[
                          "#",
                          "Student Name",
                          "Reg. No",
                          "Sec",
                          "Phone & Email",
                          "PE-II Choices (P1 / P2 / P3)",
                          "PE-III Choices (P1 / P2 / P3)",
                          "Allotted PE-II",
                          "Allotted PE-III",
                          "Submission Log (IST)",
                          "Action",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3.5 text-xs font-semibold text-slate-400 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRegistrations.map((reg, idx) => {
                        const pe2Allotted = reg.pe2_allotted || reg.pe2_subject;
                        const pe3Allotted = reg.pe3_allotted || reg.pe3_subject;

                        const pe2Nptel = reg.nptel_pe2_course?.trim();
                        const pe3Nptel = reg.nptel_pe3_course?.trim();

                        return (
                          <tr
                            key={reg.id}
                            className="hover:bg-white/[0.04] transition-colors group"
                          >
                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                              {idx + 1}
                            </td>

                            {/* Name */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-semibold text-white block">
                                {reg.student_name}
                              </span>
                            </td>

                            {/* Reg No */}
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-blue-400 text-xs font-medium">
                              {reg.roll_number}
                            </td>

                            {/* Section */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                                {reg.section}
                              </span>
                            </td>

                            {/* Phone & Email */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <div className="font-mono text-slate-300">{reg.phone_number}</div>
                              <div className="text-slate-500 text-[11px] truncate max-w-[160px]">
                                {reg.college_email}
                              </div>
                            </td>

                            {/* PE-II Choices */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {pe2Nptel ? (
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono text-[11px]">
                                  🎓 NPTEL: {pe2Nptel.slice(0, 20)}…
                                </span>
                              ) : (
                                <div className="flex gap-1">
                                  <span
                                    className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono text-[11px]"
                                    title={reg.pe2_p1?.subject_name}
                                  >
                                    P1: {reg.pe2_p1?.subject_code ?? "—"}
                                  </span>
                                  <span
                                    className="bg-white/5 text-slate-400 px-1.5 py-0.5 rounded font-mono text-[11px]"
                                    title={reg.pe2_p2?.subject_name}
                                  >
                                    P2: {reg.pe2_p2?.subject_code ?? "—"}
                                  </span>
                                  <span
                                    className="bg-white/5 text-slate-400 px-1.5 py-0.5 rounded font-mono text-[11px]"
                                    title={reg.pe2_p3?.subject_name}
                                  >
                                    P3: {reg.pe2_p3?.subject_code ?? "—"}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* PE-III Choices */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {pe3Nptel ? (
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono text-[11px]">
                                  🎓 NPTEL: {pe3Nptel.slice(0, 20)}…
                                </span>
                              ) : (
                                <div className="flex gap-1">
                                  <span
                                    className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono text-[11px]"
                                    title={reg.pe3_p1?.subject_name}
                                  >
                                    P1: {reg.pe3_p1?.subject_code ?? "—"}
                                  </span>
                                  <span
                                    className="bg-white/5 text-slate-400 px-1.5 py-0.5 rounded font-mono text-[11px]"
                                    title={reg.pe3_p2?.subject_name}
                                  >
                                    P2: {reg.pe3_p2?.subject_code ?? "—"}
                                  </span>
                                  <span
                                    className="bg-white/5 text-slate-400 px-1.5 py-0.5 rounded font-mono text-[11px]"
                                    title={reg.pe3_p3?.subject_name}
                                  >
                                    P3: {reg.pe3_p3?.subject_code ?? "—"}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Allotted PE2 */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {pe2Nptel ? (
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-md font-mono text-[11px]">
                                  NPTEL
                                </span>
                              ) : pe2Allotted ? (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono font-semibold text-[11px]">
                                  {pe2Allotted.subject_code}
                                </span>
                              ) : (
                                <span className="text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* Allotted PE3 */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              {pe3Nptel ? (
                                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-md font-mono text-[11px]">
                                  NPTEL
                                </span>
                              ) : pe3Allotted ? (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono font-semibold text-[11px]">
                                  {pe3Allotted.subject_code}
                                </span>
                              ) : (
                                <span className="text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* Log Timestamp */}
                            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap font-mono">
                              {reg.registered_at
                                ? new Date(reg.registered_at).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "—"}
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3 whitespace-nowrap text-xs">
                              <button
                                onClick={() => setSelectedStudent(reg)}
                                className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg px-2.5 py-1 transition"
                              >
                                View Data
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* INDIVIDUAL STUDENT DETAIL MODAL                                */}
      {/* ============================================================ */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0f1729] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-0.5">
                  Student Record Details
                </span>
                <h3 className="text-xl font-bold text-white mt-2">
                  {selectedStudent.student_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Reg No: {selectedStudent.roll_number} | Section {selectedStudent.section}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Submission Log Timestamp */}
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Exact Form Submission Timestamp (IST)</span>
                <span className="text-sm font-mono font-bold text-blue-300">
                  {selectedStudent.registered_at
                    ? new Date(selectedStudent.registered_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        weekday: "short",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })
                    : "—"}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                Verified Log
              </span>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-slate-400 block">Phone Number</span>
                <span className="text-xs font-mono font-semibold text-white">
                  {selectedStudent.phone_number || "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[11px] text-slate-400 block">College Email</span>
                <span className="text-xs font-mono font-semibold text-white truncate block">
                  {selectedStudent.college_email || "—"}
                </span>
              </div>
            </div>

            {/* Elective Choices Detail */}
            <div className="space-y-4">
              {/* PE-II Choices */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">Professional Elective II (PE-II)</span>
                  {selectedStudent.nptel_pe2_course?.trim() ? (
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded">
                      NPTEL Course Replacement
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">Standard Choices</span>
                  )}
                </div>

                {selectedStudent.nptel_pe2_course?.trim() ? (
                  <div className="text-xs text-slate-200 bg-white/5 p-3 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">NPTEL Course Title:</span>
                    <strong className="text-purple-300 font-mono">
                      {selectedStudent.nptel_pe2_course}
                    </strong>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                      <span className="text-[10px] text-blue-300 font-bold block">Priority 1</span>
                      <span className="text-xs font-mono font-bold text-white block mt-0.5">
                        {selectedStudent.pe2_p1?.subject_code || "—"}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {selectedStudent.pe2_p1?.subject_name}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Priority 2</span>
                      <span className="text-xs font-mono font-bold text-slate-200 block mt-0.5">
                        {selectedStudent.pe2_p2?.subject_code || "—"}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {selectedStudent.pe2_p2?.subject_name}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Priority 3</span>
                      <span className="text-xs font-mono font-bold text-slate-200 block mt-0.5">
                        {selectedStudent.pe2_p3?.subject_code || "—"}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {selectedStudent.pe2_p3?.subject_name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* PE-III Choices */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">Professional Elective III (PE-III)</span>
                  {selectedStudent.nptel_pe3_course?.trim() ? (
                    <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded">
                      NPTEL Course Replacement
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">Standard Choices</span>
                  )}
                </div>

                {selectedStudent.nptel_pe3_course?.trim() ? (
                  <div className="text-xs text-slate-200 bg-white/5 p-3 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">NPTEL Course Title:</span>
                    <strong className="text-purple-300 font-mono">
                      {selectedStudent.nptel_pe3_course}
                    </strong>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                      <span className="text-[10px] text-purple-300 font-bold block">Priority 1</span>
                      <span className="text-xs font-mono font-bold text-white block mt-0.5">
                        {selectedStudent.pe3_p1?.subject_code || "—"}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {selectedStudent.pe3_p1?.subject_name}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Priority 2</span>
                      <span className="text-xs font-mono font-bold text-slate-200 block mt-0.5">
                        {selectedStudent.pe3_p2?.subject_code || "—"}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {selectedStudent.pe3_p2?.subject_name}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">Priority 3</span>
                      <span className="text-xs font-mono font-bold text-slate-200 block mt-0.5">
                        {selectedStudent.pe3_p3?.subject_code || "—"}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {selectedStudent.pe3_p3?.subject_name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESET TEST DATA CONFIRMATION MODAL                            */}
      {/* ============================================================ */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f1729] border border-rose-500/30 rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="text-center space-y-2">
              <span className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl mx-auto text-rose-400">
                ⚠️
              </span>
              <h3 className="text-lg font-bold text-white">Reset Test Data for Production</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This action will delete all test registration submissions, reset subject seat counts to 0, clear active session tokens, and hide results.
              </p>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center font-medium">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetData} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Confirm Admin Password
                </label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  required
                  placeholder="Enter admin password to confirm"
                  className="w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500/60 transition"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmPassword("");
                    setResetError("");
                  }}
                  className="flex-1 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/20 disabled:opacity-60"
                >
                  {resetting ? "Resetting Data…" : "Wipe Test Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  color: "blue" | "emerald" | "amber" | "purple";
}) {
  const colors = {
    blue: "from-blue-500/15 to-blue-600/5 border-blue-500/20 text-blue-400",
    emerald: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-400",
    purple: "from-purple-500/15 to-purple-600/5 border-purple-500/20 text-purple-400",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${colors[color]} backdrop-blur-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-semibold">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold text-white">{value}</span>
      </div>
      {sub && <span className="text-[11px] text-slate-400 block mt-1">{sub}</span>}
    </div>
  );
}

function SubjectPriorityCard({
  stat,
  onSelectSubject,
}: {
  stat: SubjectStat;
  onSelectSubject: (code: string) => void;
}) {
  const filledPercent = Math.min(100, Math.round((stat.filled_seats / stat.max_seats) * 100));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1729]/90 p-5 space-y-4 hover:border-blue-500/40 transition shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs font-bold text-blue-400 block">
            {stat.subject_code}
          </span>
          <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
            {stat.subject_name}
          </h4>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
            stat.status === "full"
              ? "bg-red-500/20 border border-red-500/30 text-red-300"
              : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
          }`}
        >
          {stat.status === "full" ? "FULL" : "OPEN"}
        </span>
      </div>

      {/* Seat Capacity Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Capacity: {stat.filled_seats} / {stat.max_seats} seats</span>
          <span className="font-mono text-white font-bold">{filledPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              filledPercent >= 100
                ? "bg-red-500"
                : filledPercent >= 80
                ? "bg-amber-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${filledPercent}%` }}
          />
        </div>
      </div>

      {/* Priority Demands Breakdown */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-[10px] font-bold text-blue-300 block">Priority 1</span>
          <span className="text-base font-extrabold text-white">{stat.p1_count}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 block">Priority 2</span>
          <span className="text-base font-extrabold text-slate-200">{stat.p2_count}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[10px] font-bold text-slate-400 block">Priority 3</span>
          <span className="text-base font-extrabold text-slate-200">{stat.p3_count}</span>
        </div>
      </div>

      <button
        onClick={() => onSelectSubject(stat.subject_code)}
        className="w-full h-9 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 text-xs font-semibold text-slate-300 hover:text-blue-300 transition flex items-center justify-center gap-1"
      >
        View Students Interested ({stat.p1_count + stat.p2_count + stat.p3_count}) →
      </button>
    </div>
  );
}
