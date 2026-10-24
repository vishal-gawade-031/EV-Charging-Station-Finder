"use client";

import React from "react";
import { Zap, ShieldAlert, Heart, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer id="about" className="bg-gray-900 text-gray-400 text-xs py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="text-white font-extrabold text-base">
                EV Charge India
              </span>
            </div>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              Smart Electric Vehicle Charging Station Finder for India. Built to empower EV drivers with live geographic discovery, accurate straight-line distance calculations, and real-time range planning.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">
              Platform Features
            </h4>
            <ul className="space-y-1.5">
              <li>
                <a href="#hero" className="hover:text-emerald-400 transition">
                  Current Location GPS
                </a>
              </li>
              <li>
                <a href="#map-explorer" className="hover:text-emerald-400 transition">
                  Interactive India Map
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-emerald-400 transition">
                  EV Range Estimator
                </a>
              </li>
              <li>
                <a href="/charging-history" className="hover:text-emerald-400 transition">
                  Charging Sessions & QR Payment
                </a>
              </li>

            </ul>
          </div>

          {/* Legal & Data Sources */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">
              Data & Attribution
            </h4>
            <ul className="space-y-1.5">
              <li>
                Map tiles &copy;{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  OpenStreetMap
                </a>
              </li>
              <li>
                Mapping engine by{" "}
                <a
                  href="https://leafletjs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Leaflet
                </a>
              </li>
              <li>Supports FAME II & PM E-Drive charging specifications</li>
            </ul>
          </div>
        </div>



        {/* Bottom copyright */}
        <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
          <div>
            &copy; 2026 EV Charge India. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            <span>Built with precision for India's clean mobility transition</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
