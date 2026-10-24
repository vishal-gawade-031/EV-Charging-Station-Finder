"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  BatteryCharging,
  Clock,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Receipt as ReceiptIcon,
  ArrowLeft,
  Activity,
  CheckCircle2,
  StopCircle,
  CreditCard,
  Building,
  Info,
} from "lucide-react";
import { ChargingSession, PaymentStatus } from "@/types/charging-session";
import { QRCodeData } from "@/lib/payments/qr-service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChargingSessionDashboard({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<ChargingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live simulation states
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [energyDeliveredKwh, setEnergyDeliveredKwh] = useState(0);
  const [currentBatteryPercent, setCurrentBatteryPercent] = useState(20);
  const [chargingPowerKw, setChargingPowerKw] = useState(60);
  const [isStopping, setIsStopping] = useState(false);

  // QR Code state
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number | null>(null);

  const qrSectionRef = useRef<HTMLDivElement>(null);
  const telemetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial session details
  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/charging-sessions/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Session not found");
      }
      setSession(data.session);
      setDurationSeconds(data.session.durationSeconds || 0);
      setEnergyDeliveredKwh(data.session.energyDeliveredKwh || 0);
      setCurrentBatteryPercent(data.session.currentBatteryPercent || data.session.initialBatteryPercent);
      setChargingPowerKw(data.session.chargingPowerKw || 50);

      // If stopped or completed, also fetch payment QR
      if (data.session.sessionStatus !== "charging") {
        fetchPaymentQR(data.session.id);
      }
    } catch (err: any) {
      console.error("Failed to load session:", err);
      setError(err.message || "Failed to load charging session");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  // Fetch or generate QR Code
  const fetchPaymentQR = async (sessionId: string, regenerate = false) => {
    setIsLoadingQr(true);
    try {
      const url = `/api/charging-sessions/${encodeURIComponent(sessionId)}/payment-qr${
        regenerate ? "?regenerate=true" : ""
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.qr) {
        setQrData(data.qr);
        if (data.session) {
          setSession(data.session);
        }
        // Calculate remaining seconds
        const expiresMs = new Date(data.qr.expiresAt).getTime() - Date.now();
        setQrSecondsLeft(Math.max(0, Math.floor(expiresMs / 1000)));
      }
    } catch (err) {
      console.error("Failed to fetch payment QR:", err);
    } finally {
      setIsLoadingQr(false);
    }
  };

  // QR Countdown timer
  useEffect(() => {
    if (qrSecondsLeft === null || qrSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrSecondsLeft]);

  // Controlled Simulation Loop: runs only while sessionStatus === "charging"
  useEffect(() => {
    if (!session || session.sessionStatus !== "charging") {
      if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
      return;
    }

    // 1-second elapsed duration clock
    const durationInterval = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    // 2.5-second realistic telemetry update
    const telemetryInterval = setInterval(async () => {
      // Simulate gradual charging: e.g. 0.04 kWh per tick at ~60kW with realistic small fluctuations
      setEnergyDeliveredKwh((prevKwh) => {
        const added = 0.042;
        const newKwh = Math.round((prevKwh + added) * 1000) / 1000;

        setCurrentBatteryPercent((prevBatt) => {
          const nextBatt = Math.min(100, Math.round((prevBatt + 0.12) * 10) / 10);

          // Realistic power fluctuation
          const jitter = (Math.random() - 0.5) * 2;
          const power = Math.max(15, Math.round((session.chargingPowerKw + jitter) * 10) / 10);
          setChargingPowerKw(power);

          // Push telemetry update to backend
          fetch(`/api/charging-sessions/${encodeURIComponent(session.id)}/telemetry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              energyDeliveredKwh: newKwh,
              currentBatteryPercent: nextBatt,
              durationSeconds: durationSeconds + 2,
            }),
          }).catch((e) => console.warn("Telemetry push warning:", e));

          return nextBatt;
        });

        return newKwh;
      });
    }, 2500);

    telemetryTimerRef.current = telemetryInterval;

    return () => {
      clearInterval(durationInterval);
      clearInterval(telemetryInterval);
    };
  }, [session?.sessionStatus, session?.id, session?.chargingPowerKw, durationSeconds]);

  // Periodic polling for payment status (e.g. if paid via mobile QR scan)
  useEffect(() => {
    if (!session || session.paymentStatus === "success") return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/charging-sessions/${encodeURIComponent(session.id)}`);
        const data = await res.json();
        if (data.session && data.session.paymentStatus !== session.paymentStatus) {
          setSession(data.session);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(poll);
  }, [session?.id, session?.paymentStatus]);

  // Stop Charging handler
  const handleStopCharging = async () => {
    if (!session || session.sessionStatus !== "charging") return;
    setIsStopping(true);

    try {
      const res = await fetch(`/api/charging-sessions/${encodeURIComponent(session.id)}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalBatteryPercent: currentBatteryPercent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to stop charging");
      }

      setSession(data.session);
      // Fetch authoritative payment QR
      await fetchPaymentQR(data.session.id, true);

      // Scroll to QR code
      if (qrSectionRef.current) {
        qrSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err: any) {
      alert("Error stopping session: " + err.message);
    } finally {
      setIsStopping(false);
    }
  };

  const handleCopyReference = () => {
    if (!qrData?.paymentReference) return;
    navigator.clipboard.writeText(qrData.paymentReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrData?.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrData.qrDataUrl;
    link.download = `evfind-payment-qr-${qrData.paymentReference}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format MM:SS or HH:MM:SS
  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Format QR expiration timer
  const formatExpiryTimer = (sec: number | null) => {
    if (sec === null) return "--:--";
    if (sec <= 0) return "EXPIRED";
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Connecting to EV Charging Session...</h2>
        <p className="text-xs text-gray-400 mt-1">Retrieving live telemetry and bay status</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] text-white flex flex-col items-center justify-center p-4">
        <div className="p-8 max-w-md w-full bg-[#131b2e] rounded-3xl border border-red-500/30 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Session Not Found</h2>
          <p className="text-xs text-gray-400">{error || "Unable to load charging session."}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Station Map</span>
          </Link>
        </div>
      </div>
    );
  }

  const isCharging = session.sessionStatus === "charging";
  const isStopped = session.sessionStatus === "stopped";
  const isCompleted = session.sessionStatus === "completed";
  const isPaid = session.paymentStatus === "success";

  // Calculate fees
  const currentChargingFee = Math.round(energyDeliveredKwh * session.pricePerKWh * 100) / 100;
  const currentTotalAmount = Math.round((currentChargingFee + session.serviceFee) * 100) / 100;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-gray-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Bar */}
      <header className="border-b border-gray-800/80 bg-[#0d1424]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Station Finder</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-gray-400 hidden sm:inline">
              Ref: {session.sessionReference}
            </span>

            {/* Status Badges */}
            {isCharging && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Charging Active
              </span>
            )}
            {isStopped && !isPaid && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <StopCircle className="w-3.5 h-3.5" />
                Session Stopped (Payment Due)
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed & Paid
              </span>
            )}

            <Link
              href="/charging-history"
              className="text-xs text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-3 py-1 rounded-lg border border-gray-700 transition"
            >
              History
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Simulation Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>EVFind Simulation Mode:</strong> Controlled telemetry demonstration with backend database persistence.
              Amounts calculated in Indian Rupees (INR/₹).
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-900/50 px-2.5 py-0.5 rounded-full border border-emerald-600/30 shrink-0 hidden md:inline">
            DEMO ENGINE ACTIVE
          </span>
        </div>

        {/* Station & Session Header Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#11192d] border border-gray-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                {session.connectorType}
              </span>
              <span className="text-xs font-mono text-gray-400">
                Port ID: {session.connectorId}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">
                Session ID: {session.id}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {session.stationName}
            </h1>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>{session.stationAddress}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isCharging && (
              <button
                type="button"
                onClick={handleStopCharging}
                disabled={isStopping}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold text-xs transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>{isStopping ? "Finalizing Session..." : "Stop Charging"}</span>
              </button>
            )}

            {!isCharging && !isPaid && (
              <button
                type="button"
                onClick={() => {
                  if (qrSectionRef.current) {
                    qrSectionRef.current.scrollIntoView({ behavior: "smooth" });
                  } else {
                    fetchPaymentQR(session.id);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
              >
                <QrCode className="w-4 h-4" />
                <span>View Payment QR</span>
              </button>
            )}

            {isPaid && (
              <Link
                href={`/receipt/${encodeURIComponent(session.paymentReference || session.id)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>View Paid Receipt</span>
              </Link>
            )}
          </div>
        </div>

        {/* Live Gauges & Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Battery Level Gauge */}
          <div className="p-5 rounded-3xl bg-[#11192d] border border-gray-800 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Battery State</span>
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-1">
                <span>{currentBatteryPercent.toFixed(1)}</span>
                <span className="text-lg text-emerald-400">%</span>
              </div>
              <span className="text-[11px] text-gray-400">
                Started at {session.initialBatteryPercent}%
              </span>
            </div>

            {/* Battery Progress Bar */}
            <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden p-0.5 border border-gray-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, currentBatteryPercent)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Energy Delivered */}
          <div className="p-5 rounded-3xl bg-[#11192d] border border-gray-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Energy Delivered</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 flex items-baseline gap-1">
                <span>{energyDeliveredKwh.toFixed(2)}</span>
                <span className="text-lg text-gray-400">kWh</span>
              </div>
              <span className="text-[11px] text-gray-400">
                Power Output: {chargingPowerKw.toFixed(1)} kW
              </span>
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-2 border-t border-gray-800">
              <span>Rate</span>
              <span className="text-white font-bold">₹{session.pricePerKWh.toFixed(2)} / kWh</span>
            </div>
          </div>

          {/* Card 3: Elapsed Duration */}
          <div className="p-5 rounded-3xl bg-[#11192d] border border-gray-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Session Duration</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono">
                {formatDuration(durationSeconds)}
              </div>
              <span className="text-[11px] text-gray-400">
                Started: {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-2 border-t border-gray-800">
              <span>Status</span>
              <span className="capitalize text-emerald-400 font-bold">{session.sessionStatus}</span>
            </div>
          </div>

          {/* Card 4: Total Amount */}
          <div className="p-5 rounded-3xl bg-[#11192d] border border-gray-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Total Payable</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 flex items-baseline gap-1">
                <span className="text-xl">₹</span>
                <span>{currentTotalAmount.toFixed(2)}</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {isPaid ? "Paid in full" : isCharging ? "Live running estimate" : "Final amount due"}
              </span>
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-2 border-t border-gray-800">
              <span>Energy Fee: ₹{currentChargingFee.toFixed(2)}</span>
              <span>Fee: ₹{session.serviceFee.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Detailed Charging Cost Breakdown Panel */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#11192d] border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Transparent Cost & Tariff Breakdown
              </h3>
            </div>
            <span className="text-xs text-gray-400">Currency: INR (₹)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-gray-800/80 space-y-1">
              <span className="text-gray-400">Delivered Energy Fee</span>
              <div className="text-base font-bold text-white">
                ₹{currentChargingFee.toFixed(2)}
              </div>
              <p className="text-[11px] text-gray-500">
                {energyDeliveredKwh.toFixed(2)} kWh × ₹{session.pricePerKWh.toFixed(2)}/kWh
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-gray-800/80 space-y-1">
              <span className="text-gray-400">Convenience & Service Fee</span>
              <div className="text-base font-bold text-white">
                ₹{session.serviceFee.toFixed(2)}
              </div>
              <p className="text-[11px] text-gray-500">Fixed station session connection surcharge</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1424] border border-emerald-500/30 space-y-1">
              <span className="text-emerald-400 font-semibold">Total Authoritative Amount</span>
              <div className="text-lg font-black text-emerald-400">
                ₹{currentTotalAmount.toFixed(2)}
              </div>
              <p className="text-[11px] text-gray-500">
                {isPaid ? "Payment Verified (Demo)" : "Payable via Demo QR"}
              </p>
            </div>
          </div>
        </div>

        {/* Module 5: Automatic Payment QR Code Section */}
        <div
          ref={qrSectionRef}
          className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#11192d] to-[#0d1424] border border-emerald-500/30 shadow-2xl space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Automatic Demo Payment QR Code
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Scan with any mobile camera / UPI app to open the dedicated demo payment gateway.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  DEMO PAID
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  {qrSecondsLeft !== null && qrSecondsLeft <= 0 ? "QR Expired" : `Expires: ${formatExpiryTimer(qrSecondsLeft)}`}
                </span>
              )}
            </div>
          </div>

          {/* QR Display Area */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Rendered QR Code */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-white text-gray-900 shadow-xl">
              {isLoadingQr ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="text-xs font-bold text-gray-600">Generating Session QR...</span>
                </div>
              ) : qrData ? (
                <div className="flex flex-col items-center">
                  {/* Real QR image generated via qrcode library */}
                  <img
                    src={qrData.qrDataUrl}
                    alt="EVFind Demo Payment QR Code"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                  />
                  <div className="text-center mt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Scan to Pay ₹{qrData.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Supports direct link / camera scan
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-center p-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                  <span className="text-xs text-gray-600 font-semibold mb-3">
                    QR code not generated yet.
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchPaymentQR(session.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    Generate QR Now
                  </button>
                </div>
              )}
            </div>

            {/* Right: Payment Reference & Actions */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-[#090d18] border border-gray-800 space-y-2">
                <span className="text-[11px] text-gray-400 font-medium">Payment Reference (Secure Token)</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm sm:text-base font-black text-emerald-400 font-mono tracking-wider break-all">
                    {qrData?.paymentReference || "Generating..."}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyReference}
                    className="shrink-0 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                    title="Copy Payment Reference"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#090d18] border border-gray-800">
                  <span className="text-gray-400 block text-[11px]">Payable Amount</span>
                  <span className="text-lg font-black text-white">
                    ₹{session.finalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#090d18] border border-gray-800">
                  <span className="text-gray-400 block text-[11px]">Payment Status</span>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mt-1">
                    {session.paymentStatus || "Pending"}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Download, Regenerate, Direct Open */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrData}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-xs transition border border-gray-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchPaymentQR(session.id, true)}
                  disabled={isLoadingQr}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-xs transition border border-gray-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQr ? "animate-spin" : ""}`} />
                  <span>Regenerate QR</span>
                </button>

                {qrData && (
                  <Link
                    href={`/demo-payment/${encodeURIComponent(qrData.paymentReference)}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30"
                  >
                    <span>Open Demo Payment Page</span>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
