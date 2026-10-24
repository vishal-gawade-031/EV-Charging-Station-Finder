"use client";

import React, { useState } from "react";
import { Search, Navigation, Compass, AlertCircle, MapPin, Zap, CheckCircle2 } from "lucide-react";

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onUseCurrentLocation: () => void;
  onExploreStations: () => void;
  isLocating: boolean;
  locationError: string | null;
}

const POPULAR_CITIES = [
  "Bengaluru",
  "Delhi NCR",
  "Mumbai",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
];

export default function HeroSection({
  onSearch,
  onUseCurrentLocation,
  onExploreStations,
  isLocating,
  locationError,
}: HeroSectionProps) {
  const [searchInput, setSearchInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  const handleCityClick = (city: string) => {
    setSearchInput(city);
    onSearch(city);
  };

  return (
    <section id="hero" className="relative pt-10 pb-12 md:py-16 overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute top-20 left-10 w-80 h-80 bg-teal-100/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* National Flag / EV Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
          <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600" />
          <span>India-Wide EV Charging Network Explorer</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
          Find Your Nearest{" "}
          <span className="text-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            EV Charging Station
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Discover charging points across India, check straight-line distances from your current location, filter by connector and charging speed, and get instant turn-by-turn directions.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto pt-2">
          <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-gray-200 p-2 focus-within:ring-2 focus-within:ring-emerald-500 transition">
            <MapPin className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter city, PIN code, or location (e.g. Bengaluru, 560034, Connaught Place)"
              className="w-full text-sm sm:text-base px-3 py-2 text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Popular Cities Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-xs text-gray-400 font-medium mr-1">Quick Select:</span>
          {POPULAR_CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleCityClick(city)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 transition cursor-pointer"
            >
              {city}
            </button>
          ))}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:opacity-70 cursor-pointer"
          >
            {isLocating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Detecting Location...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Use My Current Location</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onExploreStations}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm border border-gray-200 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>Explore Charging Stations</span>
          </button>
        </div>

        {/* Location Error Notice */}
        {locationError && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Location Access Notice</strong>
              {locationError}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
