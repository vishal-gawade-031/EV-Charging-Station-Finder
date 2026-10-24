"use client";

import React, { useEffect, useRef } from "react";
import { ChargingStation } from "@/types/station";
import type { Map as LeafletMap, Marker, LayerGroup } from "leaflet";
import { Zap, Navigation, ExternalLink, ShieldAlert, CheckCircle2 } from "lucide-react";

interface ChargingMapProps {
  stations: ChargingStation[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedStation: ChargingStation | null;
  onSelectStation: (station: ChargingStation) => void;
  isLoading?: boolean;
  onViewAllIndia?: () => void;
}

// Center of India
const INDIA_CENTER: [number, number] = [22.5937, 78.9629];
const INDIA_DEFAULT_ZOOM = 5;

export default function ChargingMap({
  stations,
  userLocation,
  selectedStation,
  onSelectStation,
  isLoading = false,
  onViewAllIndia,
}: ChargingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const isLeafletReadyRef = useRef<boolean>(false);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: INDIA_CENTER,
        zoom: INDIA_DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });

      // OpenStreetMap tiles with attribution
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
      isLeafletReadyRef.current = true;

      // Invalidate size once container renders
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        userMarkerRef.current = null;
        isLeafletReadyRef.current = false;
      }
    };
  }, []);

  // Update User Location Marker
  useEffect(() => {
    async function updateUserMarker() {
      if (!mapInstanceRef.current || !isLeafletReadyRef.current) return;
      const L = await import("leaflet");

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      if (userLocation) {
        const userIcon = L.divIcon({
          className: "custom-user-marker",
          html: `<div class="user-pulse-marker" title="Your Current Location"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(mapInstanceRef.current);

        marker.bindPopup(`
          <div class="p-3 text-sm font-sans">
            <div class="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              Your Current Location
            </div>
            <div class="text-xs text-gray-600">
              ${userLocation.latitude.toFixed(4)}° N, ${userLocation.longitude.toFixed(4)}° E
            </div>
          </div>
        `);

        userMarkerRef.current = marker;

        // Fly to user location on initial detection
        mapInstanceRef.current.flyTo(
          [userLocation.latitude, userLocation.longitude],
          12,
          { duration: 1.5 }
        );
      }
    }

    updateUserMarker();
  }, [userLocation]);

  // Update Station Markers
  useEffect(() => {
    async function updateStations() {
      if (
        !mapInstanceRef.current ||
        !markersLayerRef.current ||
        !isLeafletReadyRef.current
      ) {
        return;
      }

      const L = await import("leaflet");
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      const bounds = L.latLngBounds([]);

      stations.forEach((station) => {
        const isSelected = selectedStation?.id === station.id;
        const isDemo = station.isDemo;

        // Visual distinction between DEMO and LIVE pins
        const bgColor = isDemo ? "#f59e0b" : "#059669"; // Amber for Demo, Emerald for Live
        const badgeLabel = isDemo ? "LIVE" : "LIVE";
        const badgeClass = isDemo
          ? "bg-amber-100 text-amber-800 border-amber-300"
          : "bg-emerald-100 text-emerald-800 border-emerald-300";

        const size = isSelected ? 42 : 34;
        const anchor = isSelected ? 21 : 17;

        const iconHtml = `
          <div class="marker-pin-transition relative flex flex-col items-center cursor-pointer">
            <div class="relative flex items-center justify-center rounded-full shadow-lg ${isSelected ? "ring-4 ring-emerald-400 scale-110" : ""
          }" style="width: ${size}px; height: ${size}px; background-color: ${bgColor}; border: 2px solid #ffffff;">
              <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 22 : 18
          }" height="${isSelected ? 22 : 18
          }" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div class="text-[9px] font-bold px-1.5 py-0.2 rounded border shadow-xs -mt-1 ${badgeClass}">
              ${badgeLabel}
            </div>
          </div>
        `;

        const stationIcon = L.divIcon({
          className: "custom-station-marker",
          html: iconHtml,
          iconSize: [size, size + 16],
          iconAnchor: [anchor, size + 10],
          popupAnchor: [0, -size - 5],
        });

        const marker = L.marker([station.latitude, station.longitude], {
          icon: stationIcon,
          title: station.name,
          zIndexOffset: isSelected ? 900 : 100,
        });

        // Popup Content
        const popupDiv = document.createElement("div");
        popupDiv.className = "p-3 font-sans w-64 max-w-xs";
        popupDiv.innerHTML = `
          <div class="flex items-center justify-between gap-1 mb-1">
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isDemo
            ? "bg-amber-100 text-amber-800 border border-amber-300"
            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
          }">
              ${isDemo ? "⚡ Demo Station" : "✓ Verified Live"}
            </span>
            <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              ${station.powerKW} kW
            </span>
          </div>

          <h4 class="font-bold text-gray-900 text-sm leading-snug mb-1">
            ${station.name}
          </h4>

          <p class="text-xs text-gray-500 mb-2 truncate">
            ${station.address}
          </p>

          <div class="flex items-center gap-2 text-xs font-medium text-gray-700 mb-3 bg-gray-50 p-1.5 rounded border border-gray-100">
            <span class="text-emerald-700 font-semibold">${station.distanceFormatted || "Distance calculating"
          }</span>
            <span>•</span>
            <span class="text-gray-600 truncate">${station.connectorTypes.join(", ")}</span>
          </div>

          ${isDemo
            ? `<div class="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mb-2.5">
                  <strong>Notice:</strong> Fictional demo location for testing.
                </div>`
            : ""
          }

          <div class="flex items-center gap-1.5">
            <button id="btn-details-${station.id}" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-2 rounded text-center transition">
              ⚡ Details & Charge
            </button>
            <a href="${station.directionsUrl || `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}" target="_blank" rel="noopener noreferrer" class="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-1.5 px-2 rounded flex items-center justify-center gap-1 transition">
              Directions
            </a>
          </div>
        `;

        // Handle Details click inside popup
        popupDiv.querySelector(`#btn-details-${station.id}`)?.addEventListener("click", () => {
          onSelectStation(station);
        });

        marker.bindPopup(popupDiv);

        marker.on("click", () => {
          onSelectStation(station);
        });

        markersLayer.addLayer(marker);
        bounds.extend([station.latitude, station.longitude]);
      });

      // If user selected a specific station, center on it
      if (selectedStation) {
        mapInstanceRef.current.flyTo(
          [selectedStation.latitude, selectedStation.longitude],
          14,
          { duration: 1.2 }
        );
      }
    }

    updateStations();
  }, [stations, selectedStation, onSelectStation]);

  // Center/Fit All India Stations
  const handleFitIndia = () => {
    if (!mapInstanceRef.current) return;
    if (stations.length > 0) {
      import("leaflet").then((L) => {
        const bounds = L.latLngBounds(
          stations.map((s) => [s.latitude, s.longitude] as [number, number])
        );
        mapInstanceRef.current?.fitBounds(bounds, { padding: [40, 40] });
      });
    } else {
      mapInstanceRef.current.flyTo(INDIA_CENTER, INDIA_DEFAULT_ZOOM, {
        duration: 1.5,
      });
    }

    if (onViewAllIndia) {
      onViewAllIndia();
    }
  };

  return (
    <div className="relative w-full h-[520px] md:h-[620px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gray-100">
      {/* Map Target Div */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-30 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-gray-800">
            Fetching Charging Stations...
          </span>
        </div>
      )}

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleFitIndia}
          title="Fit map to all India stations"
          className="bg-white/95 hover:bg-white text-gray-800 text-xs font-semibold px-3 py-2 rounded-xl shadow-md border border-gray-200 backdrop-blur-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600 rotate-45" />
          <span>View All India Stations</span>
        </button>
      </div>

      {/* Map Legend Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-gray-200 text-xs flex flex-col gap-1.5">
        <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-0.5">
          Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white shadow-xs inline-block" />
          <span className="text-gray-700">Verified Live Station</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white shadow-xs inline-block" />
          <span className="text-gray-700">Demo Testing Station</span>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-pulse inline-block" />
            <span className="text-gray-700">Your Detected Location</span>
          </div>
        )}
      </div>
    </div>
  );
}
