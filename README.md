# EV Charge India — Smart EV Charging Station Finder ⚡🇮🇳

A full-stack, modern, interactive web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Leaflet / OpenStreetMap**, engineered to help electric vehicle owners detect their current location, discover nearby EV charging stations across India, calculate straight-line distances, filter by connector and charging power, inspect station details, open turn-by-turn navigation in Google Maps, and estimate vehicle driving range.

---

## 🌟 Key Features

1. **Current Location Detection (Browser Geolocation API)**:
   - Detects the user's real GPS coordinates with permission handling.
   - Smooth fallback banner when access is denied: `"Location access is disabled. Search for a city, PIN code, or area to find charging stations."`
   - Centers the interactive map dynamically around the user with a pulsing marker.

2. **Accurate Distance Calculation (Haversine Formula)**:
   - Reusable `calculateDistanceKm()` module computing straight-line spherical distance on the WGS-84 ellipsoid.
   - User-friendly dynamic formatting: meters for distances under 1 km (e.g. `350 m away`) and kilometers for longer distances (e.g. `1.8 km away`, `32.6 km away`).
   - Clearly labeled: `"Approx. straight-line distance"`.

3. **Interactive Map of India (Leaflet + OpenStreetMap)**:
   - Initial whole-India perspective (`[22.5937, 78.9629]`, zoom level 5).
   - Custom SVG markers with distinct color coding:
     - 🟢 **Live Station**: Verified OpenStreetMap charging station.
     - 🟠 **Demo Station**: Fictional demonstration station for academic testing.
     - 🔵 **User Location**: Pulsing emerald/cyan dot with outer halo ring.
   - Interactive popups with name, power (kW), connectors, distance, and quick action buttons.
   - *"View All India Stations"* button to instantly fit bounds across the nationwide charging network.

4. **119+ Seed Demonstration Stations Across All Indian States & UTs**:
   - Spanning **North** (Delhi NCR, Punjab, Haryana, HP, Uttarakhand, UP, Rajasthan, J&K, Ladakh), **West** (Maharashtra, Gujarat, Goa), **South** (Karnataka, Tamil Nadu, Kerala, Telangana, Andhra Pradesh), **East** (West Bengal, Odisha, Bihar, Jharkhand), **Central** (MP, Chhattisgarh), **Northeast** (Assam, Meghalaya, Tripura, Manipur, Mizoram, Nagaland, Arunachal, Sikkim), and **Union Territories** (Puducherry, Port Blair, Daman).
   - Every demo record is strictly flagged: `isDemo: true`, `dataSource: "demo"`, and `availabilityStatus: "unknown"` with a visible `DEMO STATION` disclaimer badge.

5. **External Real-Data Provider Integration (OpenStreetMap Overpass API)**:
   - Queries real charging stations (`amenity=charging_station`) with 10-minute in-memory caching and safe error handling.
   - Multi-mode data switching: **Hybrid** (Live + Demo), **Live Only**, or **Demo Only**.

6. **Search & Multi-Criteria Filtering**:
   - Search by city (e.g., Bengaluru, Mumbai, Delhi NCR, Hyderabad), PIN code, or locality.
   - Radius options: 5 km, 10 km, 25 km, 50 km, 100 km, or custom slider.
   - Connector filter: `CCS2`, `Type 2 AC`, `CHAdeMO`, `Bharat DC-001`, `GB/T`.
   - Power filter: All, 22+ kW (Fast AC), 50+ kW (DC Rapid), 120+ kW (Ultra Fast).
   - Sorting: Nearest First, Highest Power, Alphabetical.

7. **Station Details & Google Maps Navigation**:
   - Comprehensive details drawer/modal with exact GPS coordinates (with 1-click copy).
   - Direct navigation link: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`.

8. **EV Range Calculator**:
   - Evaluates:
     $$\text{usableEnergyKWh} = \text{batteryCapacityKWh} \times \frac{\text{currentSOC} - \text{reserveSOC}}{100}$$
     $$\text{estimatedRangeKm} = \frac{\text{usableEnergyKWh}}{\text{consumptionKWhPer100Km}} \times 100$$
   - Indian EV presets included: *Tata Nexon EV (40.5 kWh)*, *MG ZS EV (50.3 kWh)*, *Tata Tiago EV (24 kWh)*, *Mahindra XUV400 (39.4 kWh)*, *Hyundai Ioniq 5 (72.6 kWh)*, *Tata Punch EV (35 kWh)*, and *BYD Atto 3 (60.48 kWh)*.
   - Live counter and highlight of stations *"Within estimated range by straight-line distance"*.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.4 (App Router) |
| **Language** | TypeScript (Strict mode) |
| **UI Styling** | Tailwind CSS v4, Lucide Icons |
| **Mapping Engine** | Leaflet 1.9.4 & OpenStreetMap Tiles |
| **Backend / API** | Next.js Route Handlers (`src/app/api/...`) |
| **Database / Seeder** | Local JSON Seed Store with In-Memory Spatial Bounding Box Index |
| **Testing** | Node 24 native test runner + `tsx` |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v20+ or v24+
- **npm** v10+

### 2. Installation
```bash
npm install
```

### 3. Seed Demo Dataset
To verify or regenerate the 119+ demo charging stations across India:
```bash
npm run seed:demo
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 5. Run Unit Tests
```bash
npm test
```
Executes 22 automated unit tests validating distance math, bounding boxes, coordinate bounds, input validation, range equations, and seed idempotency.

### 6. Production Build
```bash
npm run build
npm start
```

---

## 📡 API Endpoints Reference

### 1. Nearby Stations
`GET /api/charging-stations/nearby`
- **Query Parameters**:
  - `lat` (required, float): e.g. `12.9716`
  - `lng` (required, float): e.g. `77.5946`
  - `radiusKm` (optional, float, default: 25): e.g. `10`
  - `mode` (optional, string: `"hybrid"` | `"demo"` | `"live"`, default: `"hybrid"`)
  - `connector` (optional, string): e.g. `"CCS2"`
  - `minPower` (optional, number): e.g. `50`
- **Sample Request**:
  ```bash
  curl "http://localhost:3000/api/charging-stations/nearby?lat=12.9716&lng=77.5946&radiusKm=25&mode=hybrid"
  ```

### 2. Search Stations
`GET /api/charging-stations/search`
- **Query Parameters**:
  - `q` (optional, text keyword, city, or PIN code)
  - `city` (optional, city name)
  - `state` (optional, state name)
  - `userLat` / `userLng` (optional, for sorting by distance)
  - `sortBy` (optional: `"distance"` | `"power"` | `"name"`)

### 3. Station Details
`GET /api/charging-stations/[id]`
- **Sample Request**:
  ```bash
  curl "http://localhost:3000/api/charging-stations/demo-karn-001"
  ```

### 4. Seed Stations
`GET /api/charging-stations/seed`
- Returns all 119+ seeded demonstration stations distributed across India.

---

## 🔒 Security & Privacy Notice
- Geolocation coordinates are processed in-memory in the client browser and are never stored in a persistent tracking database.
- Private API keys are kept server-side in environment variables (`.env`).
- Clear disclaimers prevent fictional testing coordinates from being mistaken for operational chargers.

---

## 📄 License & Attribution
- OpenStreetMap data &copy; [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL).
- Map rendering powered by Leaflet.
