"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  CreditCard,
  Building,
  RefreshCw,
  Receipt as ReceiptIcon,
  Smartphone,
  Check,
  Lock,
} from "lucide-react";
import { ChargingSession, DemoPaymentTransaction, Receipt } from "@/types/charging-session";

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default function DemoPaymentPage({ params }: PageProps) {
  const { reference } = use(params);
  const router = useRouter();

  const [transaction, setTransaction] = useState<DemoPaymentTransaction | null>(null);
  const [session, setSession] = useState<ChargingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment method selection simulation
  const [selectedMethod, setSelectedMethod] = useState<string>("UPI - Google Pay");
  const [upiId, setUpiId] = useState<string>("user@oksbi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    status: "success" | "failed" | "cancelled";
    message: string;
    receipt?: Receipt;
  } | null>(null);

  // Fetch transaction details
  const fetchPaymentDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/demo-payments/${encodeURIComponent(reference)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment reference not found or invalid");
      }
      setTransaction(data.transaction);
      setSession(data.session);

      if (data.transaction.paymentStatus === "success") {
        setPaymentResult({
          status: "success",
          message: "Payment for this session has already been completed successfully.",
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load payment details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentDetails();
  }, [reference]);

  // Handle Process Payment (success, fail, cancel)
  const handleProcess = async (action: "success" | "fail" | "cancel") => {
    if (!transaction) return;
    setIsProcessing(true);
    setError(null);

    try {
      const idempotencyKey = `idem-${action}-${transaction.paymentReference}-${Date.now()}`;
      const res = await fetch("/api/demo-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentReference: transaction.paymentReference,
          action,
          paymentMethod: selectedMethod,
          failureReason: action === "fail" ? "Bank Gateway Timeout (Simulated)" : undefined,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process payment attempt");
      }

      setTransaction(data.transaction);
      if (data.session) setSession(data.session);

      if (action === "success") {
        setPaymentResult({
          status: "success",
          message: "Demo payment verified and completed successfully!",
          receipt: data.receipt,
        });
      } else if (action === "fail") {
        setPaymentResult({
          status: "failed",
          message: "Demo payment failed: Bank Gateway Timeout (Simulated). You can retry or choose another method.",
        });
      } else {
        setPaymentResult({
          status: "cancelled",
          message: "Demo payment cancelled. Your session remains unpaid.",
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during payment processing");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-gray-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-600">Verifying Payment Reference...</p>
      </div>
    );
  }

  // Expired or Invalid QR State
  if (error || !transaction || !session) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Payment Reference Invalid or Expired</h2>
          <p className="text-xs text-gray-600">
            {error || "The payment QR reference is expired, invalid, or was cancelled."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to EVFind Home</span>
            </Link>
            <Link
              href="/charging-history"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 py-1"
            >
              View My Charging Sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = transaction.paymentStatus === "expired";
  const isCancelled = transaction.paymentStatus === "cancelled";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col items-center p-4 sm:p-6 selection:bg-emerald-200">
      {/* Brand Header */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="text-sm font-black text-gray-900 tracking-tight leading-none block">
              EVFind <span className="text-emerald-600">Pay</span>
            </span>
            <span className="text-[10px] text-gray-500 font-semibold leading-none">
              Smart EV Session Gateway
            </span>
          </div>
        </div>

        <Link
          href={`/charging-session/${encodeURIComponent(session.id)}`}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Main Payment Container Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Prominent Demo Warning Banner */}
        <div className="p-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black tracking-wide">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>DEMO PAYMENT — NO REAL MONEY TRANSFER</span>
          </div>
          <p className="text-[10px] text-amber-100 mt-0.5">
            This is an academic & demonstration payment environment. No real funds or bank accounts are accessed.
          </p>
        </div>

        {/* If already successful / Result State */}
        {paymentResult?.status === "success" ? (
          <div className="p-8 text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
                Demo Payment Successful
              </span>
              <h2 className="text-3xl font-black text-gray-900 mt-3">
                ₹{transaction.amount.toFixed(2)}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Transaction settled successfully via demo gateway.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Reference:</span>
                <span className="font-mono font-bold text-gray-800">{transaction.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Station:</span>
                <span className="font-bold text-gray-800">{session.stationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Port / Connector:</span>
                <span className="font-bold text-gray-800">{session.connectorId} ({session.connectorType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-bold text-emerald-700">DEMO PAID</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href={`/receipt/${encodeURIComponent(transaction.paymentReference)}`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md shadow-emerald-600/20"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>View & Print Official Receipt</span>
              </Link>

              <Link
                href={`/charging-session/${encodeURIComponent(session.id)}`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition"
              >
                <span>Return to Session Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-7 space-y-6">
            {/* Amount & Merchant Header */}
            <div className="text-center pb-5 border-b border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Paying To: {session.stationName}</span>
              <div className="text-4xl font-black text-gray-900 mt-1 tracking-tight">
                ₹{transaction.amount.toFixed(2)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1 font-mono">
                Ref: {transaction.paymentReference}
              </div>
            </div>

            {/* Session Info Quick Card */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Session ID:</span>
                <span className="font-mono font-semibold text-gray-900">{session.id}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Energy Consumed:</span>
                <span className="font-semibold text-gray-900">{session.energyDeliveredKwh.toFixed(2)} kWh</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Port & Connector:</span>
                <span className="font-semibold text-gray-900">{session.connectorId} • {session.connectorType}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                Simulated Payment Method
              </label>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: "UPI - Google Pay", name: "Google Pay (Demo UPI)", icon: Smartphone },
                  { id: "UPI - PhonePe", name: "PhonePe (Demo UPI)", icon: Smartphone },
                  { id: "Debit/Credit Card", name: "Credit / Debit Card (Demo)", icon: CreditCard },
                  { id: "Net Banking", name: "Net Banking (Demo)", icon: Building },
                ].map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                        isSelected
                          ? "bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-xs"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-600" : "text-gray-400"}`} />
                        <span>{method.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Failed or Cancelled Alert */}
            {paymentResult?.status === "failed" && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Payment Failed:</strong> {paymentResult.message}
                </div>
              </div>
            )}

            {paymentResult?.status === "cancelled" && (
              <div className="p-3.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{paymentResult.message}</div>
              </div>
            )}

            {/* Action Buttons: Success, Failure, Cancel */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleProcess("success")}
                disabled={isProcessing || isExpired || isCancelled}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-sm transition shadow-md shadow-emerald-600/20"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Demo Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Simulate Successful Payment (Pay ₹{transaction.amount.toFixed(2)})</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleProcess("fail")}
                  disabled={isProcessing || isExpired || isCancelled}
                  className="px-4 py-2.5 rounded-xl border border-red-300 hover:bg-red-50 text-red-700 font-bold text-xs transition"
                >
                  Simulate Failed Payment
                </button>

                <button
                  type="button"
                  onClick={() => handleProcess("cancel")}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition"
                >
                  Cancel Payment
                </button>
              </div>
            </div>

            {/* Security Footer Notice */}
            <div className="pt-2 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Simulated 256-bit encryption • EVFind Demonstration Node</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
