"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SESSION_DURATION_MS = 90_000;

export default function SessionTimeoutBanner({ expiresAt }: { expiresAt: number | null }) {
  const router = useRouter();
  const [remainingMs, setRemainingMs] = useState<number | null>(
    expiresAt ? Math.max(0, expiresAt - Date.now()) : null
  );
  const [hasExpired, setHasExpired] = useState(false);
  const signoutTriggered = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setRemainingMs(remaining);

      if (remaining === 0 && !signoutTriggered.current) {
        signoutTriggered.current = true;
        setHasExpired(true);

        void fetch("/api/logout", { method: "POST" }).finally(() => {
          router.replace("/login?reason=session_expired");
        });
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, router]);

  if (!expiresAt) return null;

  const totalSeconds = Math.ceil((remainingMs ?? SESSION_DURATION_MS) / 1000);
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 shadow-sm shadow-amber-500/10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-300">
            {hasExpired ? "Session ending now" : "Portal session timer"}
          </p>
          <p className="text-sm text-slate-300">
            {hasExpired
              ? "Your session has ended. You will be redirected to login shortly."
              : "Each portal session is limited to 1.5 minutes to keep the system fair and reduce load."}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-slate-950/60 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80">Time left</p>
          <p className="font-mono text-lg font-semibold text-white">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}
