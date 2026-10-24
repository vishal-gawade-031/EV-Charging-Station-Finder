import { ChargingStation, SearchFilters, ConnectorType } from "@/types/station";
import { StationProvider } from "./station-provider";
import { calculateDistanceKm, formatDistance, getDirectionsUrl } from "../geo/distance";

interface OSMNode {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: {
    name?: string;
    operator?: string;
    brand?: string;
    socket?: string;
    "socket:type2"?: string;
    "socket:type2_combo"?: string;
    "socket:chademo"?: string;
    "socket:schuko"?: string;
    capacity?: string;
    fee?: string;
    opening_hours?: string;
    "addr:city"?: string;
    "addr:state"?: string;
    "addr:street"?: string;
    "addr:postcode"?: string;
    output?: string;
    [key: string]: string | undefined;
  };
}

export class OpenStreetMapStationProvider implements StationProvider {
  public readonly name = "OpenStreetMapStationProvider";
  private cache = new Map<string, { data: ChargingStation[]; expires: number }>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

  public async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: SearchFilters
  ): Promise<ChargingStation[]> {
    const cacheKey = `nearby_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return this.filterStations(cached.data, lat, lng, radiusKm, filters);
    }

    try {
      const radiusMeters = Math.min(Math.max(Math.round(radiusKm * 1000), 1000), 50000); // 1km to 50km
      const query = `
        [out:json][timeout:8];
        (
          node["amenity"="charging_station"](around:${radiusMeters},${lat},${lng});
        );
        out body 40;
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const url = "https://overpass-api.de/api/interpreter";
      const response = await fetch(url, {
        method: "POST",
        body: query,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "EVChargeIndia/1.0 (Academic Demonstration; contact: dev@evchargeindia.org)",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Overpass API error: status ${response.status}`);
        return [];
      }

      const data = await response.json();
      const nodes: OSMNode[] = data.elements || [];

      const stations: ChargingStation[] = nodes
        .filter((node) => node.lat && node.lon)
        .map((node) => this.mapOSMNodeToStation(node, lat, lng));

      this.cache.set(cacheKey, {
        data: stations,
        expires: Date.now() + this.CACHE_TTL_MS,
      });

      return this.filterStations(stations, lat, lng, radiusKm, filters);
    } catch (error: any) {
      console.warn("OpenStreetMap Overpass API unavailable or timed out:", error.message || error);
      return [];
    }
  }

  public async search(filters: SearchFilters): Promise<ChargingStation[]> {
    if (filters.userLat !== undefined && filters.userLng !== undefined) {
      return this.getNearby(
        filters.userLat,
        filters.userLng,
        filters.radiusKm || 25,
        filters
      );
    }
    return [];
  }

  public async getById(id: string): Promise<ChargingStation | null> {
    for (const cached of this.cache.values()) {
      const match = cached.data.find((s) => s.id === id);
      if (match) return match;
    }
    return null;
  }

  private mapOSMNodeToStation(
    node: OSMNode,
    userLat?: number,
    userLng?: number
  ): ChargingStation {
    const tags = node.tags || {};
    const name = tags.name || tags.operator || `OSM EV Charger #${node.id}`;
    const operator = tags.operator || tags.brand || "Independent Operator";
    const city = tags["addr:city"] || "Local Area";
    const state = tags["addr:state"] || "India";
    const street = tags["addr:street"] || "Public Way";
    const pincode = tags["addr:postcode"];

    // Connectors determination
    const connectors: ConnectorType[] = [];
    if (tags["socket:type2_combo"] || tags.socket?.includes("type2_combo")) {
      connectors.push("CCS2");
    }
    if (tags["socket:type2"] || tags.socket?.includes("type2")) {
      connectors.push("Type 2 AC");
    }
    if (tags["socket:chademo"] || tags.socket?.includes("chademo")) {
      connectors.push("CHAdeMO");
    }
    if (tags.socket?.includes("schuko")) {
      connectors.push("Wall Socket (15A)");
    }
    if (connectors.length === 0) {
      connectors.push("CCS2"); // Default standard in India
    }

    // Power estimation
    let powerKW = 50;
    if (tags.output) {
      const match = tags.output.match(/(\d+)/);
      if (match) powerKW = parseInt(match[1], 10);
    } else if (connectors.includes("CCS2")) {
      powerKW = 60;
    }

    let distanceKm: number | undefined;
    let distanceFormatted: string | undefined;
    let directionsUrl: string | undefined;

    if (userLat !== undefined && userLng !== undefined) {
      const dist = calculateDistanceKm(userLat, userLng, node.lat, node.lon);
      distanceKm = Math.round(dist * 100) / 100;
      distanceFormatted = formatDistance(dist);
      directionsUrl = getDirectionsUrl(node.lat, node.lon, userLat, userLng);
    } else {
      directionsUrl = getDirectionsUrl(node.lat, node.lon);
    }

    return {
      id: `osm-${node.id}`,
      name,
      latitude: node.lat,
      longitude: node.lon,
      address: `${street}, ${city}, ${state} (Source: OpenStreetMap Community)`,
      city,
      state,
      pincode,
      operator,
      connectorTypes: connectors,
      powerKW,
      pricing: tags.fee || "Verify on site",
      stationType: "public",
      dataSource: "openstreetmap",
      isDemo: false,
      availabilityStatus: "available",
      lastUpdated: new Date().toISOString(),
      distanceKm,
      distanceFormatted,
      directionsUrl,
      amenities: ["Public Access", "OSM Verified"],
      totalPorts: tags.capacity ? parseInt(tags.capacity, 10) : 2,
    };
  }

  private filterStations(
    stations: ChargingStation[],
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: SearchFilters
  ): ChargingStation[] {
    let filtered = stations.filter((station) => {
      const dist = calculateDistanceKm(lat, lng, station.latitude, station.longitude);
      if (dist > radiusKm) return false;

      if (filters?.connector && filters.connector !== "ALL") {
        const matches = station.connectorTypes.some((c) =>
          c.toLowerCase().includes(filters.connector!.toLowerCase())
        );
        if (!matches) return false;
      }

      if (filters?.minPowerKW && station.powerKW < filters.minPowerKW) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return filtered;
  }
}
