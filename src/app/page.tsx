"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/home/HeroSection";
import StationFilters from "@/components/stations/StationFilters";
import StationList from "@/components/stations/StationList";
import StationDetailsModal from "@/components/stations/StationDetailsModal";
import EVRangeCalculator from "@/components/range/EVRangeCalculator";
import Footer from "@/components/layout/Footer";
import { ChargingStation, DataSourceMode } from "@/types/station";
import { getCurrentBrowserLocation, LOCATION_DISABLED_MESSAGE } from "@/lib/geo/geolocation";
import { Map, List, Layers, ShieldCheck, Compass, Zap, Sparkles } from "lucide-react";

// Dynamically import Leaflet Map component with SSR disabled
const ChargingMap = dynamic(() => import("@/components/map/ChargingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] md:h-[620px] rounded-2xl bg-gray-100 flex flex-col items-center justify-center gap-3 border border-gray-200">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-semibold text-gray-700">Loading Interactive Map of India...</span>
    </div>
  ),
});

export default function HomePage() {
  // Geolocation & Search State
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Stations State
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [detailModalStation, setDetailModalStation] = useState<ChargingStation | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(false);
  const [providerNotice, setProviderNotice] = useState<string | undefined>(undefined);

  // Filters State
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectedConnector, setSelectedConnector] = useState<string>("ALL");
  const [minPowerKW, setMinPowerKW] = useState<number>(0);
  const [mode, setMode] = useState<DataSourceMode>("hybrid");
  const [sortBy, setSortBy] = useState<"distance" | "power" | "name">("distance");
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");

  // Mobile View Toggle: 'split', 'map', 'list'
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  // Fetch initial India-wide stations on load
  const loadInitialAllIndiaStations = useCallback(async () => {
    setIsLoadingStations(true);
    try {
      const res = await fetch("/api/charging-stations/seed");
      const data = await res.json();
      if (data.stations) {
        setStations(data.stations);
      }
    } catch (e) {
      console.error("Failed to load initial stations:", e);
    } finally {
      setIsLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    loadInitialAllIndiaStations();
  }, [loadInitialAllIndiaStations]);

  // Fetch nearby stations when user location, radius, or mode changes
  const fetchNearbyStations = useCallback(
    async (lat: number, lng: number, radius: number, currentMode: DataSourceMode) => {
      setIsLoadingStations(true);
      setProviderNotice(undefined);
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radiusKm: radius.toString(),
          mode: currentMode,
          limit: "100",
        });

        if (selectedConnector !== "ALL") {
          params.append("connector", selectedConnector);
        }
        if (minPowerKW > 0) {
          params.append("minPower", minPowerKW.toString());
        }

        const res = await fetch(`/api/charging-stations/nearby?${params.toString()}`);
        const data = await res.json();

        if (data.success && data.stations) {
          setStations(data.stations);
          if (data.providerNotice) {
            setProviderNotice(data.providerNotice);
          }
        }
      } catch (err) {
        console.error("Failed to fetch nearby stations:", err);
      } finally {
        setIsLoadingStations(false);
      }
    },
    [selectedConnector, minPowerKW]
  );

  // Geolocation Trigger: "Use My Current Location"
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const coords = await getCurrentBrowserLocation();
      setUserLocation(coords);

      // Fetch nearby stations around user's location
      await fetchNearbyStations(coords.latitude, coords.longitude, radiusKm, mode);

      // Smooth scroll to map section
      const mapEl = document.getElementById("map-explorer");
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err: any) {
      setLocationError(err.userFriendlyMessage || LOCATION_DISABLED_MESSAGE);
    } finally {
      setIsLocating(false);
    }
  };

  // Text Search Trigger: By City, PIN Code, Locality
  const handleSearch = async (query: string) => {
    setActiveSearchQuery(query);
    setIsLoadingStations(true);
    setProviderNotice(undefined);

    try {
      const params = new URLSearchParams({
        q: query,
        mode,
        sortBy,
        limit: "100",
      });

      if (userLocation) {
        params.append("userLat", userLocation.latitude.toString());
        params.append("userLng", userLocation.longitude.toString());
      }
      if (selectedConnector !== "ALL") {
        params.append("connector", selectedConnector);
      }
      if (minPowerKW > 0) {
        params.append("minPower", minPowerKW.toString());
      }

      const res = await fetch(`/api/charging-stations/search?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.stations) {
        setStations(data.stations);
      }

      const mapEl = document.getElementById("map-explorer");
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsLoadingStations(false);
    }
  };

  // Radius change handler
  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    if (userLocation) {
      fetchNearbyStations(userLocation.latitude, userLocation.longitude, newRadius, mode);
    }
  };

  // Mode change handler
  const handleModeChange = (newMode: DataSourceMode) => {
    setMode(newMode);
    if (userLocation) {
      fetchNearbyStations(userLocation.latitude, userLocation.longitude, radiusKm, newMode);
    } else if (activeSearchQuery) {
      handleSearch(activeSearchQuery);
    } else {
      loadInitialAllIndiaStations();
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedConnector("ALL");
    setMinPowerKW(0);
    setRadiusKm(25);
    setSortBy("distance");
    setMode("hybrid");
    if (userLocation) {
      fetchNearbyStations(userLocation.latitude, userLocation.longitude, 25, "hybrid");
    } else {
      loadInitialAllIndiaStations();
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-gray-900 selection:bg-emerald-200">
      {/* Navigation Bar */}
      <Navbar
        mode={mode}
        onModeChange={handleModeChange}
        onNavigateSection={handleNavigateSection}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          onSearch={handleSearch}
          onUseCurrentLocation={handleUseCurrentLocation}
          onExploreStations={() => handleNavigateSection("map-explorer")}
          isLocating={isLocating}
          locationError={locationError}
        />

        {/* Main Map & Station Explorer Section */}
        <section id="map-explorer" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Charging Stations & Map Explorer
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {userLocation
                  ? `Showing stations within ${radiusKm} km of your detected coordinates`
                  : activeSearchQuery
                    ? `Search results for "${activeSearchQuery}"`
                    : "Explore 115+ charging points across all Indian states and union territories"}
              </p>
            </div>

            {/* Mobile View Toggle Buttons */}
            <div className="flex md:hidden items-center bg-gray-200 p-1 rounded-xl self-start">
              <button
                onClick={() => setMobileView("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${mobileView === "map"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-gray-600"
                  }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>
              <button
                onClick={() => setMobileView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${mobileView === "list"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-gray-600"
                  }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View ({stations.length})</span>
              </button>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Filter Panel (Desktop: 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <StationFilters
                radiusKm={radiusKm}
                onRadiusChange={handleRadiusChange}
                selectedConnector={selectedConnector}
                onConnectorChange={setSelectedConnector}
                minPowerKW={minPowerKW}
                onMinPowerChange={setMinPowerKW}
                mode={mode}
                onModeChange={handleModeChange}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                onReset={handleResetFilters}
              />
            </div>

            {/* Interactive Map (Desktop: 5 cols, Mobile: conditioned) */}
            <div
              className={`lg:col-span-5 ${mobileView === "list" ? "hidden md:block" : "block"
                }`}
            >
              <ChargingMap
                stations={stations}
                userLocation={userLocation}
                selectedStation={selectedStation}
                onSelectStation={(st) => {
                  setSelectedStation(st);
                  setDetailModalStation(st);
                }}
                isLoading={isLoadingStations}
                onViewAllIndia={loadInitialAllIndiaStations}
              />
            </div>

            {/* Station Cards List (Desktop: 4 cols, Mobile: conditioned) */}
            <div
              className={`lg:col-span-4 ${mobileView === "map" ? "hidden md:block" : "block"
                }`}
            >
              <StationList
                stations={stations}
                selectedStation={selectedStation}
                onSelectStation={(st) => setSelectedStation(st)}
                onViewDetails={(st) => setDetailModalStation(st)}
                isLoading={isLoadingStations}
                providerNotice={providerNotice}
                onExpandRadius={() => handleRadiusChange(50)}
              />
            </div>
          </div>
        </section>

        {/* EV Range Calculator Section */}
        <section id="calculator" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <EVRangeCalculator
            stations={stations}
            onSelectStation={(st) => {
              setSelectedStation(st);
              setDetailModalStation(st);
              handleNavigateSection("map-explorer");
            }}
          />
        </section>
      </main>

      {/* Station Details Modal / Drawer */}
      <StationDetailsModal
        station={detailModalStation}
        onClose={() => setDetailModalStation(null)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
