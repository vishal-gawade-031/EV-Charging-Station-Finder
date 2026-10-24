"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Receipt as ReceiptIcon,
  QrCode,
  Calendar,
  Building,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import { ChargingSession } from "@/types/charging-session";

export default function ChargingHistoryPage() {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "charging" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/charging-sessions/history");
      const data = await res.json();
      if (data.sessions && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch charging history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const filteredSessions = sessions.filter((s) => {
    if (filterTab === "charging" && s.sessionStatus !== "charging") return false;
    if (filterTab === "completed" && s.paymentStatus !== "success") return false;
    if (filterTab === "pending" && s.paymentStatus === "success") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.stationName.toLowerCase().includes(q);
      const matchRef = s.sessionReference.toLowerCase().includes(q);
      const matchId = s.id.toLowerCase().includes(q);
      return matchName || matchRef || matchId;
    }
    return true;
  });

  const activeChargingSessions = sessions.filter((s) => s.sessionStatus === "charging");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 selection:bg-emerald-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group text-xs font-semibold text-gray-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Station Map & Explorer</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>My Charging Sessions</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {sessions.length} Recorded
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              View live telemetry, billing status, and invoices for all your EV charging sessions.
            </p>
          </div>

          {/* Quick Active Badge */}
          {activeChargingSessions.length > 0 && (
            <Link
              href={`/charging-session/${encodeURIComponent(activeChargingSessions[0].id)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition self-start sm:self-auto animate-pulse"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Resume Active Charge ({activeChargingSessions.length})</span>
            </Link>
          )}
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start text-xs font-semibold text-gray-600">
            {[
              { id: "all", label: `All (${sessions.length})` },
              { id: "charging", label: `Active (${activeChargingSessions.length})` },
              { id: "completed", label: "Paid / Completed" },
              { id: "pending", label: "Payment Pending" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTab === tab.id
                    ? "bg-white text-emerald-800 font-bold shadow-xs"
                    : "hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-gray-500">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading your charging records...</span>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => {
              const isCharging = session.sessionStatus === "charging";
              const isPaid = session.paymentStatus === "success";

              return (
                <div
                  key={session.id}
                  className={`p-5 rounded-3xl bg-white border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 ${
                    isCharging
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                      : "border-gray-200"
                  }`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {session.sessionReference}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500">
                          {session.connectorId} • {session.connectorType}
                        </span>
                      </div>

                      {/* Status badge */}
                      {isCharging ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Charging
                        </span>
                      ) : isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Paid (Demo)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          <CreditCard className="w-3 h-3 text-amber-600" />
                          Payment Due
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-gray-900 text-base leading-snug">
                      {session.stationName}
                    </h3>

                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {session.stationAddress}
                    </p>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Energy</span>
                      <span className="font-black text-gray-900 mt-0.5 block">
                        {session.energyDeliveredKwh.toFixed(2)} kWh
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Duration</span>
                      <span className="font-black text-gray-900 mt-0.5 block">
                        {formatSec(session.durationSeconds)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block">Total</span>
                      <span className="font-black text-emerald-700 text-sm mt-0.5 block">
                        ₹{session.finalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Date & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(session.startTime).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <div className="flex items-center gap-2">
                      {isPaid && (
                        <Link
                          href={`/receipt/${encodeURIComponent(session.paymentReference || session.id)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold transition text-xs"
                        >
                          <ReceiptIcon className="w-3 h-3" />
                          <span>Receipt</span>
                        </Link>
                      )}

                      <Link
                        href={`/charging-session/${encodeURIComponent(session.id)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-bold transition text-xs"
                      >
                        <span>{isCharging ? "Live View" : "Details / QR"}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-white border border-gray-200 space-y-3">
            <Zap className="w-12 h-12 text-emerald-600 mx-auto opacity-70" />
            <h3 className="text-base font-bold text-gray-800">No charging sessions match your filter</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Ready to plug in? Search for nearby stations on the map and start a simulated charging session.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
            >
              <span>Explore Stations & Start Charging</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
