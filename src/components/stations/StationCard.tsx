"use client";

import React from "react";
import { ChargingStation } from "@/types/station";
import { Zap, Navigation, MapPin, ShieldAlert, CheckCircle2, ChevronRight, Fuel } from "lucide-react";

interface StationCardProps {
  station: ChargingStation;
  isSelected?: boolean;
  onSelect: (station: ChargingStation) => void;
  onViewDetails: (station: ChargingStation) => void;
}

export default function StationCard({
  station,
  isSelected = false,
  onSelect,
  onViewDetails,
}: StationCardProps) {
  const isDemo = station.isDemo;

  return (
    <div
      onClick={() => onSelect(station)}
      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer border ${
        isSelected
          ? "bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
          : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md"
      }`}
    >
      {/* Top Header: Badge + Power */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {isDemo ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              DEMO STATION
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              LIVE DATA
            </span>
          )}
          <span className="text-[11px] font-medium text-gray-500 truncate max-w-[120px]">
            {station.operator}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-xs">
          <Zap className="w-3 h-3 fill-current" />
          {station.powerKW} kW
        </div>
      </div>

      {/* Station Name */}
      <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-emerald-700 transition leading-snug">
        {station.name}
      </h3>

      {/* Address & City */}
      <p className="text-xs text-gray-500 flex items-center gap-1 mb-3 truncate">
        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate">{station.address}</span>
      </p>

      {/* Distance and Connectors Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
        {/* Distance badge */}
        <div className="flex items-center gap-1.5 bg-emerald-100/60 text-emerald-900 font-bold px-2.5 py-1 rounded-md">
          <Navigation className="w-3 h-3 text-emerald-700 shrink-0" />
          <span>{station.distanceFormatted || "Distance calculating"}</span>
        </div>

        {/* Connectors */}
        <div className="flex flex-wrap gap-1">
          {station.connectorTypes.slice(0, 2).map((c, i) => (
            <span
              key={i}
              className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200"
            >
              {c}
            </span>
          ))}
          {station.connectorTypes.length > 2 && (
            <span className="text-[10px] font-medium text-gray-500 self-center">
              +{station.connectorTypes.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(station);
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition text-center"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span>Charge / Details</span>
        </button>

        <a
          href={
            station.directionsUrl ||
            `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
        >
          <Navigation className="w-3 h-3 text-gray-500" />
          <span>Directions</span>
        </a>
      </div>
    </div>
  );
}
