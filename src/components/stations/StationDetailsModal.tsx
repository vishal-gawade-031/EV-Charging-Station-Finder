"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChargingStation } from "@/types/station";
import { StationConnector } from "@/types/charging-session";
import {
  X,
  Zap,
  Navigation,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  Building,
  CreditCard,
  Clock,
  ExternalLink,
  Info,
  Play,
  Loader2,
  BatteryCharging,
  Sliders,
  AlertTriangle,
} from "lucide-react";

interface StationDetailsModalProps {
  station: ChargingStation | null;
  onClose: () => void;
}

export default function StationDetailsModal({
  station,
  onClose,
}: StationDetailsModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [connectors, setConnectors] = useState<StationConnector[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [initialBatteryPercent, setInitialBatteryPercent] = useState<number>(20);
  const [targetBatteryPercent, setTargetBatteryPercent] = useState<number>(80);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Fetch station connectors when station changes
  useEffect(() => {
    if (!station) {
      setConnectors([]);
      setSelectedConnectorId(null);
      setStartError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingConnectors(true);
    setStartError(null);

    fetch(`/api/charging-stations/${encodeURIComponent(station.id)}/connectors`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.connectors && Array.isArray(data.connectors)) {
          setConnectors(data.connectors);
          // Auto-select the first available connector
          const firstAvailable = data.connectors.find((c: StationConnector) => c.status === "available");
          if (firstAvailable) {
            setSelectedConnectorId(firstAvailable.id);
          } else if (data.connectors.length > 0) {
            setSelectedConnectorId(data.connectors[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch connectors:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingConnectors(false);
      });

    return () => {
      isMounted = false;
    };
  }, [station]);

  if (!station) return null;

  const handleCopyCoords = () => {
    const coordsStr = `${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(coordsStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId);

  // Cost estimation (assume standard 40 kWh EV battery for estimation)
  const estimatedKwhToCharge = Math.max(
    0,
    ((Math.max(initialBatteryPercent, targetBatteryPercent) - initialBatteryPercent) / 100) * 40
  );
  const ratePerKwh = selectedConnector ? selectedConnector.pricePerKWh : 18.5;
  const estimatedChargingFee = Math.round(estimatedKwhToCharge * ratePerKwh * 100) / 100;
  const estimatedServiceFee = 25.0;
  const estimatedTotalCost = Math.round((estimatedChargingFee + estimatedServiceFee) * 100) / 100;

  const handleStartCharging = async () => {
    if (!selectedConnector) {
      setStartError("Please select a charging connector first.");
      return;
    }

    if (selectedConnector.status !== "available") {
      setStartError(`Connector ${selectedConnector.id} is occupied. Please select an available connector.`);
      return;
    }

    setIsStartingSession(true);
    setStartError(null);

    try {
      const res = await fetch("/api/charging-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: station.id,
          connectorId: selectedConnector.id,
          initialBatteryPercent,
          userId: "demo-user-1",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start charging session");
      }

      onClose();
      router.push(`/charging-session/${data.session.id}`);
    } catch (err: any) {
      setStartError(err.message || "Failed to start charging session. Please try again.");
      setIsStartingSession(false);
    }
  };

  const isDemo = station.isDemo;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 via-emerald-50/30 to-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            {isDemo ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" />
                DEMO STATION
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED LIVE PROVIDER
              </span>
            )}
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {station.stationType}
            </span>
            <span className="text-xs font-mono text-gray-400">
              ID: {station.id}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            {station.name}
          </h2>

          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>
              {station.city}, {station.state}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{station.address}</span>
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm text-gray-700">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium">Max Power</span>
              <div className="text-lg font-black text-emerald-700 flex items-center gap-1 mt-0.5">
                <Zap className="w-4 h-4 fill-emerald-600" />
                {station.powerKW} kW
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium">Distance</span>
              <div className="text-lg font-black text-emerald-700 flex items-center gap-1 mt-0.5">
                <Navigation className="w-4 h-4 text-emerald-600" />
                {station.distanceFormatted || "N/A"}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-[11px] text-gray-500 font-medium">Operator</span>
              <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                {station.operator}
              </div>
            </div>
          </div>

          {/* Module 1: Connector Selection Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/40 to-teal-50/20 border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Select Charger / Connector
                </h4>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Simulated Status (Demo)
              </span>
            </div>

            {isLoadingConnectors ? (
              <div className="py-6 flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Checking available charging bays...</span>
              </div>
            ) : connectors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {connectors.map((c) => {
                  const isAvailable = c.status === "available";
                  const isSelected = selectedConnectorId === c.id;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedConnectorId(c.id);
                          setStartError(null);
                        }
                      }}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected && isAvailable
                          ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                          : isAvailable
                          ? "bg-white/80 border-gray-200 hover:border-emerald-300 hover:bg-white"
                          : "bg-gray-100/80 border-gray-200 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-gray-900">
                            {c.id}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {c.connectorType}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {isAvailable ? "Available" : "Occupied"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          {c.powerKW} kW Max
                        </span>
                        <span className="font-extrabold text-emerald-700">
                          ₹{c.pricePerKWh.toFixed(2)} / kWh
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No connectors registered for this station.</p>
            )}
          </div>

          {/* Module 1: Battery Estimation & Pricing Calculator */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                Initial Battery & Cost Estimate
              </span>
              <span className="text-xs font-black text-emerald-700">
                Est. ₹{estimatedTotalCost.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-gray-600 mb-1">
                  <span>Current Battery Level:</span>
                  <span className="font-bold text-gray-900">{initialBatteryPercent}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={initialBatteryPercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInitialBatteryPercent(val);
                    if (val >= targetBatteryPercent) {
                      setTargetBatteryPercent(Math.min(100, val + 20));
                    }
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-gray-600 mb-1">
                  <span>Target Charge:</span>
                  <span className="font-bold text-gray-900">{targetBatteryPercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={targetBatteryPercent}
                  onChange={(e) => setTargetBatteryPercent(Math.max(initialBatteryPercent + 5, Number(e.target.value)))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="text-[11px] text-gray-500 flex flex-wrap items-center justify-between pt-2 border-t border-gray-200">
              <span>Energy: ~{estimatedKwhToCharge.toFixed(1)} kWh</span>
              <span>Rate: ₹{ratePerKwh.toFixed(2)}/kWh</span>
              <span>Convenience Fee: ₹{estimatedServiceFee.toFixed(2)}</span>
            </div>
          </div>

          {/* Start Error Alert */}
          {startError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{startError}</span>
            </div>
          )}

          {/* Coordinates & Copy */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-mono">
              {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
            </span>
            <button
              type="button"
              onClick={handleCopyCoords}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-gray-200 hover:border-emerald-300 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer with Start Charging and Directions Buttons */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-white text-xs transition"
          >
            Close
          </button>

          <a
            href={
              station.directionsUrl ||
              `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
          >
            <Navigation className="w-4 h-4" />
            <span>Map Directions</span>
          </a>

          {/* Start Charging Button */}
          <button
            type="button"
            onClick={handleStartCharging}
            disabled={isStartingSession || !selectedConnector || selectedConnector.status !== "available"}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-xs transition shadow-md shadow-emerald-600/20"
          >
            {isStartingSession ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initiating Charging Session...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                <span>Start Charging Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
