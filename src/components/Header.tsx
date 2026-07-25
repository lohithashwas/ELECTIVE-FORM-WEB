"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";

export default function Header({ studentName, showAdmin }: { studentName?: string; showAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
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
            <div className="hidden sm:block">
              <p className="text-xs sm:text-sm font-bold text-white leading-tight">Sri Venkateswara College of Engineering</p>
              <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">VAC Registration Portal</p>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2">
            {studentName && (<span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">👋 {studentName}</span>)}
            <span className="text-[10px] sm:text-xs text-blue-400 border border-blue-500/20 rounded-full px-2 sm:px-3 py-1 bg-blue-500/10 font-semibold hidden sm:inline">ECE</span>
            <span className="text-[10px] sm:text-xs text-slate-500 border border-white/10 rounded-full px-2 sm:px-3 py-1 bg-white/5">AY 2026–2027</span>
            {showAdmin && (
              <a href="/admin" className="text-[10px] sm:text-xs text-slate-600 hover:text-blue-400 transition border border-white/8 rounded-full px-2 sm:px-3 py-1 bg-white/[0.03] hover:bg-blue-500/10">Admin</a>
            )}
            <LogoutButton />
          </div>

          {/* Mobile: hamburger */}
          <div className="sm:hidden" ref={ref}>
            <button
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="p-2 rounded-md bg-white/5 border border-white/6"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white">
                <path d="M3 6h18M3 12h18M3 18h18" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile expandable menu (in-flow so it pushes content down) */}
      <div className={`sm:hidden overflow-hidden transition-[max-height,padding] duration-200 ${open ? 'max-h-64 p-3' : 'max-h-0 p-0'}`}>
        <div className="w-full bg-[#0b1220] border-t border-white/6">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-slate-200 px-2 py-1">{studentName ?? "Student"}</div>
            <div className="text-xs text-slate-400 px-2 py-1">ECE · AY 2026–2027</div>
            {showAdmin && (
              <a href="/admin" className="px-2 py-2 rounded hover:bg-white/2 text-sm text-slate-200">Admin</a>
            )}
            <div className="pt-2 px-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
