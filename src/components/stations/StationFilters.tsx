"use client";

import React from "react";
import { DataSourceMode, SearchFilters } from "@/types/station";
import { Filter, SlidersHorizontal, RotateCcw, Zap, Compass, Layers } from "lucide-react";

interface StationFiltersProps {
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  selectedConnector: string;
  onConnectorChange: (connector: string) => void;
  minPowerKW: number;
  onMinPowerChange: (power: number) => void;
  mode: DataSourceMode;
  onModeChange: (mode: DataSourceMode) => void;
  sortBy: "distance" | "power" | "name";
  onSortByChange: (sort: "distance" | "power" | "name") => void;
  onReset: () => void;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const CONNECTOR_OPTIONS = ["ALL", "CCS2", "Type 2 AC", "CHAdeMO", "Bharat DC-001"];
const POWER_OPTIONS = [
  { label: "All Power", value: 0 },
  { label: "22+ kW (Fast AC)", value: 22 },
  { label: "50+ kW (DC Rapid)", value: 50 },
  { label: "120+ kW (Ultra Fast)", value: 120 },
];

export default function StationFilters({
  radiusKm,
  onRadiusChange,
  selectedConnector,
  onConnectorChange,
  minPowerKW,
  onMinPowerChange,
  mode,
  onModeChange,
  sortBy,
  onSortByChange,
  onReset,
}: StationFiltersProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-900">Filters & Controls</h3>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-700 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Data Source Mode Switcher */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Data Source Mode</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onModeChange("hybrid")}
            className={`text-xs font-bold py-1.5 px-2 rounded-lg transition ${
              mode === "hybrid"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Hybrid (All)
          </button>
          <button
            type="button"
            onClick={() => onModeChange("live")}
            className={`text-xs font-bold py-1.5 px-2 rounded-lg transition ${
              mode === "live"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Live Only
          </button>
          <button
            type="button"
            onClick={() => onModeChange("demo")}
            className={`text-xs font-bold py-1.5 px-2 rounded-lg transition ${
              mode === "demo"
                ? "bg-white text-amber-800 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Demo Only
          </button>
        </div>
      </div>

      {/* Search Radius */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>Search Radius</span>
          </label>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            {radiusKm} km
          </span>
        </div>

        {/* Quick Radius Buttons */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRadiusChange(r)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                radiusKm === r
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        {/* Slider for custom radius */}
        <input
          type="range"
          min="5"
          max="150"
          step="5"
          value={radiusKm}
          onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
      </div>

      {/* Connector Type */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>Connector Type</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONNECTOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onConnectorChange(c)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                selectedConnector === c
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {c === "ALL" ? "All Connectors" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Power KW */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Charging Speed / Min Power
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {POWER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onMinPowerChange(opt.value)}
              className={`text-xs font-medium py-1.5 px-2 rounded-lg border text-left transition ${
                minPowerKW === opt.value
                  ? "bg-emerald-50 text-emerald-800 border-emerald-500 font-bold"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Sort Results By
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as any)}
          className="w-full text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
        >
          <option value="distance">Nearest Distance (Recommended)</option>
          <option value="power">Highest Charging Power (kW)</option>
          <option value="name">Station Name (A-Z)</option>
        </select>
      </div>
    </div>
  );
}
