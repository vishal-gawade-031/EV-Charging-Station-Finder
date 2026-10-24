"use client";

import React, { useState, useMemo } from "react";
import { ChargingStation } from "@/types/station";
import {
  calculateEVRange,
  validateEVRangeParams,
  POPULAR_INDIAN_EV_PRESETS,
  EVModelPreset,
} from "@/lib/range-calculator";
import { BatteryCharging, Gauge, CheckCircle2, AlertTriangle, Zap, Car, ShieldAlert, ArrowRight } from "lucide-react";

interface EVRangeCalculatorProps {
  stations: ChargingStation[];
  onSelectStation?: (station: ChargingStation) => void;
}

export default function EVRangeCalculator({
  stations,
  onSelectStation,
}: EVRangeCalculatorProps) {
  // Preset selection or custom
  const [selectedPresetId, setSelectedPresetId] = useState<string>("nexon-ev-long-range");
  const [batteryCapacityKWh, setBatteryCapacityKWh] = useState<number>(40.5);
  const [currentBatteryPercent, setCurrentBatteryPercent] = useState<number>(85);
  const [reserveBatteryPercent, setReserveBatteryPercent] = useState<number>(15);
  const [consumptionKWhPer100Km, setConsumptionKWhPer100Km] = useState<number>(14.5);

  // Handle Preset Change
  const handleSelectPreset = (preset: EVModelPreset) => {
    setSelectedPresetId(preset.id);
    setBatteryCapacityKWh(preset.batteryCapacityKWh);
    setConsumptionKWhPer100Km(preset.typicalConsumptionKWhPer100Km);
  };

  // Validation
  const validation = useMemo(() => {
    return validateEVRangeParams({
      batteryCapacityKWh,
      currentBatteryPercent,
      reserveBatteryPercent,
      consumptionKWhPer100Km,
    });
  }, [
    batteryCapacityKWh,
    currentBatteryPercent,
    reserveBatteryPercent,
    consumptionKWhPer100Km,
  ]);

  // Range calculation result
  const rangeResult = useMemo(() => {
    if (!validation.isValid) return null;
    return calculateEVRange({
      batteryCapacityKWh,
      currentBatteryPercent,
      reserveBatteryPercent,
      consumptionKWhPer100Km,
    });
  }, [
    validation.isValid,
    batteryCapacityKWh,
    currentBatteryPercent,
    reserveBatteryPercent,
    consumptionKWhPer100Km,
  ]);

  // Filter stations reachable within estimated range
  const reachableStations = useMemo(() => {
    if (!rangeResult) return [];
    return stations.filter((station) => {
      if (station.distanceKm === undefined) return false;
      return station.distanceKm <= rangeResult.estimatedRangeKm;
    });
  }, [stations, rangeResult]);

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
          <BatteryCharging className="w-4 h-4" />
          <span>Smart Range Estimator</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          EV Driving Range & Reachable Chargers
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Estimate your electric vehicle's remaining driving range based on battery capacity, current charge, and reserve safety margin.
        </p>
      </div>

      {/* Popular EV Presets */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <Car className="w-4 h-4 text-emerald-600" />
          <span>Quick Select Indian EV Models</span>
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {POPULAR_INDIAN_EV_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`shrink-0 text-left px-3.5 py-2.5 rounded-2xl border transition ${isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200"
                  }`}
              >
                <div className="text-xs font-bold leading-tight">{p.name}</div>
                <div
                  className={`text-[10px] mt-0.5 ${isSelected ? "text-emerald-100" : "text-gray-500"
                    }`}
                >
                  {p.batteryCapacityKWh} kWh • {p.typicalConsumptionKWhPer100Km} kWh/100km
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Controls & Live Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Battery Capacity */}
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Battery Pack Capacity
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="200"
                  step="0.5"
                  value={batteryCapacityKWh}
                  onChange={(e) => {
                    setSelectedPresetId("custom");
                    setBatteryCapacityKWh(parseFloat(e.target.value) || 0);
                  }}
                  className="w-20 text-right font-mono font-bold text-sm bg-white border border-gray-300 rounded-lg px-2 py-1"
                />
                <span className="text-xs font-semibold text-gray-600">kWh</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="0.5"
              value={batteryCapacityKWh}
              onChange={(e) => {
                setSelectedPresetId("custom");
                setBatteryCapacityKWh(parseFloat(e.target.value));
              }}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Current State of Charge (SOC) */}
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Current Battery Level (SOC)
              </label>
              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {currentBatteryPercent}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={currentBatteryPercent}
              onChange={(e) => setCurrentBatteryPercent(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0% Empty</span>
              <span>50%</span>
              <span>100% Full</span>
            </div>
          </div>

          {/* Reserve Battery Margin */}
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Safety Reserve Margin
              </label>
              <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                {reserveBatteryPercent}% reserve
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={reserveBatteryPercent}
              onChange={(e) => setReserveBatteryPercent(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Reserved buffer energy to avoid deep discharge before reaching a station.
            </p>
          </div>

          {/* Consumption */}
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Average Consumption Rate
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="8"
                  max="40"
                  step="0.1"
                  value={consumptionKWhPer100Km}
                  onChange={(e) => setConsumptionKWhPer100Km(parseFloat(e.target.value) || 0)}
                  className="w-20 text-right font-mono font-bold text-sm bg-white border border-gray-300 rounded-lg px-2 py-1"
                />
                <span className="text-xs font-semibold text-gray-600">kWh/100km</span>
              </div>
            </div>
            <input
              type="range"
              min="9"
              max="28"
              step="0.1"
              value={consumptionKWhPer100Km}
              onChange={(e) => setConsumptionKWhPer100Km(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Results Card Column (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Range Calculation
              </span>
              <span className="text-xs bg-emerald-800/60 border border-emerald-600 text-emerald-200 px-2.5 py-1 rounded-full">
                Real-time
              </span>
            </div>

            {rangeResult ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-emerald-200/80 font-medium">
                    Estimated Usable Range
                  </div>
                  <div className="text-5xl font-black tracking-tight text-white mt-1 flex items-baseline gap-2">
                    {rangeResult.estimatedRangeKm}
                    <span className="text-xl font-bold text-emerald-300">km</span>
                  </div>
                  <p className="text-[11px] text-emerald-200/70 mt-1">
                    Based on {rangeResult.usableEnergyKWh} kWh usable energy
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-emerald-800/80">
                  <div className="bg-emerald-800/40 p-3 rounded-2xl border border-emerald-700/50">
                    <span className="text-[10px] text-emerald-300 uppercase block font-semibold">
                      Usable Energy
                    </span>
                    <span className="text-lg font-bold text-white mt-0.5 block">
                      {rangeResult.usableEnergyKWh} kWh
                    </span>
                  </div>

                  <div className="bg-emerald-800/40 p-3 rounded-2xl border border-emerald-700/50">
                    <span className="text-[10px] text-amber-300 uppercase block font-semibold">
                      Safety Reserve
                    </span>
                    <span className="text-lg font-bold text-white mt-0.5 block">
                      {rangeResult.reserveKWh} kWh
                    </span>
                  </div>
                </div>

                {/* Reachable stations count */}
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {reachableStations.length} Charging Stations Reachable
                      </span>
                      <span className="text-[11px] text-emerald-200/80">
                        Within estimated range by straight-line distance.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-xs">
                Please check inputs: {Object.values(validation.errors).join(" ")}
              </div>
            )}
          </div>

          <div className="text-[11px] text-emerald-300/60 pt-4 border-t border-emerald-800/80">
            ⚠️ Driving range is an engineering estimate based on straight-line distance. Real-world conditions like terrain, AC, and traffic will affect actual range.
          </div>
        </div>
      </div>

      {/* Reachable Stations Preview Bar */}
      {reachableStations.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Chargers Within Reach ({reachableStations.length})</span>
            </h4>
            <span className="text-xs text-gray-500">
              Within {rangeResult?.estimatedRangeKm} km radius
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {reachableStations.slice(0, 3).map((st) => (
              <div
                key={st.id}
                onClick={() => onSelectStation?.(st)}
                className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 cursor-pointer transition flex items-center justify-between"
              >
                <div className="truncate mr-2">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {st.name}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-semibold">
                    {st.distanceFormatted || "Nearby"} • {st.powerKW} kW
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
