"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Building,
  Clock,
  Calendar,
  CreditCard,
  History,
  AlertTriangle,
} from "lucide-react";
import { Receipt } from "@/types/charging-session";

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default function ReceiptPage({ params }: PageProps) {
  const { reference } = use(params);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/receipts/${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.receipt) {
          setReceipt(data.receipt);
        } else {
          setError(data.error || "Receipt not found. Has the demo payment succeeded?");
        }
      })
      .catch((err) => {
        console.error("Receipt error:", err);
        setError("Failed to retrieve receipt details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reference]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!receipt) return;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EVFind_Receipt_${receipt.receiptReference}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSec = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-600">Generating Authorized Receipt...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-black text-gray-900">Receipt Unavailable</h2>
          <p className="text-xs text-gray-600">
            {error || "Receipt can only be generated after a successful simulated payment."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Station Map</span>
            </Link>
            <Link
              href="/charging-history"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900"
            >
              View My Charging Sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-gray-900 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Action Bar (hidden in print) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href={`/charging-session/${encodeURIComponent(receipt.sessionId)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden print:shadow-none print:border-none">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Zap className="w-7 h-7 fill-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                  EVFind Charging Receipt
                </h1>
                <span className="text-xs text-emerald-200 font-medium">
                  Smart Charging Network Demonstration
                </span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-950/40 text-emerald-100 border border-emerald-400/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                DEMO PAID — NOT REAL TRANSACTION
              </span>
              <div className="text-[11px] text-emerald-200 mt-1 font-mono">
                {new Date(receipt.issuedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-6 sm:p-8 space-y-6 text-xs text-gray-700">
            {/* References Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                  Receipt No.
                </span>
                <span className="font-bold text-gray-900 text-xs sm:text-sm">
                  {receipt.receiptReference}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                  Payment Reference
                </span>
                <span className="font-bold text-gray-900 text-xs sm:text-sm">
                  {receipt.paymentReference}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                  Session ID
                </span>
                <span className="font-bold text-gray-900 text-xs sm:text-sm truncate block">
                  {receipt.sessionId}
                </span>
              </div>
            </div>

            {/* Station & Port Details */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Charging Station & Port Information
              </h3>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Station Name:</span>
                  <span className="font-bold text-gray-900">{receipt.stationName}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Station ID:</span>
                  <span className="font-mono text-gray-700">{receipt.stationId}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Address:</span>
                  <span className="text-gray-800 text-right max-w-xs">{receipt.stationAddress}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Connector Port:</span>
                  <span className="font-bold text-emerald-800">
                    {receipt.connectorId} ({receipt.connectorType})
                  </span>
                </div>
              </div>
            </div>

            {/* Session Telemetry & Energy Metrics */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Telemetry & Consumption Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase block">Energy Delivered</span>
                  <span className="text-base font-black text-gray-900">
                    {receipt.energyDeliveredKwh.toFixed(2)} kWh
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase block">Duration</span>
                  <span className="text-base font-black text-gray-900">
                    {formatSec(receipt.durationSeconds)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase block">Tariff Rate</span>
                  <span className="text-base font-black text-gray-900">
                    ₹{receipt.pricePerKWh.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase block">Payment Method</span>
                  <span className="text-xs font-bold text-gray-900 truncate block mt-0.5">
                    {receipt.paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Ledger & Final Cost */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Authoritative Cost Breakdown
              </h3>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Energy Fee ({receipt.energyDeliveredKwh.toFixed(2)} kWh × ₹{receipt.pricePerKWh.toFixed(2)}/kWh)
                  </span>
                  <span className="font-semibold text-gray-900">
                    ₹{receipt.chargingFee.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Session Convenience & Connection Surcharge</span>
                  <span className="font-semibold text-gray-900">
                    ₹{receipt.serviceFee.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between pt-3 border-t border-gray-300 text-sm">
                  <span className="font-black text-gray-900">Total Paid (INR)</span>
                  <span className="font-black text-emerald-700 text-lg">
                    ₹{receipt.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic / Project Disclaimer */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Demonstration & Educational Project:</strong> This document represents a simulated
                electronic invoice generated by the EVFind web application. No actual financial debit, credit, or bank
                transfer has occurred.
              </div>
            </div>
          </div>

          {/* Footer (links) */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <Link
              href="/"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900"
            >
              ← Back to Station Map
            </Link>

            <Link
              href="/charging-history"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
            >
              <History className="w-4 h-4" />
              <span>View Charging History</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
