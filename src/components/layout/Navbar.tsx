"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Compass, Calculator, Info, History } from "lucide-react";
import { DataSourceMode } from "@/types/station";

interface NavbarProps {
  mode: DataSourceMode;
  onModeChange: (mode: DataSourceMode) => void;
  onNavigateSection: (sectionId: string) => void;
}

export default function Navbar({
  mode,
  onModeChange,
  onNavigateSection,
}: NavbarProps) {
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);

  useEffect(() => {
    // Check if there are active charging sessions
    const checkActiveSessions = () => {
      fetch("/api/charging-sessions/history")
        .then((res) => res.json())
        .then((data) => {
          if (data.sessions && Array.isArray(data.sessions)) {
            const active = data.sessions.filter((s: any) => s.sessionStatus === "charging");
            setActiveSessionCount(active.length);
          }
        })
        .catch(() => {});
    };

    checkActiveSessions();
    const interval = setInterval(checkActiveSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigateSection("hero")}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="text-base font-black text-gray-900 tracking-tight leading-none flex items-center gap-1">
              <span>EV Charge</span>
              <span className="text-emerald-600">India</span>
            </div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest leading-none mt-0.5">
              Smart Station Finder & Pay
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
          <button
            onClick={() => onNavigateSection("map-explorer")}
            className="hover:text-emerald-700 transition flex items-center gap-1 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>Find Chargers</span>
          </button>
          <button
            onClick={() => onNavigateSection("calculator")}
            className="hover:text-emerald-700 transition flex items-center gap-1 cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Range Calculator</span>
          </button>
          <Link
            href="/charging-history"
            className="hover:text-emerald-700 transition flex items-center gap-1.5"
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Charging Sessions</span>
            {activeSessionCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                {activeSessionCount} Active
              </span>
            )}
          </Link>
          <button
            onClick={() => onNavigateSection("about")}
            className="hover:text-emerald-700 transition flex items-center gap-1 cursor-pointer"
          >
            <Info className="w-4 h-4 text-emerald-600" />
            <span>About</span>
          </button>
        </nav>

        {/* Right side: Charging History Link & Data Source Badge */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/charging-history"
            className="inline-flex md:hidden items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sessions</span>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="capitalize">{mode === "hybrid" ? "Live + Demo" : `${mode} Mode`}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
