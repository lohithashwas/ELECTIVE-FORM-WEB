"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface PortalStatus {
  portal_enabled: boolean;
  open_time: string | null;
}

interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function useCountdown(targetTime: string | null): Countdown | null {
  const [cd, setCd] = useState<Countdown | null>(null);

  useEffect(() => {
    if (!targetTime) return;
    const tick = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) { setCd({ hours: 0, minutes: 0, seconds: 0, total: 0 }); return; }
      setCd({
        total: diff,
        hours: Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return cd;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const sessionReplaced = searchParams.get("reason") === "session_replaced";

  const [regNumber, setRegNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [portalStatus, setPortalStatus] = useState<PortalStatus | null>(null);
  const [portalChecked, setPortalChecked] = useState(false);

  const countdown = useCountdown(portalStatus?.open_time ?? null);
  const isOpen = countdown !== null && countdown.total <= 0;
  const portalEnabled = portalStatus?.portal_enabled ?? true;

  const fetchPortalStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/portal-status");
      const data: PortalStatus = await res.json();
      setPortalStatus(data);
    } catch {
      // If fetch fails, still show the form (API might not be configured yet)
      setPortalStatus({ portal_enabled: true, open_time: null });
    } finally {
      setPortalChecked(true);
    }
  }, []);

  useEffect(() => {
    fetchPortalStatus();
    const id = setInterval(fetchPortalStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchPortalStatus]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [portalChecked]);

  const openTimeLabel = portalStatus?.open_time
    ? new Date(portalStatus.open_time).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
      })
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = regNumber.trim();
    if (!trimmed) return;

    // Client-side time gate check
    if (!isOpen && countdown && countdown.total > 0) {
      setStatus("error");
      setErrorMsg(`Portal opens at ${openTimeLabel}. Please wait.`);
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reg_number: trimmed }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setTimeout(() => router.push("/"), 600);
      } else if (data.code === "portal_not_open") {
        setPortalStatus(p => ({ ...p!, open_time: data.open_time }));
        setStatus("error");
        setErrorMsg(`Portal is not open yet. Please come back at ${openTimeLabel}.`);
      } else {
        setStatus("error");
        setErrorMsg(data.message || "Registration number not found.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="login-root">
      <div className="login-bg" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <Particles />

      <div className="login-card-wrap">
        <div className="login-card">
          {/* Top accent */}
          <div className="login-card-accent" />

          {/* Session replaced banner */}
          {sessionReplaced && (
            <div className="lf-session-replaced" role="alert">
              📱 Your session ended — someone logged in with this reg. number on another device.
            </div>
          )}

          {/* Header */}
          <div className="login-header">
            <div className="login-logo-wrap">
              <img src="/svce-logo.png" alt="SVCE Logo" width={52} height={52} className="login-logo"  />
            </div>
            <div>
              <p className="login-college">Sri Venkateswara College of Engineering</p>
              <p className="login-portal-name">VAC Registration Portal · ECE</p>
            </div>
          </div>

          <div className="login-divider" />

          {/* ── COUNTDOWN BANNER (shown while portal not open) ── */}
          {portalChecked && portalEnabled && !isOpen && countdown && countdown.total > 0 && (
            <div className="cd-banner">
              <div className="cd-banner-top">
                <span className="cd-banner-dot" />
                <span className="cd-banner-label">Portal opens at <strong>{openTimeLabel}</strong></span>
              </div>
              <div className="cd-row-inline">
                <div className="cd-block-sm">
                  <span className="cd-num-sm">{pad(countdown.hours)}</span>
                  <span className="cd-label-sm">HRS</span>
                </div>
                <span className="cd-sep-sm">:</span>
                <div className="cd-block-sm">
                  <span className="cd-num-sm">{pad(countdown.minutes)}</span>
                  <span className="cd-label-sm">MIN</span>
                </div>
                <span className="cd-sep-sm">:</span>
                <div className="cd-block-sm">
                  <span className="cd-num-sm">{pad(countdown.seconds)}</span>
                  <span className="cd-label-sm">SEC</span>
                </div>
              </div>
              <p className="cd-banner-note">⚠️ You can enter your reg. no. now, but submission opens at {openTimeLabel}</p>
            </div>
          )}

          {/* ── LOGIN FORM (always visible once checked) ── */}
          {!portalChecked ? (
            <div className="lf-center">
              <div className="lf-spinner" />
              <p className="lf-hint">Connecting…</p>
            </div>
          ) : !portalEnabled ? (
            <div className="lf-center">
              <div className="lf-icon">🔒</div>
              <h2 className="lf-title">Portal Disabled</h2>
              <p className="lf-hint">The portal is currently offline. Please contact your administrator.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="lf-form" noValidate>
              <div className="lf-form-header">
                <div className="lf-icon">🎓</div>
                <h2 className="lf-title">Student Login</h2>
                <p className="lf-hint">Enter your University Registration Number</p>
              </div>

              <div className="lf-field">
                <label htmlFor="reg-input" className="lf-label">Registration Number</label>
                <div className="lf-input-wrap">
                  <span className="lf-input-icon">🔢</span>
                  <input
                    id="reg-input"
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={regNumber}
                    onChange={e => { setRegNumber(e.target.value); if (status === "error") setStatus("idle"); }}
                    placeholder="e.g. 2127240701001"
                    className={`lf-input ${status === "error" ? "lf-input-error" : ""}`}
                    disabled={status === "loading" || status === "success"}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={20}
                    required
                  />
                </div>
                <p className="lf-field-hint">Format: 2127240701XXX</p>
              </div>

              {errorMsg && (
                <div className="lf-error" role="alert">
                  <span>⚠️</span> {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className={`lf-btn ${status === "loading" ? "lf-btn-loading" : ""} ${status === "success" ? "lf-btn-success" : ""}`}
                disabled={status === "loading" || status === "success" || !regNumber.trim()}
              >
                {status === "loading" && <span className="lf-btn-spinner" />}
                {status === "success" ? "✓ Welcome! Redirecting…" : status === "loading" ? "Verifying…" : "Enter Portal →"}
              </button>

              <p className="lf-notice">
                🔒 One device at a time. Logging in here ends any other active session.
              </p>
            </form>
          )}
        </div>

        <p className="login-footer">ECE Department &nbsp;·&nbsp; AY 2026–2027 &nbsp;·&nbsp; SVCE</p>
      </div>
    </div>
  );
}

function Particles() {
  return (
    <div className="bg-particles" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="particle" style={{
          left: `${(i * 10) % 100}%`,
          animationDuration: `${14 + (i * 3) % 14}s`,
          animationDelay: `${(i * 2.7) % 12}s`,
        }} />
      ))}
    </div>
  );
}
