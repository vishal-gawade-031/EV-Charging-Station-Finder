"use client";

import React from "react";
import { ChargingStation } from "@/types/station";
import StationCard from "./StationCard";
import { SearchX, ShieldAlert, Sparkles, MapPin } from "lucide-react";

interface StationListProps {
  stations: ChargingStation[];
  selectedStation: ChargingStation | null;
  onSelectStation: (station: ChargingStation) => void;
  onViewDetails: (station: ChargingStation) => void;
  isLoading?: boolean;
  providerNotice?: string;
  onExpandRadius?: () => void;
}

export default function StationList({
  stations,
  selectedStation,
  onSelectStation,
  onViewDetails,
  isLoading = false,
  providerNotice,
  onExpandRadius,
}: StationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-gray-200 animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-28" />
              <div className="h-5 bg-gray-200 rounded w-16" />
            </div>
            <div className="h-5 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-200 rounded w-36" />
            <div className="flex gap-2 pt-2">
              <div className="h-7 bg-gray-200 rounded flex-1" />
              <div className="h-7 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <SearchX className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-gray-900 text-base">
            No Charging Stations Found
          </h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            No charging stations were found in this radius. Try a larger radius or search another location.
          </p>
        </div>
        {onExpandRadius && (
          <button
            type="button"
            onClick={onExpandRadius}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Expand Search Radius to 50 km</span>
          </button>
        )}
      </div>
    );
  }

  const liveCount = stations.filter((s) => !s.isDemo).length;
  const demoCount = stations.filter((s) => s.isDemo).length;

  return (
    <div className="space-y-3">
      {/* Notice Banner if external provider was slow or fell back */}
      {providerNotice && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{providerNotice}</span>
        </div>
      )}

      {/* Summary count bar */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span className="font-semibold">
          Showing <span className="text-emerald-700 font-bold">{stations.length}</span> stations
        </span>
        <div className="flex items-center gap-2">
          {liveCount > 0 && (
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
              {liveCount} Live
            </span>
          )}
          {demoCount > 0 && (
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
              {demoCount} Demo
            </span>
          )}
        </div>
      </div>

      {/* List of cards */}
      <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
        {stations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            isSelected={selectedStation?.id === station.id}
            onSelect={onSelectStation}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
